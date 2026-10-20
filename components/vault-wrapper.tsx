"use client";

import { useAuth } from "@clerk/nextjs";
import { useSyncExternalStore } from "react";
import { getServerVaultSession, getVaultGeneration, getVaultSession, subscribeVaultSession } from "@/lib/masterKey";
import { UnlockVault } from "./unlock-vault";

const serverGeneration = () => 0;

export function VaultWrapper({ children }: { children: React.ReactNode }) {
    const { isLoaded, userId } = useAuth();
    const session = useSyncExternalStore(subscribeVaultSession, getVaultSession, getServerVaultSession);
    const generation = useSyncExternalStore(subscribeVaultSession, getVaultGeneration, serverGeneration);

    if (!isLoaded || !userId) {
        return <p role="status" className="p-8 text-center">Checking your session…</p>;
    }

    if (!session || session.userId !== userId) {
        return <UnlockVault key={`${userId}:${generation}`} userId={userId} />;
    }
    return <>{children}</>;
}
