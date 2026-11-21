import Link from "next/link";
import { BedDouble, Users } from "lucide-react";
import { Photo } from "@/components/ui/Photo";
import type { RoomType } from "@/types/content";
import { formatINR } from "@/utils/format";

/** Compact room preview used in the homepage rail. */
export function RoomCard({ room, sizes }: { room: RoomType; sizes: string }) {
  return (
    <article className="group relative flex h-full flex-col">
      <Photo
        image={room.images[0]}
        sizes={sizes}
        className="aspect-[4/5] rounded-sm"
        imgClassName="transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        compactBadge
      />
      <div className="mt-5 flex flex-1 flex-col">
        <h3 className="text-h3">
          <Link href={`/rooms/${room.slug}`} className="after:absolute after:inset-0">
            {room.name}
          </Link>
        </h3>
        <p className="text-ink-muted mt-2 line-clamp-2">{room.summary}</p>
        <div className="text-ink-muted mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-4" aria-hidden="true" /> Up to {room.maxOccupancy} guests
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BedDouble className="size-4" aria-hidden="true" /> {room.bedConfiguration.split(" (")[0]}
          </span>
        </div>
        <p className="text-forest mt-4">
          <span className="text-ink-muted text-sm">From </span>
          <span className="font-serif text-2xl font-semibold">{formatINR(room.pricePerNight)}</span>
          <span className="text-ink-muted text-sm"> / night</span>
        </p>
      </div>
    </article>
  );
}
