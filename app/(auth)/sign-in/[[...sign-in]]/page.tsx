import { SignIn } from "@clerk/nextjs";

export default function Page() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] bg-[radial-gradient(#ffffff10_1px,transparent_1px)] [background-size:20px_20px]">
            <div className="mb-8 flex flex-col items-center">
                <h1 className="text-3xl font-bold text-white tracking-tight">
                    0Password
                </h1>
                <p className="text-zinc-400">Unlock your digital vault</p>
            </div>

            <SignIn forceRedirectUrl="/dashboard" />
        </div>
    );
}
