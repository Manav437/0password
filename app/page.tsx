import Link from "next/link";
import Image from "next/image";
import { auth } from "@clerk/nextjs/server";
import TrunkBackground from "@/components/trunk-background";
import { ChevronRight, ShieldCheck, LayoutDashboard } from "lucide-react";

export default async function Home() {
    const { userId } = await auth();

    return (
        <div className="relative flex min-h-svh flex-col items-center justify-center overflow-x-clip px-5 py-10 sm:py-20 bg-background">
            <TrunkBackground />

            {/*<div className="pointer-events-none absolute inset-0 dark:hidden bg-[linear-gradient(rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.04)_1px,transparent_1px)] bg-[size:40px_40px]" />

            <div className="pointer-events-none absolute inset-0 hidden dark:block bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:40px_40px]" />

            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-100/10 dark:bg-emerald-900/15 blur-[120px]" />*/}

            <div className="relative z-10 flex flex-col items-center w-full max-w-lg gap-7 text-center sm:gap-10">
                <div className="flex items-center gap-2 rounded-full border border-emerald-600/20 dark:border-white/50 bg-emerald-50 dark:bg-white/70 px-3 py-1.5">
                    <ShieldCheck className="text-black" size={18} />
                    <span className="text-xs text-black dark:text-black">
                        Client-side encrypted passwords
                    </span>
                </div>

                <div className="flex flex-col gap-3">
                    <div className="flex gap-3 items-center justify-center sm:gap-4">
                        <Image
                            src="/0password-icon.png"
                            height={50}
                            width={50}
                            alt="0Password Logo"
                        />

                        <span className="font-serif tracking-wide text-4xl sm:text-5xl text-zinc-800 dark:text-zinc-100">
                            0Password
                        </span>
                    </div>
                    <p className="mx-auto max-w-sm text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Your passwords are encrypted on your device. Your master
                        password never leaves your browser.
                    </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span>AES-256-GCM</span>
                    <span className="h-1 w-1 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                    <span>PBKDF2</span>
                    <span className="h-1 w-1 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                    <span>Browser encryption</span>
                </div>

                <div className="flex w-full max-w-xs flex-col items-stretch gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:items-center">
                    {userId ? (
                        <Link
                            prefetch={false}
                            href="/dashboard"
                            className="group flex min-h-12 items-center justify-center gap-2 [corner-shape:squircle] rounded-[50px] border border-zinc-200 dark:border-zinc-700 bg-zinc-900 px-5 font-mono text-sm text-white transition-all hover:border-zinc-300 dark:hover:border-zinc-600 shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_-1px_0_0_rgba(0,0,0,0.06)_inset,0_2px_6px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_1px_0_0_rgba(255,255,255,0.9)_inset,0_-1px_0_0_rgba(0,0,0,0.08)_inset,0_4px_10px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.06)]"
                        >
                            <LayoutDashboard className="h-4 w-4" />
                            Go to Dashboard
                            <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-px" />
                        </Link>
                    ) : (
                        <>
                            <Link
                                href="/sign-up"
                                className="group flex min-h-12 items-center justify-center gap-2 [corner-shape:squircle] rounded-[50px] border border-zinc-200 dark:border-zinc-700 bg-zinc-900 px-5 font-mono text-sm text-white transition-all hover:border-zinc-300 dark:hover:border-zinc-600 shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_-1px_0_0_rgba(0,0,0,0.06)_inset,0_2px_6px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_1px_0_0_rgba(255,255,255,0.9)_inset,0_-1px_0_0_rgba(0,0,0,0.08)_inset,0_4px_10px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.06)]"
                            >
                                Get started
                                <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-px" />
                            </Link>
                            <Link
                                href="/sign-in"
                                className="flex min-h-12 items-center justify-center gap-2 [corner-shape:squircle] rounded-[50px] border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-5 font-mono text-sm text-zinc-600 dark:text-zinc-400 transition-all hover:border-zinc-300 dark:hover:border-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100 shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_-1px_0_0_rgba(0,0,0,0.06)_inset,0_2px_6px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_1px_0_0_rgba(255,255,255,0.9)_inset,0_-1px_0_0_rgba(0,0,0,0.08)_inset,0_4px_10px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.06)]"
                            >
                                Sign in
                            </Link>
                        </>
                    )}
                </div>
            </div>

            <div className="relative z-10 mt-12 px-2 text-center sm:mt-16">
                <p className="font-serif text-xs text-zinc-500 dark:text-zinc-400 tracking-widest uppercase">
                    Open source · Your keys · your data
                </p>
            </div>
        </div>
    );
}
