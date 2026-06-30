import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PayRaise Insight",
  description: "임금인상률 검토를 위한 HR 지표 대시보드와 임원용 보고서 도구"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
