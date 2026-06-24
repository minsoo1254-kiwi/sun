import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "노동법 판례·행정해석 통합 검색",
  description: "법제처 판례와 고용노동부 행정해석을 함께 검색하는 HR 노동법 보조도구"
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
