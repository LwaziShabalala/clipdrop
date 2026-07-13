"use client";

import { useState, useRef, useCallback } from "react";

type FileStatus = "pending" | "uploading" | "done" | "error";

interface QueueItem {
  file: File;
  title: string;
  status: FileStatus;
  progress: number;
  videoId?: string;
  error?: string;
}

type Stage = "select" | "queue" | "uploading" | "done";

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

export default function BulkUploadPage() {
  const [stage, setStage] = useState<Stage>("select");
  const [items, setItems] = useState<QueueItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith("video/"));
    if (fileArray.length === 0) return;

    const newItems: QueueItem[] = fileArray.map((file) => ({
      file,
      title: file.name.replace(/\.[^/.]+$/, ""),
      status: "pending",
      progress: 0,
    }));

    setItems(newItems);
    setStage("queue");
  }, []);

  const updateTitle = (index: number, title: string) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, title } : item)));
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // One raw attempt — plain cookie-based auth, same as the regular
  // single-upload page (which reliably works), no manual token handling.
  const uploadAttempt = (
    index: number
  ): Promise<{ success: boolean; videoId?: string; error?: string }> => {
    return new Promise((resolve) => {
      const item = items[index];
      const formData = new FormData();
      formData.append("video", item.file);
      formData.append("title", item.title.trim());

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setItems((prev) =>
            prev.map((it, i) => (i === index ? { ...it, progress: pct } : it))
          );
        }
      });

      xhr.addEventListener("load", () => {
        let data: { videoId?: string; error?: string } = {};
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          data = { error: "Upload failed" };
        }

        if (xhr.status >= 200 && xhr.status < 300 && data.videoId) {
          resolve({ success: true, videoId: data.videoId });
        } else {
          resolve({ success: false, error: data.error || "Upload failed" });
        }
      });

      xhr.addEventListener("error", () => {
        resolve({ success: false, error: "Network error" });
      });

      xhr.open("POST", "/api/upload");
      xhr.send(formData);
    });
  };

  // Retries automatically on failure — a transient hiccup on one attempt
  // doesn't permanently fail that file, it just tries again a couple of
  // times with a short pause first.
  const uploadOne = async (index: number): Promise<void> => {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, status: "uploading", progress: 0 } : it))
    );

    let result: { success: boolean; videoId?: string; error?: string } = { success: false };

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      result = await uploadAttempt(index);
      if (result.success) break;

      if (attempt < MAX_RETRIES) {
        setItems((prev) =>
          prev.map((it, i) =>
            i === index ? { ...it, error: `Retrying (attempt ${attempt + 2} of ${MAX_RETRIES + 1})…` } : it
          )
        );
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }

    if (result.success) {
      setItems((prev) =>
        prev.map((it, i) =>
          i === index
            ? { ...it, status: "done", progress: 100, videoId: result.videoId, error: undefined }
            : it
        )
      );
    } else {
      setItems((prev) =>
        prev.map((it, i) =>
          i === index ? { ...it, status: "error", error: result.error || "Upload failed" } : it
        )
      );
    }
  };

  const startBulkUpload = async () => {
    setStage("uploading");
    for (let i = 0; i < items.length; i++) {
      await uploadOne(i);
    }
    setStage("done");
  };

  const reset = () => {
    setItems([]);
    setStage("select");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const doneCount = items.filter((i) => i.status === "done").length;
  const errorCount = items.filter((i) => i.status === "error").length;

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
          Select multiple videos, adjust titles if you want, then upload them all in one go.
        </p>

        {stage === "select" && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFilesSelected(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-2xl border-2 border-dashed border-[#26262c] hover:border-[#3a3a42] flex flex-col items-center justify-center gap-3 py-24 cursor-pointer transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-[#1c1c20] flex items-center justify-center text-xl">
              ↑
            </div>
            <p className="text-sm font-medium">drop multiple videos, or click to browse</p>
            <p className="text-xs text-[#5a5a62]">mp4, mov, webm · up to 500MB each</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFilesSelected(e.target.files);
              }}
            />
          </div>
        )}

        {stage === "queue" && (
          <div>
            <div className="flex flex-col gap-2 mb-6">
              {items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-[#26262c] bg-[#141417] px-3.5 py-2.5"
                >
                  <input
                    value={item.title}
                    onChange={(e) => updateTitle(i, e.target.value)}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#5a5a62]"
                    maxLength={100}
                  />
                  <button
                    onClick={() => removeItem(i)}
                    className="text-xs text-[#5a5a62] hover:text-[#ff6b8a] transition-colors shrink-0"
                  >
                    remove
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#5a5a62] mb-4">
              {items.length} video{items.length !== 1 ? "s" : ""} ready
            </p>
            <button
              onClick={startBulkUpload}
              disabled={items.length === 0}
              className="w-full rounded-lg bg-[#ff3d6e] text-white text-sm font-semibold py-3 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#ff5580] transition-colors"
            >
              upload all {items.length}
            </button>
          </div>
        )}

        {stage === "uploading" && (
          <div className="flex flex-col gap-2">
            {items.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-[#26262c] bg-[#141417] px-3.5 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{item.title || item.file.name}</p>
                  {item.status === "uploading" && (
                    <div className="w-full h-1 rounded-full bg-[#1c1c20] overflow-hidden mt-1.5">
                      <div
                        className="h-full bg-[#ff3d6e] transition-all duration-150"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                  {item.error && item.status === "uploading" && (
                    <p className="text-[11px] text-[#8a8a92] mt-1">{item.error}</p>
                  )}
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>
        )}

        {stage === "done" && (
          <div>
            <p className="text-sm mb-6">
              Done — <span className="text-[#f2f2f0] font-medium">{doneCount} uploaded</span>
              {errorCount > 0 && <span className="text-[#ff6b8a]"> · {errorCount} failed</span>}
            </p>
            <div className="flex flex-col gap-2 mb-6">
              {items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-[#26262c] bg-[#141417] px-3.5 py-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{item.title || item.file.name}</p>
                    {item.status === "error" && (
                      <p className="text-xs text-[#ff6b8a] mt-0.5">{item.error}</p>
                    )}
                  </div>
                  {item.status === "done" && item.videoId ? (
                    <a
                      href={`/v/${item.videoId}`}
                      className="text-xs px-2.5 py-1 rounded-md bg-[#1c1c20] hover:bg-[#26262c] transition-colors shrink-0 font-medium"
                    >
                      view →
                    </a>
                  ) : (
                    <StatusBadge status={item.status} />
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={reset}
              className="w-full rounded-lg border border-[#26262c] text-sm font-medium py-3 hover:border-[#3a3a42] transition-colors"
            >
              upload more
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: FileStatus }) {
  const styles: Record<FileStatus, string> = {
    pending: "text-[#5a5a62]",
    uploading: "text-[#ff3d6e]",
    done: "text-[#4ade80]",
    error: "text-[#ff6b8a]",
  };
  const labels: Record<FileStatus, string> = {
    pending: "waiting",
    uploading: "uploading…",
    done: "✓ done",
    error: "✗ failed",
  };
  return (
    <span className={`text-xs font-medium shrink-0 ${styles[status]}`}>{labels[status]}</span>
  );
}