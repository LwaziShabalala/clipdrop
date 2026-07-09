import { listVideos } from "@/lib/videoStore";
import { VideoFeed } from "./VideoFeed";
import { SideNav } from "./SideNav";
import { BannerAd } from "./BannerAd";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

// TODO: swap LEFT_AD_KEY for the new ad unit's key once you create it in
// Adsterra — right now both sides use the same key as a placeholder.
const LEFT_AD_KEY = "c7086ba7a1c0260213ddfe2c1822cbdf";
const RIGHT_AD_KEY = "c7086ba7a1c0260213ddfe2c1822cbdf";

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

      <div className="flex flex-col lg:flex-row max-w-[1400px] mx-auto">
        <SideNav />

        {/* width is fixed at 240; the ad itself (160 wide) sits inside a
            centered wrapper so left/right margins are explicitly equal,
            not just assumed from flex centering. */}
        <div className="hidden lg:flex lg:flex-col shrink-0 pt-12" style={{ width: 240 }}>
          <div className="flex flex-col items-center gap-2" style={{ width: 160, margin: "0 auto" }}>
            <BannerAd adKey={LEFT_AD_KEY} />
            <p className="text-[11px] text-[#5a5a62] text-center">Ads help keep clipdrop free</p>
          </div>
        </div>

        <div className="flex-1 flex justify-center px-4 sm:px-6 py-8">
          <div style={{ width: "100%", maxWidth: 520 }}>
            <VideoFeed videos={videos} />
          </div>
        </div>

        <div className="hidden lg:flex lg:flex-col shrink-0 pt-12" style={{ width: 240 }}>
          <div className="flex flex-col items-center gap-2" style={{ width: 160, margin: "0 auto" }}>
            <BannerAd adKey={RIGHT_AD_KEY} />
            <p className="text-[11px] text-[#5a5a62] text-center">Ads help keep clipdrop free</p>
          </div>
        </div>
      </div>
    </main>
  );
}