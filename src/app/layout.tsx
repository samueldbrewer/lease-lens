import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Providers from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LeaseLens - Lease Intelligence Platform",
  description:
    "AI-powered lease document analysis and portfolio management for real estate professionals",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className={inter.className}>
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 flex flex-col pt-[52px] pb-[60px] md:pt-0 md:pb-0">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
