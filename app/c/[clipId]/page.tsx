import type { Metadata } from "next";
import { getClip } from "@/lib/clipStore";
import { notFound } from "next/navigation";
import { getPostHogClient } from "@/lib/posthog-server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ clipId: string }>;
}): Promise<Metadata> {
  const { clipId } = await params;
  const clip = await getClip(clipId);

  if (!clip) {
    return { title: "Clip not found" };
  }

  const title = clip.caption || "Untitled clip — ClipDrop";
  const pageUrl = `${SITE_URL}/c/${clip.clipId}`;
  const gifAbsUrl = clip.gifUrl;
  const mp4AbsUrl = clip.mp4Url;

  return {
    title,
    openGraph: {
      title,
      type: "video.other",
      url: pageUrl,
      videos: [
        {
          url: mp4AbsUrl,
          secureUrl: mp4AbsUrl,
          type: "video/mp4",
          width: clip.width,
          height: clip.height,
        },
      ],
      images: [
        {
          url: clip.thumbUrl,
          width: clip.width,
          height: clip.height,
        },
        {
          url: gifAbsUrl,
          width: clip.width,
          height: clip.height,
        },
      ],
    },
    twitter: {
      card: "player",
      title,
      images: [clip.thumbUrl],
      players: [
        {
          playerUrl: mp4AbsUrl,
          streamUrl: mp4AbsUrl,
          width: clip.width,
          height: clip.height,
        },
      ],
    },
  };
}

export default async function ClipPage({
  params,
}: {
  params: Promise<{ clipId: string }>;
}) {
  const { clipId } = await params;
  const clip = await getClip(clipId);

  if (!clip) notFound();

  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: clip.clipId,
    event: "clip_page_viewed",
    properties: {
      clip_id: clip.clipId,
      has_caption: clip.caption.length > 0,
    },
  });

  const gifAbsUrl = clip.gifUrl;

  return (
    <main className="min-h-screen bg-[#0a0a0c] text-[#f2f2f0] flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <a href="/" className="inline-flex items-center gap-2 text-sm text-[#8a8a92] hover:text-[#f2f2f0] mb-6 transition-colors">
          ← back to all clips
        </a>

        <div className="rounded-xl overflow-hidden border border-[#26262c] bg-black">
          <video
            src={clip.mp4Url}
            controls
            autoPlay
            loop
            playsInline
            className="w-full h-auto block"
          />
        </div>

        {clip.caption && (
          <h1 className="text-xl font-semibold mt-5 mb-1 text-[#f2f2f0]">{clip.caption}</h1>
        )}

        <div className="flex flex-wrap items-center gap-2 mt-4">
          <CopyField label="GIF link (for Reddit)" value={gifAbsUrl} accent />
          <CopyField label="Page link (share this)" value={`${SITE_URL}/c/${clip.clipId}`} />
        </div>

        <p className="text-xs text-[#5a5a62] mt-6 leading-relaxed">
          Paste the GIF link on Reddit — it posts as a native image and loops automatically,
          no click needed. Use the page link everywhere else (Discord, Twitter, forums) — it
          pulls a preview card that links back here.
        </p>
      </div>
    </main>
  );
}

function CopyField({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex-1 min-w-[260px]">
      <p className="text-[11px] uppercase tracking-wide text-[#6a6a72] mb-1.5 font-medium">{label}</p>
      <div
        className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 ${accent ? "border-[#ff3d6e]/40 bg-[#ff3d6e]/[0.06]" : "border-[#26262c] bg-[#141417]"
          }`}
      >
        <code className="text-xs text-[#c8c8cc] truncate flex-1">{value}</code>
      </div>
    </div>
  );
}