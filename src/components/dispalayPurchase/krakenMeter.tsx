"use client";

import { useId } from "react";

/** One compact motor per Kraken, filled from left to right. */
export function KrakenMeter({ amount }: { amount: number }) {
    const id = useId();
    const value = Number.isFinite(amount) ? Math.max(0, amount) : 0;
    const motorCount = Math.min(60, Math.max(1, Math.ceil(value)));
    const overflow = Math.max(0, value - motorCount);

    return (
        <div className="kraken-meter" role="img" aria-label={`${value.toFixed(2)} Krakens. Showing up to 60 motors, each representing one Kraken.`}>
            <div className="kraken-meter-motors" aria-hidden="true">
                {Array.from({ length: motorCount }, (_, index) => {
                    const fill = Math.min(1, Math.max(0, value - index));
                    return (
                        <svg key={index} viewBox="0 0 32 20" className="kraken-meter-motor">
                            <defs>
                                <clipPath id={`${id}-${index}`}>
                                    <rect x="2" y="3" width="22" height="14" rx="3" />
                                </clipPath>
                            </defs>
                            <path d="M24 10 H30" stroke="var(--muted-foreground)" strokeWidth="3" />
                            <rect x="2" y="3" width="22" height="14" rx="3" fill="var(--muted)" />
                            <g clipPath={`url(#${id}-${index})`}>
                                <rect className="kraken-meter-fill" x="2" y="3" width={fill * 22} height="14" fill="var(--primary)" />
                            </g>
                            <rect x="2" y="3" width="22" height="14" rx="3" fill="none" stroke="var(--muted-foreground)" />
                        </svg>
                    );
                })}
            </div>
            <span aria-hidden="true" className="text-xs text-muted-foreground">
                {value.toFixed(2)} Krakens{overflow > 0 && ` (+${overflow.toFixed(2)} beyond the motors shown)`}
            </span>
        </div>
    );
}
