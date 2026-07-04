import { listVideos } from "@/lib/videoStore";
import { VideoFeed } from "./VideoFeed";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const videos = await listVideos();

  return (
    <main className="min-h-screen bg-[#0a0a0c] text-[#f2f2f0]">
      <header className="border-b border-[#1c1c20] px-6 py-4 flex items-center justify-between sticky top-0 bg-[#0a0a0c]/95 backdrop-blur z-20">
        <a href="/" className="font-bold tracking-tight text-lg">
          clip<span className="text-[#ff3d6e]">drop</span>
        </a>
        <div className="flex items-center gap-3">
          <a
            href="/upload"
            className="text-sm font-medium px-3.5 py-1.5 rounded-lg bg-[#ff3d6e] text-white hover:bg-[#ff5580] transition-colors"
          >
            upload
          </a>
          <Show when="signed-out">
            <SignInButton>
              <button className="text-sm font-medium text-[#8a8a92] hover:text-[#f2f2f0] transition-colors">
                log in
              </button>
            </SignInButton>
            <SignUpButton>
              <button className="text-sm font-medium px-3.5 py-1.5 rounded-lg border border-[#26262c] hover:border-[#3a3a42] transition-colors">
                sign up
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row">
        {/* Left nav — real links, not blank */}
        <nav
          className="hidden lg:flex lg:flex-col gap-1 px-4 py-6 shrink-0 border-r border-[#1c1c20]"
          style={{ width: 240 }}
        >
          <a
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#8a8a92] hover:bg-[#141417] hover:text-[#f2f2f0] transition-colors"
          >
            <HomeIcon />
            Home
          </a>
          <a
            href="/upload"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#8a8a92] hover:bg-[#141417] hover:text-[#f2f2f0] transition-colors"
          >
            <UploadIcon />
            Upload
          </a>
        </nav>

        {/* Center feed — width is inline-styled inside VideoFeed itself */}
        <div className="flex-1 flex justify-center px-4 sm:px-6 py-8">
          <div style={{ width: "100%", maxWidth: 520 }}>
            <VideoFeed videos={videos} />
          </div>
        </div>

        {/* Right gutter — ad slot goes here. Left empty on purpose. */}
        <div className="hidden lg:block shrink-0" style={{ width: 240 }} />
      </div>
    </main>
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