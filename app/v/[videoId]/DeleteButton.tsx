"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUploadSecret } from "@/app/upload/UploadGate";

export function DeleteButton({ videoId }: { videoId: string }) {
    const router = useRouter();
    const [deleting, setDeleting] = useState(false);
    const [authorized, setAuthorized] = useState(false);

    // Decides its own visibility now — shows up if this browser has the
    // upload passcode stored, same trust check as uploading uses. This
    // replaces the old server-side "is this the Clerk account that
    // uploaded it" check, which no longer has anything reliable to match
    // against since uploads don't go through Clerk anymore.
    useEffect(() => {
        setAuthorized(Boolean(getUploadSecret()));
    }, []);

    const handleDelete = async () => {
        if (!confirm("Delete this video? This can't be undone.")) return;

        setDeleting(true);
        try {
            const res = await fetch(`/api/video/${videoId}`, {
                method: "DELETE",
                headers: { "x-upload-secret": getUploadSecret() ?? "" },
            });

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

    if (!authorized) return null;

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