import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function Navbar() {
    return (
        <nav className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-border bg-surface/80 px-6 py-4 backdrop-blur-md">
            <Link href="/" className="flex items-center gap-2">
                <Image
                    src="/ruthva-logo.png"
                    alt="Ruthva Logo"
                    width={120}
                    height={32}
                    className="h-8 w-auto object-contain"
                />
            </Link>

            <div className="hidden items-center gap-8 md:flex">
                <Link href="#how-it-works" className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary">
                    How It Works
                </Link>
                <Link href="#pricing" className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary">
                    Pricing
                </Link>
            </div>

            <div className="flex items-center gap-4">
                <Link
                    href="/login"
                    className="hidden text-sm font-semibold text-text-secondary transition-colors hover:text-brand-950 md:block"
                >
                    Sign In
                </Link>
                <Link
                    href="/login"
                    className="flex h-10 items-center justify-center gap-2 rounded-full bg-brand-950 px-5 text-sm font-bold text-white shadow-md shadow-brand-900/20 transition-all hover:bg-brand-800 active:scale-95"
                >
                    Dashboard <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
        </nav>
    );
}
