import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Image from "next/image";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Agent Score Protocol",
  description: "Trustless AI Reputation Protocol via ERC-8004 & Chainlink CRE",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen flex flex-col antialiased`}>
        {/* Navigation Bar */}
        <nav className="border-b border-gray-800 bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <span className="font-bold text-xl tracking-tight text-white">
                  Agent Score Protocol
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium px-3 py-1 rounded-full bg-blue-900/30 text-blue-400 border border-blue-800/50">
                  Base Sepolia
                </span>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-grow w-full">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-800 py-6 mt-12 bg-[#0B0F19]">
          <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-400">
            Built for the Chainlink Convergence Hackathon 2026.
          </div>
        </footer>
      </body>
    </html>
  );
}
