import type { Metadata } from "next";
import { inter, notoSansTamil } from "@/lib/fonts";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { KeyboardProvider } from "@/components/layout/KeyboardProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s | AYUSH Clinic",
    default: "AYUSH Clinic Platform",
  },
  description: "Digital clinic management for AYUSH practitioners",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${notoSansTamil.variable}`}>
      <body className="font-sans antialiased">
        <AuthProvider>
          <KeyboardProvider>
            <div className="flex h-screen">
              <Sidebar />
              <main className="flex-1 overflow-auto bg-gray-50 p-6 pt-16 md:p-8 md:pt-8">
                {children}
              </main>
            </div>
          </KeyboardProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
