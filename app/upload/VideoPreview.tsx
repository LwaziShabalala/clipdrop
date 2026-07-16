"use client";

import { useState, useEffect, useRef } from "react";

export function VideoPreview({ file, size = 48 }: { file: File; size?: number }) {
    const [url, setUrl] = useState<string | null>(null);
    const [inView, setInView] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Only starts loading once this specific preview scrolls into view —
    // with several videos selected at once, having every single one try to
    // load its frame simultaneously was overwhelming the browser, which is
    // exactly what was causing the slow previews and blocked scrolling.
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
            { rootMargin: "200px" }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!inView) return;
        const objectUrl = URL.createObjectURL(file);
        setUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [file, inView]);

    return (
        <div ref={containerRef} style={{ width: size, height: size }} className="shrink-0 bg-black rounded-md overflow-hidden">
            {url && (
                <video
                    src={url}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                    onLoadedMetadata={(e) => {
                        e.currentTarget.currentTime = 0.1;
                    }}
                />
            )}
        </div>
    );
}