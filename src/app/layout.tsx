import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ReactQueryProvider } from "@/lib/react-query";
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
  title: "Daily",
  description: "A daily plan. Time blocks, and what got done.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-[#e8e8e4] font-sans text-[#2a2a28] antialiased`}
      >
        <ReactQueryProvider>
          {children}
          <Toaster
            position="top-center"
            theme="light"
            toastOptions={{
              style: {
                background: "#f4f4f1",
                border: "1px solid #e1e1dc",
                color: "#2a2a28",
                boxShadow: "0 8px 24px rgba(40, 40, 30, 0.06)",
              },
            }}
          />
        </ReactQueryProvider>
      </body>
    </html>
  );
}
