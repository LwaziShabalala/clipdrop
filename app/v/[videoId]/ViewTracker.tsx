"use client";

import { useEffect } from "react";

function hasAlreadyViewed(videoId: string): boolean {
    try {
        return localStorage.getItem(`viewed:${videoId}`) !== null;
    } catch {
        return false;
    }
}

function markViewed(videoId: string) {
    try {
        localStorage.setItem(`viewed:${videoId}`, "1");
    } catch {
        // localStorage unavailable — worst case this browser can recount once
    }
}

export function ViewTracker({ videoId }: { videoId: string }) {
    useEffect(() => {
        if (hasAlreadyViewed(videoId)) return;

        fetch(`/api/video/${videoId}/view`, { method: "POST" })
            .then(() => markViewed(videoId))
            .catch(() => { });
    }, [videoId]);

    return null;
}