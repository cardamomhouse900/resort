type Props = {
  eyebrow?: string;
  title: string;
  intro?: string;
  align?: "left" | "center";
  as?: "h1" | "h2";
  tone?: "dark" | "light";
  className?: string;
  /** id on the heading, for `aria-labelledby` on the parent section. */
  id?: string;
};

/** Eyebrow label + serif heading + optional intro paragraph. */
export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = "left",
  as: Tag = "h2",
  tone = "dark",
  className = "",
  id,
}: Props) {
  const center = align === "center" ? "mx-auto text-center" : "";
  return (
    <div className={`max-w-2xl ${center} ${className}`} data-reveal>
      {eyebrow && <p className={`eyebrow ${tone === "light" ? "text-beige!" : ""}`}>{eyebrow}</p>}
      <Tag id={id} className={`text-h2 mt-3 ${tone === "light" ? "text-cream!" : ""}`}>
        {title}
      </Tag>
      {intro && (
        <p className={`mt-5 text-lg ${tone === "light" ? "text-cream/85" : "text-ink-muted"}`}>{intro}</p>
      )}
    </div>
  );
}
