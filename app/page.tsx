import Link from "next/link";
import Image from "next/image";
import { auth } from "@clerk/nextjs/server";

import { ChevronRight, ShieldCheck, LayoutDashboard } from "lucide-react";

export default async function Home() {
    const { userId } = await auth();

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.04)_1px,transparent_1px)] bg-[size:40px_40px]" />

            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-800/20 blur-[120px]" />

            <div className="relative z-10 flex flex-col items-center gap-10 px-4 text-center">
                <div className="flex items-center gap-2 rounded-full border border-emerald-600/20 bg-emerald-50 px-3 py-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="font-mono text-xs text-zinc-700">
                        End-to-end encrypted
                    </span>
                </div>

                <div className="flex flex-col gap-3">
                    <div className="flex gap-4 items-center justify-center">
                        <Image
                            src="/0password-icon.png"
                            height={50}
                            width={50}
                            alt="0Password Logo"
                        />

                        <span className="font-serif tracking-wider font-semibold text-5xl text-zinc-800">
                            0Password
                        </span>
                    </div>
                    <p className="max-w-sm text-sm text-zinc-500 leading-relaxed">
                        A zero-knowledge password manager. Your master password
                        never leaves your device.
                    </p>
                </div>

                <div className="flex items-center gap-6 font-mono text-xs text-zinc-500">
                    <span>AES-256-GCM</span>
                    <span className="h-1 w-1 rounded-full bg-zinc-400" />
                    <span>PBKDF2</span>
                    <span className="h-1 w-1 rounded-full bg-zinc-400" />
                    <span>Client-side only</span>
                </div>

                <div className="flex items-center gap-3">
                    {userId ? (
                        <Link
                            href="/dashboard"
                            className="group flex h-11 items-center gap-2 rounded-lg bg-zinc-900 px-5 font-mono text-sm text-white transition-all hover:bg-zinc-800 shadow-[0_1px_0_0_rgba(255,255,255,0.1)_inset,0_-1px_0_0_rgba(0,0,0,0.4)_inset,0_4px_12px_rgba(0,0,0,0.15)]"
                        >
                            <LayoutDashboard className="h-4 w-4" />
                            Go to Dashboard
                            <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                        </Link>
                    ) : (
                        <>
                            <Link
                                href="/sign-up"
                                className="group flex h-11 items-center gap-2 rounded-lg bg-zinc-900 px-5 font-mono text-sm text-white transition-all hover:bg-zinc-800 shadow-[0_1px_0_0_rgba(255,255,255,0.1)_inset,0_-1px_0_0_rgba(0,0,0,0.4)_inset,0_4px_12px_rgba(0,0,0,0.15),0_1px_3px_rgba(0,0,0,0.1)] hover:shadow-[0_1px_0_0_rgba(255,255,255,0.12)_inset,0_-1px_0_0_rgba(0,0,0,0.4)_inset,0_6px_16px_rgba(0,0,0,0.2),0_2px_4px_rgba(0,0,0,0.12)]"
                            >
                                Get started
                                <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                            </Link>
                            <Link
                                href="/sign-in"
                                className="flex h-11 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-5 font-mono text-sm text-zinc-600 transition-all hover:border-zinc-300 hover:text-zinc-900 shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_-1px_0_0_rgba(0,0,0,0.06)_inset,0_2px_6px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_1px_0_0_rgba(255,255,255,0.9)_inset,0_-1px_0_0_rgba(0,0,0,0.08)_inset,0_4px_10px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.06)]"
                            >
                                Sign in
                            </Link>
                        </>
                    )}
                </div>
            </div>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                <p className="font-mono text-xs text-zinc-500 tracking-widest uppercase">
                    Open source · Zero knowledge · Your keys, your data
                </p>
            </div>
        </div>
    );
}
