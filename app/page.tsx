import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function Home() {
    return (
        <div className="flex min-h-screen items-center justify-center gap-4 bg-zinc-50 font-sans dark:bg-black">
            <Button asChild variant="outline" className="group">
                <Link href="/sign-up">
                    Sign Up
                    <ChevronRight className=" h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
            </Button>

            <Button asChild variant="outline" className="group">
                <Link href="/sign-in">
                    Sign In
                    <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
            </Button>
        </div>
    );
}
