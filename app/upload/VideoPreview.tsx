"use client";

import { useState, useEffect } from "react";

export function VideoPreview({ file, size = 48 }: { file: File; size?: number }) {
    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        const objectUrl = URL.createObjectURL(file);
        setUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);

    return (
        <video
            src={url ?? undefined}
            className="rounded-md object-cover bg-black shrink-0"
            style={{ width: size, height: size }}
            muted
            playsInline
            preload="metadata"
            onLoadedMetadata={(e) => {
                e.currentTarget.currentTime = 0.1;
            }}
        />
    );
}