"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "clipdrop_upload_secret";

export function getUploadSecret(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEY);
}

export function UploadGate({ children }: { children: React.ReactNode }) {
    const [secret, setSecret] = useState<string | null>(null);
    const [input, setInput] = useState("");
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        setSecret(localStorage.getItem(STORAGE_KEY));
        setChecked(true);
    }, []);

    if (!checked) return null;

    if (!secret) {
        return (
            <div className="max-w-sm mx-auto px-6 py-24">
                <p className="text-sm text-[#8a8a92] mb-4">Enter your upload passcode to continue.</p>
                <input
                    type="password"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="w-full rounded-lg border border-[#26262c] bg-[#141417] px-3.5 py-2.5 text-sm outline-none focus:border-[#3a3a42] transition-colors mb-3"
                    placeholder="passcode"
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && input.trim()) {
                            localStorage.setItem(STORAGE_KEY, input.trim());
                            setSecret(input.trim());
                        }
                    }}
                />
                <button
                    onClick={() => {
                        if (!input.trim()) return;
                        localStorage.setItem(STORAGE_KEY, input.trim());
                        setSecret(input.trim());
                    }}
                    className="w-full rounded-lg bg-[#ff3d6e] text-white text-sm font-semibold py-3 hover:bg-[#ff5580] transition-colors"
                >
                    continue
                </button>
            </div>
        );
    }

    return <>{children}</>;
}