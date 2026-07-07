"use client";

import { usePathname } from "next/navigation";

const navItems = [
    { href: "/", label: "Home", Icon: HomeIcon },
    { href: "/upload", label: "Upload", Icon: UploadIcon },
];

export function SideNav() {
    const pathname = usePathname();

    return (
        <nav
            className="hidden lg:flex lg:flex-col justify-center gap-1 px-4 shrink-0 border-r border-[#1c1c20]"
            style={{ width: 240 }}
        >
            {navItems.map(({ href, label, Icon }) => {
                const isActive = pathname === href;
                return (
                    <a
                        key={href}
                        href={href}
                        className={`flex items-center justify-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                ? "bg-[#ff3d6e]/10 text-[#f2f2f0]"
                                : "text-[#8a8a92] hover:bg-[#141417] hover:text-[#f2f2f0]"
                            }`}
                    >
                        <Icon />
                        {label}
                    </a>
                );
            })}
        </nav>
    );
}

function HomeIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
    );
}

function UploadIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
    );
}