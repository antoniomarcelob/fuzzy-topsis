import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Fuzzy TOPSIS Platform",
  description: "Plataforma de decisão multicritério com Fuzzy TOPSIS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${fontSans.variable} font-sans bg-gray-50 min-h-screen`}>
        <QueryProvider>
          {/* Topbar */}
          <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 font-semibold text-gray-900">
                <span className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">FT</span>
                <span>Fuzzy TOPSIS</span>
              </Link>
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <Link href="/problems" className="hover:text-gray-900 transition-colors">Problemas</Link>
                <Link href="/wizard" className="hover:text-gray-900 transition-colors">Novo</Link>
                <Link
                  href="/problems"
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Abrir análise
                </Link>
              </div>
            </div>
          </nav>

          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
