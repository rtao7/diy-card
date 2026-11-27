import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MiniMusicPlayer } from "@/components/music/MiniMusicPlayer";
import { ReactQueryProvider } from "@/lib/react-query";
import playerStyles from "@/components/music/MiniMusicPlayer.module.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "diy card",
  description: "A daily plan. Time blocks, a first step, and what done means.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ReactQueryProvider>
          <div className={playerStyles.shell}>
            <div className={playerStyles.content}>{children}</div>
            {/* Stays mounted across routes, so playback survives navigation. */}
            <MiniMusicPlayer />
          </div>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
