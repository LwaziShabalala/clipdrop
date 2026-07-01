"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type Stage = "idle" | "uploading" | "trimming" | "generating" | "done" | "error";

interface UploadResult {
  id: string;
  filename: string;
  duration: number;
  width: number;
  height: number;
  previewUrl: string;
}

interface ClipResult {
  clipId: string;
  mp4Url: string;
  gifUrl: string;
  thumbUrl: string;
  pageUrl: string;
  caption: string;
}

const MAX_CLIP_SECONDS = 15;

export default function UploadPage() {
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState("");
  const [upload, setUpload] = useState<UploadResult | null>(null);
  const [clip, setClip] = useState<ClipResult | null>(null);
  const [caption, setCaption] = useState("");
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(3);
  const [currentTime, setCurrentTime] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    setError("");
    setStage("uploading");
    setClip(null);

    const formData = new FormData();
    formData.append("video", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed");
        setStage("error");
        return;
      }

      setUpload(data);
      const clipLen = Math.min(MAX_CLIP_SECONDS, data.duration);
      setStart(0);
      setEnd(clipLen);
      setStage("trimming");
    } catch {
      setError("Upload failed. Check your connection and try again.");
      setStage("error");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleGenerate = async () => {
    if (!upload) return;
    setStage("generating");
    setError("");

    try {
      const res = await fetch("/api/clip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: upload.filename, start, end, caption }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Clip generation failed");
        setStage("error");
        return;
      }

      setClip(data);
      setStage("done");
    } catch {
      setError("Clip generation failed. Try a shorter range.");
      setStage("error");
    }
  };

  const reset = () => {
    setStage("idle");
    setUpload(null);
    setClip(null);
    setCaption("");
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <main className="min-h-screen bg-[#0a0a0c] text-[#f2f2f0]">
      <header className="border-b border-[#1c1c20] px-6 py-4 flex items-center justify-between sticky top-0 bg-[#0a0a0c]/95 backdrop-blur z-10">
        <a href="/" className="font-bold tracking-tight text-lg">
          clip<span className="text-[#ff3d6e]">drop</span>
        </a>
        <a href="/" className="text-xs text-[#5a5a62] hover:text-[#8a8a92] transition-colors">
          ← browse clips
        </a>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {stage === "idle" && (
          <DropZone onDrop={handleDrop} onSelect={handleFileSelect} fileInputRef={fileInputRef} />
        )}

        {stage === "uploading" && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Spinner />
            <p className="text-sm text-[#8a8a92]">uploading video…</p>
          </div>
        )}

        {(stage === "trimming" || stage === "generating") && upload && (
          <TrimEditor
            upload={upload}
            start={start}
            end={end}
            setStart={setStart}
            setEnd={setEnd}
            currentTime={currentTime}
            setCurrentTime={setCurrentTime}
            videoRef={videoRef}
            caption={caption}
            setCaption={setCaption}
            onGenerate={handleGenerate}
            generating={stage === "generating"}
          />
        )}

        {stage === "done" && clip && <ResultPanel clip={clip} onReset={reset} />}

        {stage === "error" && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <p className="text-sm text-[#ff6b8a]">{error}</p>
            <button
              onClick={reset}
              className="text-sm px-4 py-2 rounded-lg border border-[#26262c] hover:border-[#3a3a42] transition-colors"
            >
              try again
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function DropZone({
  onDrop,
  onSelect,
  fileInputRef,
}: {
  onDrop: (e: React.DragEvent) => void;
  onSelect: (file: File) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        setDragOver(false);
        onDrop(e);
      }}
      onClick={() => fileInputRef.current?.click()}
      className={`rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 py-24 cursor-pointer transition-colors ${dragOver ? "border-[#ff3d6e] bg-[#ff3d6e]/[0.04]" : "border-[#26262c] hover:border-[#3a3a42]"
        }`}
    >
      <div className="w-12 h-12 rounded-full bg-[#1c1c20] flex items-center justify-center text-xl">
        ↑
      </div>
      <p className="text-sm font-medium">drop a video, or click to browse</p>
      <p className="text-xs text-[#5a5a62]">mp4, mov, webm · up to 500MB</p>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
        }}
      />
    </div>
  );
}

