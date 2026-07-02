"use client";

import { useState } from "react";
import type { ClipRecord } from "@/lib/clipStore";

const PAGE_SIZE = 30;

export function ClipGallery({ clips }: { clips: ClipRecord[] }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  if (clips.length === 0) {
    return <EmptyState />;
  }

  const visible = clips.slice(0, visibleCount);
  const hasMore = visibleCount < clips.length;

  return (
    <div>
      <div className="columns-2 sm:columns-3 lg:columns-4 gap-4">
        {visible.map((clip) => (
          <div key={clip.clipId} className="mb-4 break-inside-avoid">
            <ClipCard clip={clip} />
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
            className="text-sm font-medium px-5 py-2.5 rounded-lg border border-[#26262c] hover:border-[#3a3a42] transition-colors"
          >
            load more ({clips.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}

function ClipCard({ clip }: { clip: ClipRecord }) {
  const ratio = clip.width && clip.height ? clip.width / clip.height : 16 / 9;

  return (
    <a
      href={`/c/${clip.clipId}`}
      className="group block rounded-xl overflow-hidden border border-[#26262c] bg-[#111114] hover:border-[#3a3a42] transition-colors"
    >
      <div className="relative bg-black" style={{ aspectRatio: ratio }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={clip.gifUrl}
          alt={clip.caption || "Clip"}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="px-3 py-2.5">
        {clip.caption && (
          <p className="text-sm text-[#d4d4d8] truncate">{clip.caption}</p>
        )}
        <p className="text-[11px] text-[#5a5a62] mt-0.5">{timeAgo(clip.createdAt)}</p>
      </div>
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

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}
