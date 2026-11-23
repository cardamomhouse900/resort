import Image from "next/image";
import Link from "next/link";
import { EmptyState, LinkButton, PageHeader, Pill } from "./ui";

export type ContentListItem = {
  id: string;
  title: string;
  subtitle?: string;
  image?: string | null;
  isActive: boolean;
  isPlaceholder?: boolean;
  badge?: string;
};

/** Generic list page body for website content types. */
export function ContentList({
  title,
  description,
  basePath,
  addLabel,
  items,
  deleted,
}: {
  title: string;
  description: string;
  basePath: string;
  addLabel: string;
  items: ContentListItem[];
  deleted?: boolean;
}) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={<LinkButton href={`${basePath}/new`}>{addLabel}</LinkButton>}
      />
      {deleted && (
        <p role="status" className="bg-forest/10 text-forest mb-6 rounded-lg px-4 py-3 text-sm">
          Deleted.
        </p>
      )}
      {items.length === 0 ? (
        <EmptyState>Nothing here yet.</EmptyState>
      ) : (
        <ul className="border-line divide-line divide-y rounded-2xl border bg-white">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`${basePath}/${item.id}`}
                className="hover:bg-beige/30 flex items-center gap-4 px-4 py-3"
              >
                <div className="bg-beige relative size-14 shrink-0 overflow-hidden rounded-md">
                  {item.image && <Image src={item.image} alt="" fill sizes="56px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`font-medium ${item.isActive ? "text-forest" : "text-ink-muted"}`}>
                    {item.title}
                  </p>
                  {item.subtitle && <p className="text-ink-muted line-clamp-1 text-sm">{item.subtitle}</p>}
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                  {item.badge && <Pill>{item.badge}</Pill>}
                  {!item.isActive && <Pill tone="brown">Hidden</Pill>}
                  {item.isPlaceholder && <Pill>Sample</Pill>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function EditPageHeader({
  backHref,
  backLabel,
  title,
  created,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  created?: boolean;
}) {
  return (
    <>
      <p className="mb-2 text-sm">
        <Link href={backHref} className="text-forest hover:underline">
          ← {backLabel}
        </Link>
      </p>
      <PageHeader title={title} />
      {created && (
        <p role="status" className="bg-forest/10 text-forest mb-6 rounded-lg px-4 py-3 text-sm">
          Created and published to the website.
        </p>
      )}
    </>
  );
}
