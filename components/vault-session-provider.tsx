"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
    clearMasterKey, getServerVaultSession, getVaultSession,
    setVaultUser, subscribeVaultSession,
} from "@/lib/masterKey";

const IDLE_TIMEOUT = 15 * 60 * 1000;

export function VaultSessionProvider({ children }: { children: React.ReactNode }) {
    const { isLoaded, userId } = useAuth();
    const router = useRouter();
    const session = useSyncExternalStore(subscribeVaultSession, getVaultSession, getServerVaultSession);

    useEffect(() => {
        if (isLoaded) setVaultUser(userId ?? null);
    }, [isLoaded, userId]);

    useEffect(() => {
        if (typeof BroadcastChannel === "undefined") return;
        const channel = new BroadcastChannel("0password-vault-reset");
        channel.onmessage = (event: MessageEvent<unknown>) => {
            if (event.data && typeof event.data === "object" && "userId" in event.data && event.data.userId === userId) {
                clearMasterKey();
                router.refresh();
            }
        };
        return () => channel.close();
    }, [userId, router]);

    useEffect(() => {
        if (!session) return;
        let deadline = Date.now() + IDLE_TIMEOUT;
        let timer: ReturnType<typeof setTimeout>;
        const checkDeadline = () => {
            if (Date.now() >= deadline) clearMasterKey();
        };
        const activity = () => {
            if (Date.now() >= deadline) { clearMasterKey(); return; }
            deadline = Date.now() + IDLE_TIMEOUT;
            clearTimeout(timer);
            timer = setTimeout(clearMasterKey, IDLE_TIMEOUT);
        };
        timer = setTimeout(clearMasterKey, IDLE_TIMEOUT);
        window.addEventListener("pointerdown", activity);
        window.addEventListener("keydown", activity);
        window.addEventListener("focus", checkDeadline);
        document.addEventListener("visibilitychange", checkDeadline);
        return () => {
            clearTimeout(timer);
            window.removeEventListener("pointerdown", activity);
            window.removeEventListener("keydown", activity);
            window.removeEventListener("focus", checkDeadline);
            document.removeEventListener("visibilitychange", checkDeadline);
        };
    }, [session]);

    return children;
}
