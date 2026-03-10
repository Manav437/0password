import Link from "next/link";
import Image from "next/image";
import { SignUp } from "@clerk/nextjs";

export default function Page() {
    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.04)_1px,transparent_1px)] bg-size-[40px_40px]" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-125 w-125 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-100/10 blur-[120px]" />
            <div className="relative z-10 mb-8 flex flex-col items-center">
                <Link href="/">
                    <Image
                        src="/0password-icon.png"
                        alt="0Password"
                        width={32}
                        height={32}
                    />
                </Link>
                <h1 className="text-3xl font-bold text-zinc-800 tracking-tight">
                    0Password
                </h1>
                <span className="text-zinc-500">
                    Create your 0Password account
                </span>
            </div>
            <SignUp
                forceRedirectUrl="/dashboard"
                appearance={{
                    elements: {
                        headerTitle: "hidden",
                        headerSubtitle: "hidden",
                        header: "hidden",
                    },
                }}
            />
        </div>
    );
}
