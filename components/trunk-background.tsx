"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

export default function TrunkBackground() {
    const backgroundRef = useRef<HTMLDivElement>(null);
    const { resolvedTheme } = useTheme();

    useEffect(() => {
        if (!resolvedTheme) return;

        const isDark = resolvedTheme === "dark";
        let effect: { destroy: () => void } | null = null;
        let cancelled = false;

        async function initVanta() {
            try {
                const p5Module = await import("p5");
                const p5 = p5Module.default;

                const { default: TRUNK } = await import(
                    "vanta/dist/vanta.trunk.min"
                );

                if (cancelled || !backgroundRef.current) return;

                // Vanta expects p5 to be available globally.
                (window as unknown as { p5: typeof p5 }).p5 = p5;

                effect = TRUNK({
                    el: backgroundRef.current,
                    p5,
                    mouseControls: true,
                    touchControls: true,
                    gyroControls: false,
                    minHeight: 200,
                    minWidth: 200,
                    scale: 1.2,
                    scaleMobile: 1,
                    backgroundColor: isDark ? 0x09090b : 0xffffff,
                    color: isDark ? 0x818cf8 : 0x6366f1,
                    spacing: 1.5,
                    chaos: 1.2,
                });
            } catch (error) {
                if (!cancelled) {
                    console.error("Failed to initialize Vanta:", error);
                }
            }
        }

        void initVanta();

        return () => {
            cancelled = true;
            effect?.destroy();
        };
    }, [resolvedTheme]);

    return (
        <div
            ref={backgroundRef}
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-[200px] -right-[200px] z-0 h-[85vh] w-[50vw] bg-white dark:bg-zinc-950"
        />
    );
}
