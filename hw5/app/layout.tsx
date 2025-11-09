import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import "./globals.css";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { SessionProvider } from "@/components/session-provider";

const notoSans = Noto_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-noto-sans",
});

export const metadata: Metadata = {
  title: "X-Clone",
  description: "A Twitter/X clone built with Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${notoSans.variable} antialiased`}
      >
        <SessionProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
        </SessionProvider>
      </body>
    </html>
  );
}
