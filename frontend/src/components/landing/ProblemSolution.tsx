"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BookX, LayoutDashboard } from "lucide-react";

export function ProblemSolution() {
    const prefersReducedMotion = useReducedMotion();

    return (
        <section className="bg-surface-sunken py-24 px-6 sm:py-32 relative z-0" id="notebook-objection" aria-labelledby="problem-heading">
            <div className="mx-auto max-w-5xl">
                <div className="mb-20 text-center max-w-3xl mx-auto">
                    <h2 id="problem-heading" className="text-3xl font-bold tracking-tight text-brand-950 sm:text-4xl lg:text-5xl text-balance">
                        Stop running your clinic on paper.
                    </h2>
                    <p className="mt-6 text-lg text-text-secondary leading-relaxed">
                        Paper prescriptions get lost. Patient histories live in scattered notebooks. There&apos;s a better way.
                    </p>
                </div>

                <div className="grid gap-8 md:grid-cols-2 lg:gap-12 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-[400px] bg-brand-200/50 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

                    {/* The Notebook Way */}
                    <motion.div
                        {...(prefersReducedMotion ? {} : { initial: { opacity: 0, x: -20 }, whileInView: { opacity: 1, x: 0 }, viewport: { once: true } })}
                        className="flex flex-col rounded-[2.5rem] border border-red-200 bg-white/60 backdrop-blur-xl p-8 sm:p-10 shadow-xl shadow-red-900/5"
                    >
                        <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 shadow-sm border border-red-100" aria-hidden="true">
                            <BookX className="h-7 w-7" />
                        </div>
                        <h3 className="mb-5 text-2xl font-bold text-red-950">The Old Way</h3>
                        <ul className="mb-10 space-y-4 text-text-secondary font-medium" aria-label="Problems with paper-based clinic management">
                            <li className="flex items-start">
                                <span className="mr-4 text-red-600 mt-1" aria-hidden="true">&#10060;</span>
                                Paper prescriptions lost or illegible
                            </li>
                            <li className="flex items-start">
                                <span className="mr-4 text-red-600 mt-1" aria-hidden="true">&#10060;</span>
                                Patient history scattered across notebooks
                            </li>
                            <li className="flex items-start">
                                <span className="mr-4 text-red-600 mt-1" aria-hidden="true">&#10060;</span>
                                No coordination between doctor and staff
                            </li>
                            <li className="flex items-start">
                                <span className="mr-4 text-red-600 mt-1" aria-hidden="true">&#10060;</span>
                                Follow-ups tracked manually or forgotten
                            </li>
                        </ul>
                        <div className="mt-auto border-t border-red-200 pt-6">
                            <p className="font-semibold text-red-950">
                                Result: <span className="text-red-700">Missed follow-ups. Lost records.</span>
                            </p>
                        </div>
                    </motion.div>

                    {/* The Ruthva Way */}
                    <motion.div
                        {...(prefersReducedMotion ? {} : { initial: { opacity: 0, x: 20 }, whileInView: { opacity: 1, x: 0 }, viewport: { once: true } })}
                        className="flex flex-col rounded-[2.5rem] border-2 border-brand-500 bg-white p-8 sm:p-10 shadow-2xl shadow-brand-900/10 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <LayoutDashboard className="w-48 h-48 rotate-12" />
                        </div>

                        <div className="relative z-10">
                            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-md shadow-brand-500/20" aria-hidden="true">
                                <LayoutDashboard className="h-7 w-7" />
                            </div>
                            <h3 className="mb-5 text-2xl font-bold text-brand-950">The Ruthva Way</h3>
                            <ul className="mb-10 space-y-4 text-text-secondary font-medium" aria-label="Benefits of using Ruthva">
                                <li className="flex items-start">
                                    <span className="mr-4 text-brand-600 mt-1" aria-hidden="true">&#9989;</span>
                                    Complete digital patient records at a glance
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-4 text-brand-600 mt-1" aria-hidden="true">&#9989;</span>
                                    One-click prescriptions with print and share
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-4 text-brand-600 mt-1" aria-hidden="true">&#9989;</span>
                                    Consultation history organised by visit
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-4 text-brand-600 mt-1" aria-hidden="true">&#9989;</span>
                                    Team dashboard with roles and permissions
                                </li>
                            </ul>
                            <div className="mt-auto border-t border-brand-100 pt-6">
                                <p className="font-semibold text-brand-950">
                                    Result: <span className="text-brand-600">Organised clinic. Happy patients.</span>
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
