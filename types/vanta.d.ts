declare module "vanta/dist/vanta.trunk.min" {
    interface TrunkOptions {
        el: HTMLElement;
        p5: typeof import("p5").default;
        mouseControls?: boolean;
        touchControls?: boolean;
        gyroControls?: boolean;
        minHeight?: number;
        minWidth?: number;
        scale?: number;
        scaleMobile?: number;
        backgroundColor?: number;
        color?: number;
        spacing?: number;
        chaos?: number;
    }

    interface TrunkEffect {
        destroy(): void;
    }

    export default function TRUNK(options: TrunkOptions): TrunkEffect;
}
