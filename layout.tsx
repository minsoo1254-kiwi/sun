import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HR 노동법 판례 검색",
  description: "법제처 공개 API 기반 HR 노동법 판례 검색 보조도구"
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