function TrimEditor({
  upload,
  start,
  end,
  setStart,
  setEnd,
  currentTime,
  setCurrentTime,
  videoRef,
  caption,
  setCaption,
  onGenerate,
  generating,
}: {
  upload: UploadResult;
  start: number;
  end: number;
  setStart: (n: number) => void;
  setEnd: (n: number) => void;
  currentTime: number;
  setCurrentTime: (n: number) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  caption: string;
  setCaption: (s: string) => void;
  onGenerate: () => void;
  generating: boolean;
}) {
  const { duration } = upload;
  const clipLength = end - start;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = start;

    const onTimeUpdate = () => {
      setCurrentTime(v.currentTime);
      if (v.currentTime >= end) {
        v.currentTime = start;
      }
    };
    v.addEventListener("timeupdate", onTimeUpdate);
    return () => v.removeEventListener("timeupdate", onTimeUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end]);

  return (
    <div>
      <div className="rounded-xl overflow-hidden border border-[#26262c] bg-black mb-5">
        <video
          ref={videoRef}
          src={upload.previewUrl}
          muted
          autoPlay
          playsInline
          loop
          className="w-full h-auto block max-h-[420px] mx-auto"
        />
      </div>

      <TrimSlider
        duration={duration}
        start={start}
        end={end}
        currentTime={currentTime}
        onChange={(s, e) => {
          setStart(s);
          setEnd(e);
        }}
      />

      <div className="flex items-center justify-between mt-2 mb-6 font-mono text-xs text-[#6a6a72]">
        <span>{formatTime(start)}</span>
        <span className={clipLength > MAX_CLIP_SECONDS ? "text-[#ff6b8a]" : "text-[#8a8a92]"}>
          {clipLength.toFixed(1)}s selected · max {MAX_CLIP_SECONDS}s
        </span>
        <span>{formatTime(end)}</span>
      </div>

      <input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="caption (optional)"
        className="w-full rounded-lg border border-[#26262c] bg-[#141417] px-3.5 py-2.5 text-sm placeholder:text-[#5a5a62] outline-none focus:border-[#3a3a42] transition-colors mb-5"
        maxLength={120}
      />

      <button
        onClick={onGenerate}
        disabled={generating || clipLength <= 0 || clipLength > MAX_CLIP_SECONDS}
        className="w-full rounded-lg bg-[#ff3d6e] text-white text-sm font-semibold py-3 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#ff5580] transition-colors flex items-center justify-center gap-2"
      >
        {generating ? (
          <>
            <Spinner small /> generating clip…
          </>
        ) : (
          "generate watermarked gif"
        )}
      </button>
    </div>
  );
}

