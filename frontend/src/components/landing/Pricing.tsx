"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";

export function Pricing() {
    const prefersReducedMotion = useReducedMotion();

    return (
        <section className="bg-surface py-24 px-6 sm:py-32 relative" id="pricing" aria-labelledby="pricing-heading">
            <div className="absolute inset-0 bg-brand-50/50 rounded-t-[3rem] sm:rounded-t-[5rem] -z-10" aria-hidden="true"></div>

            <div className="mx-auto max-w-5xl">
                <div className="text-center mb-16 max-w-2xl mx-auto">
                    <h2 id="pricing-heading" className="text-3xl font-bold tracking-tight text-brand-950 sm:text-4xl lg:text-5xl text-balance">
                        Simple pricing. Clear ROI.
                    </h2>
                    <p className="mt-6 text-lg text-text-secondary leading-relaxed">
                        Pay a flat fee, recover lost patient revenue, and protect your clinic&apos;s reputation.
                    </p>
                </div>

                <div className="mx-auto max-w-lg">
                    <motion.div
                        {...(prefersReducedMotion ? {} : { initial: { opacity: 0, scale: 0.95 }, whileInView: { opacity: 1, scale: 1 }, viewport: { once: true } })}
                        className="rounded-[2.5rem] shadow-2xl shadow-brand-900/10 border border-brand-100 bg-white p-8 sm:p-12 relative overflow-hidden"
                    >
                        <div className="absolute top-0 inset-x-0 bg-brand-950 py-3.5 text-center text-sm font-semibold text-brand-100">
                            Revenue Protected This Month: &#8377;72,000*
                        </div>

                        <div className="mt-10 mb-10">
                            <h3 className="text-3xl font-bold text-brand-950">Starter Plan</h3>
                            <p className="text-text-secondary text-base mt-3 leading-relaxed">Perfect for independent AYUSH practitioners looking for immediate continuity wins.</p>

                            <div className="mt-8 flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-text-secondary">
                                    <span className="text-xl font-medium line-through decoration-brand-500/50">&#8377;1,999</span>
                                    <span className="inline-flex items-center rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-bold text-brand-800 tracking-wide uppercase">
                                        Launch Offer
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-x-2">
                                    <span className="text-6xl font-extrabold tracking-tight text-brand-950">&#8377;999</span>
                                    <span className="text-base font-semibold leading-6 text-text-secondary">/month</span>
                                </div>
                            </div>
                        </div>

                        <ul className="space-y-5 text-base leading-6 text-text-secondary mb-10">
                            <li className="flex gap-x-4 text-brand-900 font-medium">
                                <Check className="h-6 w-6 flex-none text-brand-500/80" aria-hidden="true" />
                                Up to 100 active treatment journeys
                            </li>
                            <li className="flex gap-x-4 text-brand-900 font-medium">
                                <Check className="h-6 w-6 flex-none text-brand-500/80" aria-hidden="true" />
                                Automated Adherence Checks
                            </li>
                            <li className="flex gap-x-4 text-brand-900 font-medium">
                                <Check className="h-6 w-6 flex-none text-brand-500/80" aria-hidden="true" />
                                Recovery Automation &amp; Alerts
                            </li>
                            <li className="flex gap-x-4 text-brand-900 font-medium">
                                <Check className="h-6 w-6 flex-none text-brand-500/80" aria-hidden="true" />
                                WhatsApp Messaging Included
                            </li>
                        </ul>

                        <Link
                            href="/login"
                            className="mt-8 block w-full rounded-xl bg-brand-600 px-4 py-4 text-center text-base font-semibold text-white shadow-lg shadow-brand-600/25 hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 transition-all active:scale-95"
                        >
                            Start recovering patients today
                        </Link>

                        <p className="text-center text-xs text-text-secondary mt-6">
                            *Based on 4-5 average patient recoveries / month
                        </p>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
