"use client";

import { useState, useEffect, useRef } from "react";

export function VideoPreview({ file, size = 48 }: { file: File; size?: number }) {
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [inView, setInView] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Only starts working once this preview scrolls into view — same
    // lazy-loading as before.
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true);
                    observer.disconnect();
                }
            },
            { rootMargin: "300px" }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!inView) return;

        let cancelled = false;
        const objectUrl = URL.createObjectURL(file);
        const video = document.createElement("video");
        video.src = objectUrl;
        video.muted = true;
        video.playsInline = true;

        const cleanup = () => {
            URL.revokeObjectURL(objectUrl);
            video.src = "";
        };

        video.addEventListener("loadeddata", () => {
            video.currentTime = 0.1;
        });

        // Captures one still frame onto a canvas, then converts it to a plain
        // image — after this, the actual video element and its blob URL are
        // released completely. Only a lightweight static image sticks around,
        // not a live, resource-holding video player.
        video.addEventListener("seeked", () => {
            if (cancelled) return;
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth || size;
            canvas.height = video.videoHeight || size;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                setThumbnailUrl(canvas.toDataURL("image/jpeg", 0.7));
            }
            cleanup();
        });

        video.addEventListener("error", cleanup);

        return () => {
            cancelled = true;
            cleanup();
        };
    }, [file, inView, size]);

    return (
        <div
            ref={containerRef}
            style={{ width: size, height: size }}
            className="shrink-0 bg-black rounded-md overflow-hidden"
        >
            {thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
            )}
        </div>
    );
}