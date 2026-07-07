import type { Metadata } from "next";
import { getVideosByUploader } from "@/lib/videoStore";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ username: string }>;
}): Promise<Metadata> {
    const { username } = await params;
    return { title: `${decodeURIComponent(username)} — ClipDrop` };
}

export default async function ProfilePage({
    params,
}: {
    params: Promise<{ username: string }>;
}) {
    const { username } = await params;
    const decodedUsername = decodeURIComponent(username);
    const videos = await getVideosByUploader(decodedUsername);

    const totalViews = videos.reduce((sum, v) => sum + (v.views ?? 0), 0);
    const avatarUrl = videos[0]?.uploaderImageUrl;

    return (
        <main className="min-h-screen bg-[#0a0a0c] text-[#f2f2f0]">
            <header className="border-b border-[#1c1c20] px-6 py-4 flex items-center justify-between sticky top-0 bg-[#0a0a0c]/95 backdrop-blur z-20">
                <a href="/" className="font-bold tracking-tight text-lg">
                    clip<span className="text-[#ff3d6e]">drop</span>
                </a>
                <a
                    href="/upload"
                    className="text-sm font-medium px-3.5 py-1.5 rounded-lg bg-[#ff3d6e] text-white hover:bg-[#ff5580] transition-colors"
                >
                    upload
                </a>
            </header>

            <div className="max-w-4xl mx-auto px-6 py-10">
                <a
                    href="/"
                    className="inline-flex items-center gap-2 text-sm text-[#8a8a92] hover:text-[#f2f2f0] mb-6 transition-colors"
                >
                    ← back to all videos
                </a>

                <div className="flex items-center gap-5 mb-8">
                    {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={avatarUrl}
                            alt={decodedUsername}
                            className="w-20 h-20 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-20 h-20 rounded-full bg-[#1c1c20]" />
                    )}
                    <div>
                        <h1 className="text-2xl font-bold">{decodedUsername}</h1>
                        <div className="flex items-center gap-4 mt-1.5 text-sm text-[#8a8a92]">
                            <span>
                                <strong className="text-[#f2f2f0]">{videos.length}</strong>{" "}
                                {videos.length === 1 ? "post" : "posts"}
                            </span>
                            <span>
                                <strong className="text-[#f2f2f0]">{formatCount(totalViews)}</strong> views
                            </span>
                        </div>
                    </div>
                </div>

                {videos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-24 rounded-2xl border-2 border-dashed border-[#26262c] text-center">
                        <div className="w-12 h-12 rounded-full bg-[#1c1c20] flex items-center justify-center text-xl">
                            🎬
                        </div>
                        <p className="text-sm font-medium">No videos yet</p>
                        <a
                            href="/upload"
                            className="mt-2 text-sm font-medium px-4 py-2 rounded-lg bg-[#ff3d6e] text-white hover:bg-[#ff5580] transition-colors"
                        >
                            upload a video
                        </a>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {videos.map((video) => {
                            const ratio = video.width && video.height ? video.width / video.height : 9 / 16;
                            return (
                                <a
                                    key={video.videoId}
                                    href={`/v/${video.videoId}`}
                                    className="group block rounded-xl overflow-hidden border border-[#26262c] bg-[#111114] hover:border-[#3a3a42] transition-colors"
                                >
                                    <div className="relative bg-black" style={{ aspectRatio: ratio }}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={video.thumbUrl}
                                            alt={video.title}
                                            className="absolute inset-0 w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    </div>
                                    <div className="px-3 py-2.5">
                                        <p className="text-sm text-[#d4d4d8] truncate">{video.title}</p>
                                        <p className="text-[11px] text-[#5a5a62] mt-0.5">
                                            {formatCount(video.views ?? 0)} views
                                        </p>
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}

function formatCount(n: number): string {
    if (n < 1000) return String(n);
    if (n < 1000000) return `${(n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0)}K`;
    return `${(n / 1000000).toFixed(1)}M`;
}