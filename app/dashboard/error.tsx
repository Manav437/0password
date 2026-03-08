"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw } from "lucide-react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service like Sentry
        console.error(error);
    }, [error]);

    return (
        <div className="flex h-[70vh] flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 rounded-full bg-red-50 p-4 dark:bg-red-900/10">
                <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
                Something went wrong!
            </h2>
            <p className="mt-2 mb-8 max-w-md text-muted-foreground">
                We encountered an error while loading your vault. This could be
                due to a connection issue or an expired session.
            </p>
            <div className="flex gap-4">
                <Button onClick={() => reset()} className="gap-2">
                    <RefreshCcw size={16} />
                    Try Again
                </Button>
                <Button variant="outline" asChild>
                    <a href="mailto:support@0password.com">Report Issue</a>
                </Button>
            </div>
        </div>
    );
}
