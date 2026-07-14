"use client";

import { useState, useCallback, useEffect } from "react";
import { HashtagPicker } from "@/app/upload/HashtagPicker";
import { VideoPreview } from "@/app/upload/VideoPreview";

type FileStatus = "pending" | "uploading" | "done" | "error";

interface QueueItem {
  file: File;
  hashtags: string[];
  status: FileStatus;
  progress: number;
  videoId?: string;
  error?: string;
}

type Stage = "select" | "review";

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

export default function BulkUploadPage() {
  const [stage, setStage] = useState<Stage>("select");
  const [items, setItems] = useState<QueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFilesSelected = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith("video/"));
    if (fileArray.length === 0) return;

    const newItems: QueueItem[] = fileArray.map((file) => ({
      file,
      hashtags: [],
      status: "pending",
      progress: 0,
    }));

    setItems(newItems);
    setStage("review");
  }, []);

  const toggleHashtag = (index: number, tag: string) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const has = item.hashtags.includes(tag);
        return {
          ...item,
          hashtags: has ? item.hashtags.filter((t) => t !== tag) : [...item.hashtags, tag],
        };
      })
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const retryItem = (index: number) => {
    setItems((prev) =>
      prev.map((it, i) =>
        i === index ? { ...it, status: "pending", error: undefined, progress: 0 } : it
      )
    );
  };

  const uploadAttempt = async (
    index: number,
    item: QueueItem
  ): Promise<{ success: boolean; videoId?: string; error?: string }> => {
    try {
      const initRes = await fetch("/api/upload/init", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: item.file.name,
          contentType: item.file.type,
          size: item.file.size,
        }),
      });
      const initData = await initRes.json();
      if (!initRes.ok) {
        return { success: false, error: initData.error || "Upload failed" };
      }
      const { videoId, uploadUrl, key } = initData as {
        videoId: string;
        uploadUrl: string;
        key: string;
      };

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 90);
            setItems((prev) => prev.map((it, i) => (i === index ? { ...it, progress: pct } : it)));
          }
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error("Upload to storage failed"));
        });
        xhr.addEventListener("error", () => reject(new Error("Network error")));
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", item.file.type);
        xhr.send(item.file);
      });

      setItems((prev) => prev.map((it, i) => (i === index ? { ...it, progress: 95 } : it)));

      const finalizeRes = await fetch("/api/upload/finalize", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, key, hashtags: item.hashtags }),
      });
      const finalizeData = await finalizeRes.json();

      if (!finalizeRes.ok) {
        return { success: false, error: finalizeData.error || "Processing failed" };
      }

      return { success: true, videoId: finalizeData.videoId };
    } catch {
      return { success: false, error: "Network error" };
    }
  };

  // Uploads exactly one video — whichever is next in line — then stops and
  // waits. No automatic chaining to the next one; that's the whole point.
  const uploadNext = async () => {
    const nextIndex = items.findIndex((it) => it.status === "pending");
    if (nextIndex === -1) return;

    setIsUploading(true);
    setItems((prev) =>
      prev.map((it, i) => (i === nextIndex ? { ...it, status: "uploading", progress: 0 } : it))
    );

    const targetItem = items[nextIndex];
    let result: { success: boolean; videoId?: string; error?: string } = { success: false };

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      result = await uploadAttempt(nextIndex, targetItem);
      if (result.success) break;

      if (attempt < MAX_RETRIES) {
        setItems((prev) =>
          prev.map((it, i) =>
            i === nextIndex
              ? { ...it, error: `Retrying (attempt ${attempt + 2} of ${MAX_RETRIES + 1})…` }
              : it
          )
        );
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }

    if (result.success) {
      setItems((prev) =>
        prev.map((it, i) =>
          i === nextIndex
            ? { ...it, status: "done", progress: 100, videoId: result.videoId, error: undefined }
            : it
        )
      );
    } else {
      setItems((prev) =>
        prev.map((it, i) =>
          i === nextIndex ? { ...it, status: "error", error: result.error || "Upload failed" } : it
        )
      );
    }

    setIsUploading(false);
  };

  const reset = () => {
    setItems([]);
    setStage("select");
  };

  const pendingCount = items.filter((i) => i.status === "pending").length;
  const doneCount = items.filter((i) => i.status === "done").length;
  const errorCount = items.filter((i) => i.status === "error").length;
  const allSettled = items.length > 0 && pendingCount === 0;

  return (
    <main className="min-h-screen bg-[#0a0a0c] text-[#f2f2f0]">
      <header className="border-b border-[#1c1c20] px-6 py-4 flex items-center justify-between sticky top-0 bg-[#0a0a0c]/95 backdrop-blur z-10">
        <a href="/" className="font-bold tracking-tight text-lg">
          clip<span className="text-[#ff3d6e]">drop</span>
        </a>
        <a href="/upload" className="text-xs text-[#5a5a62] hover:text-[#8a8a92] transition-colors">
          single upload →
        </a>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-lg font-semibold mb-1">Bulk upload</h1>
        <p className="text-sm text-[#8a8a92] mb-8">
          Select multiple videos and tag each one, then upload them one at a time — you decide
          when each one starts.
        </p>

        {stage === "select" && (
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFilesSelected(e.dataTransfer.files);
            }}
            className="rounded-2xl border-2 border-dashed border-[#26262c] hover:border-[#3a3a42] flex flex-col items-center justify-center gap-3 py-24 cursor-pointer transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-[#1c1c20] flex items-center justify-center text-xl">
              ↑
            </div>
            <p className="text-sm font-medium">drop multiple videos, or click to browse</p>
            <p className="text-xs text-[#5a5a62]">mp4, mov, webm · up to 500MB each</p>
            <input
              type="file"
              accept="video/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                if (e.target.files) handleFilesSelected(e.target.files);
              }}
            />
          </label>
        )}

        {stage === "review" && (
          <div>
            <div className="flex flex-col gap-3 mb-6">
              {items.map((item, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-[#26262c] bg-[#141417] px-3.5 py-3"
                >
                  <div className="flex items-start gap-3">
                    <VideoPreview file={item.file} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-[#5a5a62] truncate">{item.file.name}</p>
                        {item.status === "pending" && (
                          <button
                            onClick={() => removeItem(i)}
                            className="text-xs text-[#5a5a62] hover:text-[#ff6b8a] transition-colors shrink-0 ml-2"
                          >
                            remove
                          </button>
                        )}
                      </div>

                      {item.status === "pending" && (
                        <HashtagPicker
                          selected={item.hashtags}
                          onToggle={(tag) => toggleHashtag(i, tag)}
                          compact
                        />
                      )}

                      {item.status === "uploading" && (
                        <div>
                          <div className="w-full h-1 rounded-full bg-[#1c1c20] overflow-hidden">
                            <div
                              className="h-full bg-[#ff3d6e] transition-all duration-150"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                          {item.error && (
                            <p className="text-[11px] text-[#8a8a92] mt-1">{item.error}</p>
                          )}
                        </div>
                      )}

                      {item.status === "done" && (
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-[#4ade80]">✓ uploaded</p>
                          {item.videoId && (
                            <a
                              href={`/v/${item.videoId}`}
                              className="text-xs px-2.5 py-1 rounded-md bg-[#1c1c20] hover:bg-[#26262c] transition-colors font-medium"
                            >
                              view →
                            </a>
                          )}
                        </div>
                      )}

                      {item.status === "error" && (
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-[#ff6b8a] truncate">{item.error}</p>
                          <button
                            onClick={() => retryItem(i)}
                            className="text-xs px-2.5 py-1 rounded-md bg-[#1c1c20] hover:bg-[#26262c] transition-colors shrink-0 font-medium"
                          >
                            retry
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!allSettled ? (
              <button
                onClick={uploadNext}
                disabled={isUploading || pendingCount === 0}
                className="w-full rounded-lg bg-[#ff3d6e] text-white text-sm font-semibold py-3 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#ff5580] transition-colors"
              >
                {isUploading ? "uploading…" : `upload next (${pendingCount} remaining)`}
              </button>
            ) : (
              <div>
                <p className="text-sm mb-4">
                  Done — <span className="text-[#f2f2f0] font-medium">{doneCount} uploaded</span>
                  {errorCount > 0 && <span className="text-[#ff6b8a]"> · {errorCount} failed</span>}
                </p>
                <button
                  onClick={reset}
                  className="w-full rounded-lg border border-[#26262c] text-sm font-medium py-3 hover:border-[#3a3a42] transition-colors"
                >
                  upload more
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}