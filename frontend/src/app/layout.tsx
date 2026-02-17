import type { Metadata } from "next";
import { inter, notoSansTamil } from "@/lib/fonts";
import { Sidebar } from "@/components/layout/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s | Sivanethram",
    default: "Sivanethram — Siddha Clinic Management",
  },
  description: "Digital clinic management for Siddha practitioners",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${notoSansTamil.variable}`}>
      <body className="font-sans antialiased">
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto bg-gray-50 p-6 pt-16 md:p-8 md:pt-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
