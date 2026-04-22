import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '웹캠 가위바위보',
  description: 'MediaPipe Hands 기반 실시간 가위바위보 게임',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
