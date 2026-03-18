import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function Navbar() {
    return (
        <nav
            className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-brand-800/50 bg-brand-950/95 px-6 py-4 backdrop-blur-md"
            role="navigation"
            aria-label="Main navigation"
        >
            <Link href="/" className="flex items-center gap-2" aria-label="Ruthva — go to homepage">
                <Image
                    src="/ruthva-logo.png"
                    alt="Ruthva"
                    width={120}
                    height={32}
                    className="h-8 w-auto object-contain brightness-0 invert"
                />
            </Link>

            <div className="hidden items-center gap-8 md:flex">
                <Link href="#how-it-works" className="text-sm font-medium text-brand-200 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-400 rounded-sm">
                    How It Works
                </Link>
                <Link href="#pricing" className="text-sm font-medium text-brand-200 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-400 rounded-sm">
                    Pricing
                </Link>
            </div>

            <div className="flex items-center gap-4">
                <Link
                    href="/login"
                    className="hidden text-sm font-semibold text-brand-100 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-400 rounded-sm md:block"
                >
                    Sign In
                </Link>
                <Link
                    href="/signup"
                    className="flex h-10 items-center justify-center gap-2 rounded-full bg-brand-500 px-5 text-sm font-bold text-white shadow-md shadow-brand-900/20 transition-all hover:bg-brand-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 active:scale-95"
                >
                    Register <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
            </div>
        </nav>
    );
}
