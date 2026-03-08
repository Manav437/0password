import Image from "next/image";
import { SignUp } from "@clerk/nextjs";

export default function Page() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] bg-[radial-gradient(#ffffff10_1px,transparent_1px)] [bg-size:20px_20px]">
            <div className="mb-8 flex flex-col items-center">
                <Image
                    src="/0password-icon.png"
                    alt="0Password"
                    width={32}
                    height={32}
                />
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
