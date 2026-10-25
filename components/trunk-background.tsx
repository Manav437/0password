// Static tree-ring contours keep the trunk motif without a client-side canvas.
const contours = Array.from({ length: 32 }, (_, ring) => {
    const radius = 5 + ring * 8;
    const points = Array.from({ length: 121 }, (_, step) => {
        const angle = (step / 120) * Math.PI * 2;
        const ripple = (Math.sin(angle * 3 + ring * 0.12) * 9
            + Math.cos(angle * 5 - ring * 0.08) * 5
            + Math.sin(angle * 2 + ring * 0.15) * 12) * Math.min(radius / 80, 1);
        const distance = radius + ripple;
        const x = 300 + Math.cos(angle) * distance;
        const y = 300 + Math.sin(angle) * distance;
        return `${step === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    });
    return `${points.join(" ")} Z`;
});

export default function TrunkBackground() {
    return (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
            <svg
                viewBox="0 0 600 600"
                fill="none"
                focusable="false"
                className="absolute -bottom-32 -right-32 aspect-square w-[24rem] overflow-hidden rounded-full text-indigo-500 opacity-40 [mask-image:radial-gradient(circle,black_55%,transparent_71%)] dark:text-indigo-400 sm:-bottom-40 sm:-right-40 sm:w-[36rem] sm:opacity-70 lg:-bottom-[200px] lg:-right-[200px] lg:w-[max(50vw,36rem)] lg:opacity-100"
            >
                <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    {contours.map((path, index) => (
                        <path key={index} d={path} opacity={Math.min(0.2 + index * 0.12, 1)} />
                    ))}
                </g>
            </svg>
        </div>
    );
}
