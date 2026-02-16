import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LayoutDashboard, Users, Stethoscope, FileText } from "lucide-react";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sivanethram — Siddha Clinic Management",
  description: "Digital clinic management for Siddha practitioners",
};

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/consultations", label: "Consultations", icon: Stethoscope },
  { href: "/prescriptions", label: "Prescriptions", icon: FileText },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex h-screen">
          <aside className="w-64 border-r bg-white p-4">
            <h1 className="mb-8 text-xl font-bold text-emerald-700">
              Sivanethram
            </h1>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="flex-1 overflow-auto bg-gray-50 p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
