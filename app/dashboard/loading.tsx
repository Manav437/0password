import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="p-6 space-y-8">
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>

            <Skeleton className="h-10 w-full max-w-md rounded-xl" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="p-4 border rounded-xl space-y-4">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-8 w-8 rounded" />
                            <Skeleton className="h-6 w-24" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-4 w-full" />
                        </div>
                        <Skeleton className="h-9 w-full rounded-md" />
                    </div>
                ))}
            </div>
        </div>
    );
}
