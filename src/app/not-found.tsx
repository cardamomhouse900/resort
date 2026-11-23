import Link from "next/link";

export default function NotFound() {
  return (
    <main className="bg-forest text-cream flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <p className="eyebrow text-beige!">Page not found</p>
      <h1 className="text-h1 text-cream! mt-4">This trail doesn&apos;t lead anywhere.</h1>
      <p className="text-cream/85 mt-4 max-w-md">
        The page you were looking for may have moved. Let&apos;s get you back on the path.
      </p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="bg-cream text-forest inline-flex min-h-12 items-center justify-center rounded-full px-7 font-semibold hover:bg-white"
        >
          Back to the homepage
        </Link>
        <Link
          href="/rooms"
          className="text-cream ring-cream/50 hover:bg-cream/10 inline-flex min-h-12 items-center justify-center rounded-full px-7 font-semibold ring-1"
        >
          View rooms
        </Link>
      </div>
    </main>
  );
}
