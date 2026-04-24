'use client';

interface Props {
  opponentNickname?: string;
  onLeave: () => void;
}

export function OpponentLeftView({ opponentNickname, onLeave }: Props) {
  return (
    <div className="flex flex-col items-center gap-5 mt-12 px-4 text-center w-full max-w-md">
      <div className="text-6xl">👋</div>
      <div className="text-2xl sm:text-3xl font-bold">
        상대방이 방을 나갔어요
      </div>
      <p className="text-sm text-slate-400">
        {opponentNickname ? `${opponentNickname}님이 ` : ''}
        나가서 게임을 계속할 수 없어요. 카메라도 꺼졌습니다.
      </p>
      <button
        onClick={onLeave}
        className="mt-4 w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 font-bold hover:from-blue-500 hover:to-purple-500 transition-colors"
      >
        메뉴로 돌아가기
      </button>
    </div>
  );
}
