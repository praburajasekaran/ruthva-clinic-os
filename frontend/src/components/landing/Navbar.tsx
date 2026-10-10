import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function Navbar() {
    return (
        <nav
            className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between gap-4 border-b border-border bg-surface px-4 py-4 sm:px-6"
            role="navigation"
            aria-label="Main navigation"
        >
            <Link href="/" className="flex min-w-0 items-center gap-2" aria-label="Ruthva — go to homepage">
                <Image
                    src="/ruthva-logo.png"
                    alt="Ruthva"
                    width={120}
                    height={32}
                    className="h-auto w-28 object-contain sm:h-8 sm:w-auto"
                />
            </Link>

            <div className="hidden items-center gap-8 md:flex">
                <Link href="#how-it-works" className="text-sm font-medium text-brand-700 transition-colors hover:text-brand-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600 rounded-sm">
                    How It Works
                </Link>
                <Link href="#pricing" className="text-sm font-medium text-brand-700 transition-colors hover:text-brand-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600 rounded-sm">
                    Pricing
                </Link>
            </div>

            <div className="flex shrink-0 items-center gap-3 sm:gap-4">
                <Link
                    href="/login"
                    className="whitespace-nowrap text-sm font-semibold text-brand-700 transition-colors hover:text-brand-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600 rounded-sm"
                >
                    Sign In
                </Link>
                <Link
                    href="/signup"
                    className="flex h-10 items-center justify-center gap-2 rounded-full bg-brand-600 px-4 text-sm font-bold text-white shadow-md shadow-brand-900/20 transition-all hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 active:scale-95 sm:px-5"
                >
                    Register <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
            </div>
        </nav>
    );
}
