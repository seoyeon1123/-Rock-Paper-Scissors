-- =========================================================================
-- Rock-Paper-Scissors 온라인 대전 스키마
-- =========================================================================
-- 실행 방법: Supabase 대시보드 → SQL Editor → 붙여넣고 Run
-- =========================================================================

-- ----- Tables -------------------------------------------------------------

create table if not exists rooms (
  id            text primary key,
  mode          text not null check (mode in ('bo3','bo5','infinite')),
  status        text not null default 'waiting' check (status in ('waiting','playing','finished')),
  current_round int  not null default 0,
  host_id       uuid not null,
  match_result  text check (match_result in ('p1','p2','draw')),
  created_at    timestamptz default now(),
  last_active   timestamptz default now()
);

create table if not exists players (
  id         uuid not null,
  room_id    text not null references rooms(id) on delete cascade,
  nickname   text not null,
  slot       int  not null check (slot in (1,2)),
  score      int  not null default 0,
  connected  boolean default true,
  joined_at  timestamptz default now(),
  primary key (room_id, id),
  unique(room_id, slot)
);

create index if not exists players_room_idx on players(room_id);

create table if not exists rounds (
  room_id      text references rooms(id) on delete cascade,
  round_number int  not null,
  p1_choice    text check (p1_choice in ('rock','paper','scissors')),
  p2_choice    text check (p2_choice in ('rock','paper','scissors')),
  revealed_at  timestamptz,
  primary key (room_id, round_number)
);

-- Realtime 발행 등록
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table rounds;

-- ----- RLS ----------------------------------------------------------------
-- SELECT은 누구든 허용 (6자리 코드 자체가 접근 토큰 역할).
-- INSERT/UPDATE/DELETE는 전부 SECURITY DEFINER RPC로만 가능.

alter table rooms    enable row level security;
alter table players  enable row level security;
alter table rounds   enable row level security;

create policy "public read rooms"    on rooms    for select using (true);
create policy "public read players"  on players  for select using (true);
create policy "public read rounds"   on rounds   for select using (true);

-- ----- RPCs ---------------------------------------------------------------

-- 방 생성: 사용 가능한 6자리 코드를 찾아서 방 + host 플레이어 레코드 생성
create or replace function create_room(
  p_mode     text,
  p_host_id  uuid,
  p_nickname text
) returns text
language plpgsql
security definer
as $$
declare
  v_code text;
  v_tries int := 0;
begin
  if p_mode not in ('bo3','bo5','infinite') then
    raise exception 'invalid mode';
  end if;
  if length(trim(p_nickname)) = 0 then
    raise exception 'empty nickname';
  end if;

  loop
    v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    begin
      insert into rooms (id, mode, host_id) values (v_code, p_mode, p_host_id);
      exit;
    exception when unique_violation then
      v_tries := v_tries + 1;
      if v_tries > 20 then
        raise exception 'could not allocate room code';
      end if;
    end;
  end loop;

  insert into players (id, room_id, nickname, slot) values (p_host_id, v_code, p_nickname, 1);
  return v_code;
end $$;

-- 방 입장: 비어있는 slot에 배정. 이미 들어가 있으면 재접속 처리
create or replace function join_room(
  p_room_id   text,
  p_player_id uuid,
  p_nickname  text
) returns int
language plpgsql
security definer
as $$
declare
  v_existing_slot int;
  v_taken_slots   int;
  v_slot          int;
begin
  if not exists (select 1 from rooms where id = p_room_id) then
    raise exception 'room not found';
  end if;

  select slot into v_existing_slot from players
    where room_id = p_room_id and id = p_player_id;
  if v_existing_slot is not null then
    update players set connected = true, nickname = p_nickname
      where room_id = p_room_id and id = p_player_id;
    update rooms set last_active = now() where id = p_room_id;
    return v_existing_slot;
  end if;

  select count(*) into v_taken_slots from players where room_id = p_room_id;
  if v_taken_slots >= 2 then
    raise exception 'room full';
  end if;

  v_slot := case when exists (select 1 from players where room_id = p_room_id and slot = 1)
                 then 2 else 1 end;

  insert into players (id, room_id, nickname, slot)
    values (p_player_id, p_room_id, p_nickname, v_slot);
  update rooms set last_active = now() where id = p_room_id;
  return v_slot;
end $$;

-- 게임 시작 (호스트만)
create or replace function start_match(
  p_room_id   text,
  p_player_id uuid
) returns void
language plpgsql
security definer
as $$
begin
  if not exists (select 1 from rooms where id = p_room_id and host_id = p_player_id) then
    raise exception 'not host';
  end if;
  if (select count(*) from players where room_id = p_room_id) < 2 then
    raise exception 'need two players';
  end if;
  update rooms
    set status = 'playing', current_round = 1, match_result = null, last_active = now()
    where id = p_room_id;
  delete from rounds where room_id = p_room_id;
  insert into rounds (room_id, round_number) values (p_room_id, 1);
  update players set score = 0 where room_id = p_room_id;
