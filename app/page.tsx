import { listClips } from "@/lib/clipStore";
import { ClipGallery } from "./ClipGallery";

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

      <section className="px-6 pt-10 pb-8 max-w-5xl mx-auto text-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          Clip it. Loop it. <span className="text-[#ff3d6e]">Drop it.</span>
        </h1>
        <p className="text-[#8a8a92] text-sm sm:text-base max-w-md mx-auto">
          Trim any video into a short looping GIF, watermarked and ready to share.
        </p>
        {clips.length > 0 && (
          <p className="text-[#4a4a52] text-xs mt-4">
            {clips.length.toLocaleString()} clip{clips.length === 1 ? "" : "s"} dropped so far
          </p>
        )}
      </section>

      <section className="px-6 pb-20 max-w-6xl mx-auto">
        <ClipGallery clips={clips} />
      </section>
    </main>
  );
}