function TrimSlider({
  duration,
  start,
  end,
  currentTime,
  onChange,
}: {
  duration: number;
  start: number;
  end: number;
  currentTime: number;
  onChange: (start: number, end: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);

  const pctToTime = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return pct * duration;
  };

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const t = pctToTime(clientX);

      if (dragging === "start") {
        const newStart = Math.min(t, end - 0.2);
        const clampedStart = Math.max(0, Math.max(newStart, end - MAX_CLIP_SECONDS));
        onChange(clampedStart, end);
      } else {
        const newEnd = Math.max(t, start + 0.2);
        const clampedEnd = Math.min(duration, Math.min(newEnd, start + MAX_CLIP_SECONDS));
        onChange(start, clampedEnd);
      }
    };

    const onUp = () => setDragging(null);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, start, end, duration]);

  const startPct = (start / duration) * 100;
  const endPct = (end / duration) * 100;
  const playheadPct = (currentTime / duration) * 100;

  return (
    <div className="select-none">
      <div ref={trackRef} className="relative h-12 rounded-lg bg-[#141417] border border-[#26262c]">
        <div
          className="absolute top-0 bottom-0 left-0 bg-black/50 rounded-l-lg"
          style={{ width: `${startPct}%` }}
        />
        <div
          className="absolute top-0 bottom-0 right-0 bg-black/50 rounded-r-lg"
          style={{ width: `${100 - endPct}%` }}
        />
        <div
          className="absolute top-0 bottom-0 bg-[#ff3d6e]/15 border-y-2 border-[#ff3d6e]"
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-px bg-white/70"
          style={{ left: `${playheadPct}%` }}
        />
        <div
          onMouseDown={() => setDragging("start")}
          onTouchStart={() => setDragging("start")}
          className="absolute top-0 bottom-0 w-3 -ml-1.5 cursor-ew-resize flex items-center justify-center"
          style={{ left: `${startPct}%` }}
        >
          <div className="w-1.5 h-8 rounded-full bg-[#ff3d6e]" />
        </div>
        <div
          onMouseDown={() => setDragging("end")}
          onTouchStart={() => setDragging("end")}
          className="absolute top-0 bottom-0 w-3 -ml-1.5 cursor-ew-resize flex items-center justify-center"
          style={{ left: `${endPct}%` }}
        >
          <div className="w-1.5 h-8 rounded-full bg-[#ff3d6e]" />
        </div>
      </div>
    </div>
  );
}

function ResultPanel({ clip, onReset }: { clip: ClipResult; onReset: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
  const pageLink = `${siteUrl}${clip.pageUrl}`;
  const gifLink = clip.gifUrl;

  const copy = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div>
      <div className="rounded-xl overflow-hidden border border-[#26262c] bg-black mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={clip.gifUrl} alt="Generated clip preview" className="w-full h-auto block" />
      </div>

      <p className="text-sm text-[#8a8a92] mb-5">
        Done. Post the page link below on Reddit — it pulls this watermarked GIF as the preview
        card. Clicking it brings viewers back to your clip page.
      </p>

      <div className="flex flex-col gap-3 mb-6">
        <LinkRow label="Page link — post this to Reddit" value={pageLink} onCopy={() => copy("page", pageLink)} copied={copied === "page"} accent />
        <LinkRow label="Direct GIF link" value={gifLink} onCopy={() => copy("gif", gifLink)} copied={copied === "gif"} />
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={onReset}
          className="w-full rounded-lg border border-[#26262c] text-sm font-medium py-3 hover:border-[#3a3a42] transition-colors"
        >
          make another clip
        </button>
        <a
          href="/"
          className="w-full text-center rounded-lg text-sm font-medium py-3 text-[#8a8a92] hover:text-[#f2f2f0] transition-colors"
        >
          browse all clips →
        </a>
      </div>
    </div>
  );
}

function LinkRow({
  label,
  value,
  onCopy,
  copied,
  accent,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-[#6a6a72] mb-1.5 font-medium">{label}</p>
      <div
        className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 ${accent ? "border-[#ff3d6e]/40 bg-[#ff3d6e]/[0.06]" : "border-[#26262c] bg-[#141417]"
          }`}
      >
        <code className="text-xs text-[#c8c8cc] truncate flex-1">{value}</code>
        <button
          onClick={onCopy}
          className="text-xs px-2.5 py-1 rounded-md bg-[#1c1c20] hover:bg-[#26262c] transition-colors shrink-0 font-medium"
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>
    </div>
  );
}

function Spinner({ small }: { small?: boolean }) {
  return (
    <div
      className={`${small ? "w-3.5 h-3.5" : "w-6 h-6"} border-2 border-[#3a3a42] border-t-[#ff3d6e] rounded-full animate-spin`}
    />
  );
}

function formatTime(t: number) {
  const m = Math.floor(t / 60);
  const s = (t % 60).toFixed(1);
  return `${m}:${s.padStart(4, "0")}`;
}