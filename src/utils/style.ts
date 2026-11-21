import type { CSSProperties } from "react";

/** Staggers a `data-reveal` element's entrance animation. */
export const revealDelay = (ms: number): CSSProperties => ({ "--reveal-delay": `${ms}ms` }) as CSSProperties;
