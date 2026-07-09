"use client";

import { useEffect } from "react";

declare global {
    interface Window {
        AdProvider?: unknown[];
    }
}

export function ExoclickBanner({ zoneId }: { zoneId: string }) {
    useEffect(() => {
        // Tells the shared ad-provider.js library (loaded once in the root
        // layout) to scan the page and fill any pending <ins> placeholders,
        // including this one.
        window.AdProvider = window.AdProvider || [];
        window.AdProvider.push({ serve: {} });
    }, [zoneId]);

    return <ins className="eas6a97888e2" data-zoneid={zoneId} />;
}