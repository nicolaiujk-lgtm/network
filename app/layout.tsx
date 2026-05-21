import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CreatorIntel | 游戏博主智能检索平台",
  description: "面向游戏发行与市场团队的专业博主智能检索平台。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
