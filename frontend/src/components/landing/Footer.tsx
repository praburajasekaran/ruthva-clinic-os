import Link from "next/link";
import Image from "next/image";

export function Footer() {
    return (
        <footer className="bg-brand-950 text-white pt-20 pb-12">
            <div className="mx-auto max-w-5xl px-6 md:flex md:items-center md:justify-between lg:px-8">
                <div className="flex justify-center space-x-6 md:order-2 text-sm text-brand-100/70 font-medium">
                    <Link href="/login" className="hover:text-white transition-colors">
                        Doctor Login
                    </Link>
                    <span className="text-brand-700">&middot;</span>
                    <Link href="mailto:support@ruthva.com" className="hover:text-white transition-colors">
                        Support
                    </Link>
                </div>
                <div className="mt-8 md:order-1 md:mt-0 flex flex-col items-center md:items-start gap-5">
                    <Link href="/" className="flex items-center gap-2">
                        <Image
                            src="/ruthva-logo.png"
                            alt="Ruthva Logo"
                            width={100}
                            height={28}
                            className="h-8 w-auto object-contain brightness-0 invert opacity-90 transition-opacity hover:opacity-100"
                        />
                    </Link>
                    <p className="text-center text-xs leading-5 text-brand-100/60">
                        &copy; {new Date().getFullYear()} Ruthva Continuity System. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
