import type { Metadata } from "next";
import { inter, notoSansTamil } from "@/lib/fonts";
import { AuthProvider } from "@/components/auth/AuthProvider";
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
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
