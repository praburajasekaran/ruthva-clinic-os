"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import {
    ArrowRight,
    Stethoscope,
    FileText,
    Users,
    LayoutDashboard,
    CalendarDays,
    Pill,
    Activity,
    Search,
    HeartPulse,
    ClipboardList,
    CalendarClock,
    Users2,
    Settings,
    Plus,
} from "lucide-react";

function DashboardMockup() {
    return (
        <div
            className="w-full rounded-[1.25rem] overflow-hidden text-left select-none shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]"
            style={{ fontSize: "11px", lineHeight: "1.4" }}
            aria-hidden="true"
        >
            {/* Window chrome */}
            <div className="flex items-center gap-1.5 px-4 py-2.5 bg-[#e8e5de] border-b border-black/[0.06]">
                <div className="w-[10px] h-[10px] rounded-full bg-[#ff5f57]" />
                <div className="w-[10px] h-[10px] rounded-full bg-[#febc2e]" />
                <div className="w-[10px] h-[10px] rounded-full bg-[#28c840]" />
                <div className="flex-1 mx-8 max-w-[240px]">
                    <div className="bg-white/70 rounded-md px-3 py-1 text-center text-[9px] text-gray-400 font-medium">
                        app.ruthva.com
                    </div>
                </div>
            </div>
            <div className="flex h-[320px] sm:h-[380px] md:h-[460px]">
                {/* Sidebar — white with emerald accents */}
                <div className="hidden sm:flex w-[170px] md:w-[190px] flex-col bg-white border-r border-[#ddd5c8] shrink-0">
                    {/* Logo */}
                    <div className="px-3 py-3.5 border-b border-[#ddd5c8]">
                        <div className="font-bold text-[11px] tracking-wide text-[#1d261f]">RUTHVA</div>
                    </div>
                    {/* Search */}
                    <div className="px-2.5 pt-3 pb-1">
                        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5">
                            <Search className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="text-[9px] text-gray-400 flex-1">Search patients…</span>
                            <span className="text-[8px] text-gray-300 bg-gray-100 rounded px-1 py-0.5 font-mono">⌘K</span>
                        </div>
                    </div>
                    {/* Nav */}
                    <nav className="flex-1 px-2 py-2 space-y-0.5">
                        {[
                            { icon: LayoutDashboard, label: "Dashboard", active: true },
                            { icon: Users, label: "Patients", active: false },
                            { icon: Stethoscope, label: "Consultations", active: false },
                            { icon: FileText, label: "Prescriptions", active: false },
                            { icon: CalendarClock, label: "Follow-ups", active: false, badge: "3" },
                            { icon: Pill, label: "Pharmacy", active: false },
                            { icon: Users2, label: "Team", active: false },
                            { icon: Settings, label: "Settings", active: false },
                        ].map((item) => (
                            <div
                                key={item.label}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] ${
                                    item.active
                                        ? "bg-emerald-50 font-medium text-emerald-700"
                                        : "text-gray-600"
                                }`}
                            >
                                <item.icon className="w-3.5 h-3.5 shrink-0" />
                                <span className="flex-1">{item.label}</span>
                                {"badge" in item && item.badge && (
                                    <span className="text-[8px] font-semibold bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5">{item.badge}</span>
                                )}
                            </div>
                        ))}
                    </nav>
                    {/* Clinic + user */}
                    <div className="px-2.5 py-2.5 border-t border-[#ddd5c8]">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full border border-emerald-200 bg-emerald-50 flex items-center justify-center text-[9px] font-semibold text-emerald-700">
                                AV
                            </div>
                            <div className="min-w-0">
                                <div className="text-[9px] font-semibold text-emerald-700 truncate">Aruna Ayurveda</div>
                                <div className="text-[8px] text-gray-400 truncate">Dr. Aruna V. · Doctor</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content — warm beige canvas */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f2efe8]">
                    {/* Dashboard Body */}
                    <div className="flex-1 overflow-hidden p-3 sm:p-4 md:p-5 space-y-3">
                        {/* Hero Banner */}
                        <div className="rounded-2xl md:rounded-[20px] bg-gradient-to-br from-[#1a3c2a] via-[#2f5f44] to-[#467858] border border-[#bfd7c5] p-3 sm:p-4 text-white">
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <div className="inline-flex items-center gap-1 bg-white/10 rounded-full px-2 py-0.5 text-[8px] font-medium text-white/80 mb-1.5">
                                        <HeartPulse className="w-2.5 h-2.5" /> Ruthva Home
                                    </div>
                                    <div className="text-sm sm:text-base font-bold tracking-tight leading-tight">Who needs attention<br className="hidden sm:block" /> right now?</div>
                                    <div className="text-[9px] text-white/70 mt-1 max-w-[260px]">Your patients at a glance — follow-ups due, decisions pending.</div>
                                </div>
                                <div className="hidden md:flex gap-1.5 shrink-0 mt-1">
                                    <div className="rounded-lg bg-white text-[#1a3c2a] px-2.5 py-1 text-[9px] font-semibold">Review Needs Attention</div>
                                    <div className="rounded-lg border border-white/25 bg-white/10 px-2.5 py-1 text-[9px] font-medium">Open Journeys</div>
                                </div>
                            </div>
                            {/* Stats in hero */}
                            <div className="grid grid-cols-3 gap-2 mt-2">
                                {[
                                    { label: "JOURNEYS DUE", value: "5" },
                                    { label: "DUE TODAY", value: "3" },
                                    { label: "AT RISK NOW", value: "1" },
                                ].map((s) => (
                                    <div key={s.label} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-sm px-2.5 py-2">
                                        <div className="text-[7px] uppercase tracking-[0.14em] text-white/60 font-semibold">{s.label}</div>
                                        <div className="text-base sm:text-lg font-semibold mt-0.5">{s.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Two column: Priority Journeys + Right sidebar */}
                        <div className="flex gap-3 flex-1 min-h-0">
                            {/* Priority Journeys */}
                            <div className="flex-1 rounded-2xl border border-[#ddd5c8] bg-[#fffdf8] p-3 overflow-hidden min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <div className="font-semibold text-[11px] text-[#1d261f]">Priority journeys</div>
                                        <div className="text-[9px] text-[#555f57]">Patients needing follow-up</div>
                                    </div>
                                    <div className="text-[9px] text-emerald-700 font-medium">Open Journeys</div>
                                </div>
                                <div className="space-y-1.5">
                                    {[
                                        { name: "Meera Sharma", id: "AYU-0042", reason: "Post-Panchakarma review", due: "Due today", color: "border-amber-300 bg-amber-50", next: "Check vitals & discharge plan" },
                                        { name: "Rajesh Nair", id: "AYU-0035", reason: "Chronic joint inflammation", due: "Overdue 2d", color: "border-orange-300 bg-orange-50", next: "Adjust Guggulu dosage" },
                                        { name: "Sunita Devi", id: "AYU-0058", reason: "Digestive wellness program", due: "Due tomorrow", color: "border-emerald-300 bg-emerald-50", next: "Diet plan follow-up" },
                                    ].map((j) => (
                                        <div key={j.id} className={`rounded-xl border ${j.color} p-2.5`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-semibold text-[10px] text-[#1d261f]">{j.name}</span>
                                                    <span className="text-[8px] bg-white/70 rounded px-1 py-0.5 text-gray-500">{j.id}</span>
                                                </div>
                                                <span className="text-[8px] font-medium bg-white/80 rounded-full px-1.5 py-0.5 text-gray-600">{j.due}</span>
                                            </div>
                                            <div className="text-[9px] text-gray-600 mt-0.5">{j.reason}</div>
                                            <div className="text-[9px] mt-1 text-[#1d261f]"><span className="text-gray-400">Next step:</span> <span className="font-semibold">{j.next}</span></div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right column: Operating rhythm + Recent patients */}
                            <div className="hidden md:flex w-[180px] flex-col gap-2.5 shrink-0">
                                {/* Today's operating rhythm */}
                                <div className="rounded-2xl border border-[#ddd5c8] bg-[#fffdf8] p-3">
                                    <div className="flex items-center gap-1 mb-2">
                                        <CalendarDays className="w-3 h-3 text-[#2f5f44]" />
                                        <span className="font-semibold text-[10px] text-[#1d261f]">Today&apos;s rhythm</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {[
                                            { label: "Active queue", value: "4", icon: HeartPulse, style: "border-emerald-200 bg-emerald-50/80 text-emerald-900" },
                                            { label: "Due today", value: "3", icon: CalendarClock, style: "border-amber-200 bg-amber-50 text-amber-900" },
                                            { label: "Doctor decisions", value: "2", icon: ClipboardList, style: "border-orange-200 bg-orange-50 text-orange-900" },
                                            { label: "Visits this week", value: "18", icon: Activity, style: "border-emerald-200 bg-emerald-50/80 text-emerald-900" },
                                        ].map((t) => (
                                            <div key={t.label} className={`rounded-xl border ${t.style} px-2.5 py-2 flex items-center justify-between`}>
                                                <div className="flex items-center gap-1.5">
                                                    <t.icon className="w-3 h-3 opacity-70" />
                                                    <span className="text-[9px] font-medium">{t.label}</span>
                                                </div>
                                                <span className="text-sm font-semibold">{t.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Quick moves */}
                                <div className="rounded-2xl border border-[#ddd5c8] bg-[#fffdf8] p-3">
                                    <div className="flex items-center gap-1 mb-2">
                                        <Stethoscope className="w-3 h-3 text-[#2f5f44]" />
                                        <span className="font-semibold text-[10px] text-[#1d261f]">Quick moves</span>
                                    </div>
                                    <div className="space-y-1">
                                        {[
                                            { label: "New Patient", icon: Plus },
                                            { label: "Start Consultation", icon: Stethoscope },
                                            { label: "Review Journeys", icon: ArrowRight },
                                        ].map((q) => (
                                            <div key={q.label} className="flex items-center gap-1.5 rounded-xl border border-[#ddd5c8] bg-[#f7f3ec] px-2.5 py-1.5">
                                                <q.icon className="w-3 h-3 text-[#2f5f44]" />
                                                <span className="text-[9px] font-medium text-[#1d261f]">{q.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

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
                            Your entire AYUSH practice. One powerful platform.
                        </h1>
                        <p className="mx-auto mb-10 max-w-2xl text-lg text-brand-200 sm:text-xl font-normal">
                            Manage patients, consultations, prescriptions, pharmacy, and your team — with built-in support for Siddha, Ayurveda, Homeopathy, Yoga &amp; Naturopathy, and Unani.
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
                                <Stethoscope className="h-5 w-5 text-brand-400" aria-hidden="true" /> Multi-Discipline Support
                            </span>
                            <span className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-brand-400" aria-hidden="true" /> Digital Prescriptions
                            </span>
                            <span className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-brand-400" aria-hidden="true" /> Team Collaboration
                            </span>
                        </div>
                    </motion.div>
                </div>

                {/* --- Dashboard Preview --- */}
                <motion.div
                    {...fadeUpSlow}
                    className="mx-auto max-w-5xl mt-12 w-full px-4 sm:px-0"
                    style={{ perspective: "1800px" }}
                >
                    <div
                        className="relative w-full rounded-[2rem] border border-white/[0.08] p-2 overflow-hidden"
                        style={{
                            transform: "rotateX(2deg)",
                            transformOrigin: "center bottom",
                            background: "linear-gradient(135deg, rgba(16,36,24,0.9) 0%, rgba(26,60,42,0.85) 100%)",
                            boxShadow: "0 40px 80px -20px rgba(0,0,0,0.7), 0 0 60px -10px rgba(95,143,113,0.15), inset 0 1px 0 rgba(255,255,255,0.06)",
                        }}
                    >
                        {/* Top shine edge */}
                        <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" aria-hidden="true" />
                        {/* Corner glow */}
                        <div className="absolute -top-20 -left-20 w-60 h-60 bg-brand-400/10 rounded-full blur-[80px] pointer-events-none" aria-hidden="true" />
                        <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-brand-500/8 rounded-full blur-[80px] pointer-events-none" aria-hidden="true" />
                        <DashboardMockup />
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
