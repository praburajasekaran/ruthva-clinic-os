import Link from "next/link";
import Image from "next/image";

export function Footer() {
    return (
        <footer className="bg-brand-950 text-white pt-20 pb-12" role="contentinfo">
            <div className="mx-auto max-w-5xl px-6 md:flex md:items-center md:justify-between lg:px-8">
                <div className="flex justify-center space-x-6 md:order-2 text-sm text-brand-200 font-medium">
                    <Link href="/login" className="hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-400 rounded-sm">
                        Doctor Login
                    </Link>
                    <span className="text-brand-600" aria-hidden="true">&middot;</span>
                    <Link href="mailto:support@ruthva.com" className="hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-400 rounded-sm">
                        Support
                    </Link>
                </div>
                <div className="mt-8 md:order-1 md:mt-0 flex flex-col items-center md:items-start gap-5">
                    <Link href="/" className="flex items-center gap-2" aria-label="Ruthva — go to homepage">
                        <Image
                            src="/ruthva-logo.png"
                            alt="Ruthva"
                            width={100}
                            height={28}
                            className="h-8 w-auto object-contain brightness-0 invert"
                        />
                    </Link>
                    <p className="text-center text-xs leading-5 text-brand-200">
                        &copy; {new Date().getFullYear()} Ruthva Continuity System. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
