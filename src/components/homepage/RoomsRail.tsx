import { ButtonLink } from "@/components/ui/ButtonLink";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RoomCard } from "@/components/rooms/RoomCard";
import type { RoomType } from "@/types/content";

/** Horizontal, natively swipeable rail of room types (CSS scroll-snap, no JS). */
export function RoomsRail({ rooms }: { rooms: RoomType[] }) {
  return (
    <section aria-labelledby="stay-title" className="bg-beige overflow-hidden py-20 md:py-28">
      <div className="container-page flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <SectionHeading
          id="stay-title"
          eyebrow="03 — Stay"
          title="Cottages and rooms for every kind of trip"
          intro="Simple, comfortable spaces with views of the hills — whether you are travelling as a couple, with friends or with the whole family."
        />
        <ButtonLink href="/rooms" variant="secondary" className="shrink-0 self-start md:self-auto">
          View all rooms
        </ButtonLink>
      </div>

      <div className="container-page mt-12">
        <ul
          className="-mx-4 flex snap-x snap-mandatory scroll-px-4 [scrollbar-width:thin] gap-5 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:scroll-px-8 sm:px-8 md:gap-8 xl:mx-0 xl:grid xl:grid-cols-3 xl:overflow-visible xl:px-0"
          aria-label="Room types"
        >
          {rooms.map((room) => (
            <li key={room.slug} className="w-[82%] shrink-0 snap-start sm:w-[45%] xl:w-auto" data-reveal>
              <RoomCard room={room} sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 82vw" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
