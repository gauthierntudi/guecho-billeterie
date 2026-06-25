import type { Metadata } from "next";
import { Anton, Geist, Geist_Mono } from "next/font/google";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Guecho Rocambole — Billetterie",
  description:
    "Billetterie officielle Guecho Rocambole. Billets spectacle (Standard, VIP, VVIP) et streaming.",
  icons: {
    icon: "/img/logo-guecho.png",
    apple: "/img/logo-guecho.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${anton.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <CurrencyProvider>{children}</CurrencyProvider>
      </body>
    </html>
  );
}
