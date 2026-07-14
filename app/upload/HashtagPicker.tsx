"use client";

import { useState } from "react";
import { AVAILABLE_HASHTAGS } from "@/lib/hashtags";

export function HashtagPicker({
    selected,
    onToggle,
    compact = false,
}: {
    selected: string[];
    onToggle: (tag: string) => void;
    compact?: boolean;
}) {
    const [filter, setFilter] = useState("");

    const filtered = filter
        ? AVAILABLE_HASHTAGS.filter((t) => t.toLowerCase().includes(filter.toLowerCase()))
        : AVAILABLE_HASHTAGS;

    return (
        <div>
            <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="search tags…"
                className="w-full text-xs px-2.5 py-1.5 rounded-md border border-[#26262c] bg-[#0a0a0c] placeholder:text-[#5a5a62] outline-none focus:border-[#3a3a42] transition-colors mb-2"
            />
            <div
                className={`flex flex-wrap gap-1.5 overflow-y-auto pr-1 ${compact ? "max-h-24" : "max-h-40"}`}
            >
                {filtered.map((tag) => {
                    const isSelected = selected.includes(tag);
                    return (
                        <button
                            key={tag}
                            type="button"
                            onClick={() => onToggle(tag)}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-colors shrink-0 ${isSelected
                                ? "bg-[#ff3d6e] border-[#ff3d6e] text-white"
                                : "border-[#26262c] text-[#8a8a92] hover:border-[#3a3a42]"
                                }`}
                        >
                            #{tag}
                        </button>
                    );
                })}
                {filtered.length === 0 && (
                    <p className="text-xs text-[#5a5a62] py-1">No matching tags</p>
                )}
            </div>
        </div>
    );
}