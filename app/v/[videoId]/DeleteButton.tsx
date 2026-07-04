"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteButton({ videoId }: { videoId: string }) {
    const router = useRouter();
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm("Delete this video? This can't be undone.")) return;

        setDeleting(true);
        try {
            const res = await fetch(`/api/video/${videoId}`, { method: "DELETE" });

            if (!res.ok) {
                alert("Delete failed");
                setDeleting(false);
                return;
            }

            router.push("/");
        } catch {
            alert("Delete failed. Check your connection.");
            setDeleting(false);
        }
    };

    return (
        <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs font-medium text-[#5a5a62] hover:text-[#ff6b8a] transition-colors disabled:opacity-50"
        >
            {deleting ? "deleting…" : "delete video"}
        </button>
    );
}