end $$;

-- 제스처 제출 (commit). 두 명 다 제출되면 revealed_at 세팅 + 점수 갱신 + 다음 라운드 생성
create or replace function submit_choice(
  p_room_id   text,
  p_player_id uuid,
  p_round     int,
  p_choice    text
) returns void
language plpgsql
security definer
as $$
declare
  v_slot      int;
  v_row       rounds%rowtype;
  v_p1        text;
  v_p2        text;
  v_p1_score  int;
  v_p2_score  int;
  v_target    int;
  v_mode      text;
  v_result    text;
begin
  if p_choice not in ('rock','paper','scissors') then
    raise exception 'invalid choice';
  end if;

  select slot into v_slot from players where room_id = p_room_id and id = p_player_id;
  if v_slot is null then
    raise exception 'not a player of this room';
  end if;

  -- 현재 라운드 잠금
  select * into v_row from rounds
    where room_id = p_room_id and round_number = p_round
    for update;
  if v_row.room_id is null then
    raise exception 'round not found';
  end if;
  if v_row.revealed_at is not null then
    return;  -- 이미 공개된 라운드면 무시
  end if;

  if v_slot = 1 then
    if v_row.p1_choice is not null then return; end if;
    v_p1 := p_choice;
    v_p2 := v_row.p2_choice;
  else
    if v_row.p2_choice is not null then return; end if;
    v_p1 := v_row.p1_choice;
    v_p2 := p_choice;
  end if;

  -- 둘 다 제출됐으면 reveal + 점수/다음 라운드
  if v_p1 is not null and v_p2 is not null then
    update rounds
      set p1_choice = v_p1, p2_choice = v_p2, revealed_at = now()
      where room_id = p_room_id and round_number = p_round;

    -- 승자에게 점수
    if v_p1 = v_p2 then
      v_result := 'draw';
    elsif (v_p1 = 'rock'     and v_p2 = 'scissors')
       or (v_p1 = 'scissors' and v_p2 = 'paper')
       or (v_p1 = 'paper'    and v_p2 = 'rock') then
      update players set score = score + 1
        where room_id = p_room_id and slot = 1;
      v_result := 'p1';
    else
      update players set score = score + 1
        where room_id = p_room_id and slot = 2;
      v_result := 'p2';
    end if;

    -- 매치 종료 판정
    select mode into v_mode from rooms where id = p_room_id;
    v_target := case v_mode when 'bo3' then 2 when 'bo5' then 3 else 2147483647 end;

    select score into v_p1_score from players where room_id = p_room_id and slot = 1;
    select score into v_p2_score from players where room_id = p_room_id and slot = 2;

    if v_p1_score >= v_target or v_p2_score >= v_target then
      update rooms set
        status = 'finished',
        match_result = case when v_p1_score >= v_target then 'p1' else 'p2' end,
        last_active = now()
      where id = p_room_id;
    else
      update rooms set current_round = p_round + 1, last_active = now()
        where id = p_room_id;
      insert into rounds (room_id, round_number) values (p_room_id, p_round + 1);
    end if;
  else
    -- 한 명만 제출된 상태
    update rounds
      set p1_choice = v_p1, p2_choice = v_p2
      where room_id = p_room_id and round_number = p_round;
  end if;
end $$;

-- 재매치: 양쪽 모두 요청 시 리셋 (간단히 호스트가 호출, 상대는 broadcast로 수락 알림)
create or replace function rematch(
  p_room_id   text,
  p_player_id uuid
) returns void
language plpgsql
security definer
as $$
begin
  if not exists (select 1 from rooms where id = p_room_id and host_id = p_player_id) then
    raise exception 'not host';
  end if;
  delete from rounds where room_id = p_room_id;
  update players set score = 0 where room_id = p_room_id;
  update rooms set
    status = 'playing', current_round = 1, match_result = null, last_active = now()
    where id = p_room_id;
  insert into rounds (room_id, round_number) values (p_room_id, 1);
end $$;

-- 방 나가기. 마지막 한 명이 나가면 방 자체가 삭제됨
create or replace function leave_room(
  p_room_id   text,
  p_player_id uuid
) returns void
language plpgsql
security definer
as $$
declare
  v_remaining int;
  v_host      uuid;
  v_other     uuid;
begin
  delete from players where room_id = p_room_id and id = p_player_id;
  select count(*) into v_remaining from players where room_id = p_room_id;
  if v_remaining = 0 then
    delete from rooms where id = p_room_id;
    return;
  end if;

  -- 호스트가 나갔으면 남은 사람에게 호스트 이전
  select host_id into v_host from rooms where id = p_room_id;
  if v_host = p_player_id then
    select id into v_other from players where room_id = p_room_id limit 1;
    update rooms set host_id = v_other where id = p_room_id;
  end if;
  update rooms set last_active = now() where id = p_room_id;
end $$;
