import Link from "next/link";
import Image from "next/image";
import { SignUp } from "@clerk/nextjs";

export default function Page() {
    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#2c2c2c]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.07),transparent),radial-gradient(ellipse_60%_40%_at_80%_80%,rgba(20,184,166,0.05),transparent),radial-gradient(ellipse_40%_30%_at_20%_70%,rgba(52,211,153,0.04),transparent)]" />{" "}
            <div className="relative z-10 mb-8 flex flex-col items-center">
                <Link href="/">
                    <Image
                        src="/0password-icon.png"
                        alt="0Password"
                        width={32}
                        height={32}
                    />
                </Link>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                    0Password
                </h1>
                <span className="text-white/60">
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
