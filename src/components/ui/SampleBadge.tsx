import { showSampleBadges } from "@/config/site";

/**
 * Marks placeholder content/images during development.
 * Hidden when NEXT_PUBLIC_SHOW_SAMPLE_BADGES is not "true".
 */
export function SampleBadge({ label = "Sample", className = "" }: { label?: string; className?: string }) {
  if (!showSampleBadges) return null;
  return (
    <span
      className={`bg-earth inline-flex items-center rounded-full px-2.5 py-0.5 font-sans text-[0.6875rem] font-semibold tracking-wider text-white uppercase ${className}`}
      title="Temporary placeholder — replace with real resort content"
    >
      {label}
    </span>
  );
}
