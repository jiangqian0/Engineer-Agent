import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Engineer Agent - Enterprise AI Agent Platform",
  description: "A powerful, enterprise-grade AI agent platform with skill system and multi-agent orchestration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
        </Providers>
      </body>
    </html>
  );
}
