import type { Metadata } from "next";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "NAVER Late",
  description: "Know the latest moment you can leave to make it to your event on time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <header className="site-header">
          <span className="site-title">🕒 NAVER Late</span>
          <ThemeToggle />
        </header>
        {children}
        <footer className="site-footer">Built for Newbithon (뉴비톤) — Korea University</footer>
      </body>
    </html>
  );
}