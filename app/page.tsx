import { listClips } from "@/lib/clipStore";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const clips = await listClips();

  return (
    <main className="min-h-screen bg-[#0a0a0c] text-[#f2f2f0]">
      <header className="border-b border-[#1c1c20] px-6 py-4 flex items-center justify-between sticky top-0 bg-[#0a0a0c]/95 backdrop-blur z-10">
        <a href="/" className="font-bold tracking-tight text-lg">
          clip<span className="text-[#ff3d6e]">drop</span>
        </a>
        <a
          href="/upload"
          className="text-sm font-medium px-3.5 py-1.5 rounded-lg bg-[#ff3d6e] text-white hover:bg-[#ff5580] transition-colors"
        >
          make a clip
        </a>
      </header>

      <section className="px-6 pt-12 pb-10 max-w-5xl mx-auto text-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          Clip it. Loop it. <span className="text-[#ff3d6e]">Drop it.</span>
        </h1>
        <p className="text-[#8a8a92] text-sm sm:text-base max-w-md mx-auto">
          Trim any video into a short looping GIF, watermarked and ready to share.
        </p>
      </section>

      <section className="px-6 pb-20 max-w-5xl mx-auto">
        {clips.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {clips.map((clip) => (
              <ClipCard key={clip.clipId} clip={clip} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function ClipCard({
  clip,
}: {
  clip: {
    clipId: string;
    caption: string;
    gifUrl: string;
    width: number;
    height: number;
  };
}) {
  const ratio = clip.width && clip.height ? clip.width / clip.height : 16 / 9;

  return (
    <a
      href={`/c/${clip.clipId}`}
      className="group block rounded-xl overflow-hidden border border-[#26262c] bg-[#111114] hover:border-[#3a3a42] transition-colors"
    >
      <div
        className="relative bg-black"
        style={{ aspectRatio: ratio }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={clip.gifUrl}
          alt={clip.caption || "Clip"}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      {clip.caption && (
        <div className="px-3 py-2.5">
          <p className="text-sm text-[#d4d4d8] truncate">{clip.caption}</p>
        </div>
      )}
    </a>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 rounded-2xl border-2 border-dashed border-[#26262c] text-center">
      <div className="w-12 h-12 rounded-full bg-[#1c1c20] flex items-center justify-center text-xl">
        🎬
      </div>
      <p className="text-sm font-medium">No clips yet</p>
      <p className="text-xs text-[#5a5a62] max-w-xs">
        The gallery fills up as clips get made. Be the first.
      </p>
      <a
        href="/upload"
        className="mt-2 text-sm font-medium px-4 py-2 rounded-lg bg-[#ff3d6e] text-white hover:bg-[#ff5580] transition-colors"
      >
        make a clip
      </a>
    </div>
  );
}
