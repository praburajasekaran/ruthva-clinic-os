"use client";

import { useState } from "react";
import {
    motion,
    AnimatePresence,
    useAnimationFrame,
    useMotionValue,
    useTransform,
} from "framer-motion";
import type { MotionValue } from "framer-motion";
import { UserPlus, Stethoscope, FileText, Printer, Save } from "lucide-react";

const STEP_DURATION = 4000;
const TOTAL_STEPS = 3;

export function OnboardingSimulation() {
    const elapsed = useMotionValue(0);
    const [activeStep, setActiveStep] = useState(1);
    const [isPaused, setIsPaused] = useState(false);
    const [isFinished, setIsFinished] = useState(false);

    useAnimationFrame((_time, delta) => {
        if (isPaused || isFinished) return;

        const nextElapsed = elapsed.get() + delta;

        if (nextElapsed >= STEP_DURATION * TOTAL_STEPS) {
            elapsed.set(STEP_DURATION * TOTAL_STEPS);
            setIsFinished(true);
            setActiveStep(TOTAL_STEPS);
            return;
        }

        elapsed.set(nextElapsed);

        const currentStep = Math.floor(nextElapsed / STEP_DURATION) + 1;
        if (currentStep !== activeStep) {
            setActiveStep(currentStep);
        }
    });

    const handleStepClick = (step: number) => {
        elapsed.set((step - 1) * STEP_DURATION);
        setIsFinished(false);
        setActiveStep(step);
    };

    return (
        <section className="bg-surface py-20 px-6 sm:py-32 relative overflow-hidden" id="how-it-works" aria-labelledby="how-it-works-heading">
            <div className="mx-auto max-w-5xl">
                <div className="text-center mb-16">
                    <h2 id="how-it-works-heading" className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl text-balance">
                        3 steps. Zero extra work.
                    </h2>
                    <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
                        Register a patient, record a consultation, and generate a prescription — all in one flow.
                    </p>
                </div>

                <div
                    className="grid gap-8 lg:gap-16 lg:grid-cols-12 items-center"
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                >
                    <div className="lg:col-span-5 space-y-4 lg:space-y-6">
                        <FeatureStep
                            number={1}
                            title="Register a patient"
                            description="Add their name, phone, and discipline. The profile is ready in seconds."
                            Icon={UserPlus}
                            isActive={activeStep === 1}
                            elapsed={elapsed}
                            onClick={() => handleStepClick(1)}
                        >
                            <StepOneUI />
                        </FeatureStep>
                        <FeatureStep
                            number={2}
                            title="Record a consultation"
                            description="Capture complaints, diagnosis, and notes with discipline-specific fields built in."
                            Icon={Stethoscope}
                            isActive={activeStep === 2}
                            elapsed={elapsed}
                            onClick={() => handleStepClick(2)}
                        >
                            <StepTwoUI />
                        </FeatureStep>
                        <FeatureStep
                            number={3}
                            title="Generate a prescription"
                            description="Create a printable prescription with medicines, dosage, and duration — ready to hand over."
                            Icon={FileText}
                            isActive={activeStep === 3}
                            elapsed={elapsed}
                            onClick={() => handleStepClick(3)}
                        >
                            <StepThreeUI />
                        </FeatureStep>
                    </div>

                    <div className="hidden lg:flex lg:col-span-7 relative min-h-[400px] lg:h-[500px] w-full items-center justify-center pt-4 lg:pt-0">
                        <div className="absolute inset-0 bg-gradient-to-tr from-brand-100/40 to-transparent blur-3xl rounded-full" />
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeStep}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -30 }}
                                transition={{ duration: 0.4 }}
                                className="relative w-full max-w-md"
                            >
                                {activeStep === 1 && <StepOneUI />}
                                {activeStep === 2 && <StepTwoUI />}
                                {activeStep === 3 && <StepThreeUI />}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </section>
    );
}

