"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export function Hero() {
    const prefersReducedMotion = useReducedMotion();
    const fadeUp = prefersReducedMotion
        ? {}
        : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 } };
    const fadeUpSlow = prefersReducedMotion
        ? {}
        : { initial: { opacity: 0, y: 40 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay: 0.2 } };

    return (
        <section
            className="relative overflow-hidden pt-32 pb-16 md:pt-48 md:pb-24 bg-brand-950 text-white rounded-b-[2.5rem] sm:rounded-b-[4rem] z-10"
            aria-labelledby="hero-heading"
        >
            {/* Abstract Organic Background Shapes */}
            <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-[800px] h-[800px] bg-brand-900/40 rounded-full blur-[100px] pointer-events-none" aria-hidden="true"></div>
            <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/4 w-[600px] h-[600px] bg-brand-600/20 rounded-full blur-[120px] pointer-events-none" aria-hidden="true"></div>

            <div className="relative mx-auto max-w-7xl px-6 z-10">
                <div className="text-center max-w-4xl xl:max-w-5xl mx-auto">
                    <motion.div {...fadeUp}>
                        <span className="mb-8 inline-flex items-center rounded-full border border-brand-700/50 bg-brand-900/80 backdrop-blur-md px-4 py-1.5 text-sm font-medium text-brand-100">
                            <span className="mr-3 flex h-2 w-2 rounded-full bg-brand-400 animate-pulse" aria-hidden="true"></span>
                            Built exclusively for AYUSH Clinics
                        </span>
                        <h1 id="hero-heading" className="mb-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl text-balance">
                            Detect disappearing patients and bring them back.
                        </h1>
                        <p className="mx-auto mb-10 max-w-2xl text-lg text-brand-200 sm:text-xl font-normal">
                            The Patient Continuity System that tracks treatment adherence automatically, finds at-risk patients, and engages them via WhatsApp before they drop out.
                        </p>

                        <div className="flex flex-col flex-wrap items-center justify-center gap-4 sm:flex-row">
                            <Link
                                href="/signup"
                                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-8 text-base font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-400 hover:shadow-brand-500/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95 sm:w-auto"
                            >
                                Register Your Clinic <ArrowRight className="h-5 w-5" aria-hidden="true" />
                            </Link>
                            <Link
                                href="#how-it-works"
                                className="flex h-14 w-full items-center justify-center rounded-xl border-2 border-brand-600 bg-brand-900/50 px-8 text-base font-semibold text-white transition-colors hover:bg-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto backdrop-blur-sm"
                            >
                                See how it works
                            </Link>
                        </div>

                        <div className="mt-14 mb-20 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-brand-200 font-medium">
                            <span className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-brand-400" aria-hidden="true" /> WhatsApp Integration
                            </span>
                            <span className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-brand-400" aria-hidden="true" /> Zero Software to Learn
                            </span>
                            <span className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-brand-400" aria-hidden="true" /> Runs on Autopilot
                            </span>
                        </div>
                    </motion.div>
                </div>

                {/* --- System Flow Visualization --- */}
                <motion.div
                    {...fadeUpSlow}
                    className="mx-auto max-w-5xl mt-12 w-full px-4 sm:px-0"
                >
                    <div className="relative w-full rounded-[2rem] bg-brand-950/80 backdrop-blur-xl border border-brand-700 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden flex items-center justify-center">
                        <Image
                            src="/Ruthva-hero-image.png"
                            alt="Ruthva Adherence Flow — diagram showing how patient treatment journeys are tracked, monitored, and recovered automatically"
                            width={1200}
                            height={600}
                            className="w-full h-auto rounded-[1.5rem]"
                            priority
                        />
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
