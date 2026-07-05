import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Synesthesia 通感 — 用剩下的感官，感受颜色",
  description:
    "一个跨感官色彩翻译平台。盲人语音问颜色，社区用触觉、听觉、温度回答。不是代替光，是用剩下的所有感官把光重构一遍。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-warm-text focus:text-warm-bg focus:p-3 focus:rounded">
          跳到主内容
        </a>
        {children}
      </body>
    </html>
  );
}