function FeatureStep({
    number, title, description, Icon,
    isActive, elapsed, onClick, children,
}: {
    number: number;
    title: string;
    description: string;
    Icon: React.ComponentType<{ className?: string }>;
    isActive: boolean;
    elapsed: MotionValue<number>;
    onClick: () => void;
    children?: React.ReactNode;
}) {
    const startTime = (number - 1) * STEP_DURATION;
    const endTime = number * STEP_DURATION;

    const widthPercent = useTransform(
        elapsed,
        [startTime, endTime],
        ["0%", "100%"],
        { clamp: true }
    );

    return (
        <div
            onClick={onClick}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
            role="button"
            tabIndex={0}
            aria-pressed={isActive}
            aria-label={`Step ${number}: ${title}`}
            className={`cursor-pointer transition-all duration-300 p-4 sm:p-5 rounded-2xl relative overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${isActive
                ? "bg-brand-50 shadow-sm border border-brand-100 lg:scale-105"
                : "hover:bg-gray-50 border border-transparent"
                }`}
        >
            <div className="flex gap-4">
                <div className="flex-shrink-0 mt-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ring-4 transition-colors ${isActive
                        ? "bg-brand-500 text-white ring-brand-100 border border-brand-600"
                        : "bg-white text-brand-800 ring-gray-50 border border-brand-200"
                        }`}>
                        {isActive ? <Icon className="w-5 h-5 pointer-events-none" /> : number}
                    </div>
                </div>
                <div>
                    <h3 className={`text-lg font-bold mb-1 transition-colors ${isActive ? "text-brand-900" : "text-text-primary"
                        }`}>
                        {title}
                    </h3>
                    <p className="text-text-secondary leading-relaxed text-sm">{description}</p>
                </div>
            </div>

            {isActive && (
                <motion.div
                    className="absolute bottom-0 left-0 h-[3px] bg-brand-500 rounded-full"
                    style={{ width: widthPercent }}
                />
            )}

            <AnimatePresence>
                {isActive && children && (
                    <motion.div
                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                        animate={{ height: "auto", opacity: 1, marginTop: 24 }}
                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                        className="lg:hidden overflow-hidden"
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function StepOneUI() {
    return (
        <div className="bg-white rounded-2xl border border-border shadow-2xl overflow-hidden pointer-events-none">
            <div className="border-b border-border bg-gray-50 px-6 py-4">
                <h4 className="font-semibold flex items-center gap-2 text-text-primary">
                    <UserPlus className="w-5 h-5 text-brand-600" />
                    New Patient Profile
                </h4>
            </div>
            <div className="p-6 space-y-5">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Patient Name</label>
                    <div className="w-full h-10 bg-gray-50 border border-gray-200 rounded-md flex items-center px-3 text-sm text-text-primary">
                        Rajesh Kumar
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Phone Number</label>
                    <div className="w-full h-10 bg-gray-50 border border-gray-200 rounded-md flex items-center px-3 text-sm text-text-primary">
                        +91 98765 43210
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Discipline</label>
                    <div className="w-full h-10 bg-gray-50 border border-gray-200 rounded-md flex items-center px-3 text-sm text-text-primary justify-between">
                        <span>Siddha</span>
                        <Stethoscope className="w-4 h-4 text-brand-500" />
                    </div>
                </div>
                <button className="w-full mt-2 bg-brand-600 text-white font-medium py-2.5 rounded-md shadow-sm flex items-center justify-center gap-2">
                    Save Patient <Save className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

function StepTwoUI() {
    return (
        <div className="bg-white rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col pointer-events-none">
            <div className="border-b border-border bg-gray-50 px-6 py-4 flex justify-between items-center">
                <h4 className="font-semibold flex items-center gap-2 text-text-primary">
                    <Stethoscope className="w-5 h-5 text-brand-600" />
                    New Consultation
                </h4>
                <span className="text-xs bg-brand-100 text-brand-700 px-2 py-1 rounded-full font-medium">Rajesh Kumar</span>
            </div>
            <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Chief Complaint</label>
                    <div className="w-full h-10 bg-gray-50 border border-gray-200 rounded-md flex items-center px-3 text-sm text-text-primary">
                        Knee pain, swelling for 2 weeks
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Diagnosis</label>
                    <div className="w-full h-10 bg-gray-50 border border-gray-200 rounded-md flex items-center px-3 text-sm text-text-primary">
                        Vatha Suronitham (Arthritis)
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Notes</label>
                    <div className="w-full h-16 bg-gray-50 border border-gray-200 rounded-md flex items-start px-3 pt-2 text-sm text-text-primary">
                        Advised Varmam therapy. Follow-up in 7 days.
                    </div>
                </div>
                <button className="w-full mt-1 bg-brand-600 text-white font-medium py-2.5 rounded-md shadow-sm flex items-center justify-center gap-2">
                    Save Consultation <Save className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

function StepThreeUI() {
    return (
        <div className="bg-white rounded-2xl border border-border shadow-2xl overflow-hidden pointer-events-none">
            <div className="border-b border-border bg-gray-50 px-6 py-4 flex justify-between items-center">
                <h4 className="font-semibold flex items-center gap-2 text-text-primary">
                    <FileText className="w-5 h-5 text-brand-600" />
                    Prescription
                </h4>
                <span className="text-xs text-text-secondary">31 Mar 2026</span>
            </div>
            <div className="p-6">
                <div className="mb-4 pb-3 border-b border-border">
                    <p className="text-sm font-bold text-text-primary">Rajesh Kumar</p>
                    <p className="text-xs text-text-secondary">Vatha Suronitham (Arthritis)</p>
                </div>

                <div className="space-y-3 mb-5">
                    <div className="flex items-start justify-between gap-4 text-sm">
                        <div>
                            <p className="font-medium text-text-primary">1. Nilavembu Kashayam</p>
                            <p className="text-xs text-text-secondary">30ml, twice daily before food</p>
                        </div>
                        <span className="text-xs text-text-secondary whitespace-nowrap">14 days</span>
                    </div>
                    <div className="flex items-start justify-between gap-4 text-sm">
                        <div>
                            <p className="font-medium text-text-primary">2. Kottamchukkadi Thailam</p>
                            <p className="text-xs text-text-secondary">External application, twice daily</p>
                        </div>
                        <span className="text-xs text-text-secondary whitespace-nowrap">14 days</span>
                    </div>
                    <div className="flex items-start justify-between gap-4 text-sm">
                        <div>
                            <p className="font-medium text-text-primary">3. Rasnadi Choornam</p>
                            <p className="text-xs text-text-secondary">1 tsp with warm water, after food</p>
                        </div>
                        <span className="text-xs text-text-secondary whitespace-nowrap">14 days</span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button className="flex-1 bg-brand-600 text-white font-medium py-2.5 rounded-md shadow-sm flex items-center justify-center gap-2 text-sm">
                        <Printer className="w-4 h-4" /> Print
                    </button>
                    <button className="flex-1 bg-gray-100 text-text-primary font-medium py-2.5 rounded-md shadow-sm flex items-center justify-center gap-2 text-sm border border-gray-200">
                        <FileText className="w-4 h-4" /> Share PDF
                    </button>
                </div>
            </div>
        </div>
    );
}
