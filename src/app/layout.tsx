import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toast"
import { SpeedInsights } from "@vercel/speed-insights/next"

export const metadata: Metadata = {
  title: "1306 Purchasing App",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased font-sans"
    >
      <body className="min-h-full flex flex-col">{children}       <Toaster /></body>
    </html>
  );
}
