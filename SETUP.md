# ClipDrop

Browse a gallery of generated clips on the homepage, or make a new one — upload a video, drag a trim range, get back a watermarked GIF + clip page link you can post to Reddit.

## Pages

- **`/`** — gallery of all generated clips, grid layout, click through to any clip
- **`/upload`** — the actual tool: upload → trim → watermark → generate
- **`/c/[clipId]`** — individual clip page (this is what you post to Reddit — it has the Open Graph tags Reddit scrapes for the preview)

## How it works

1. **Upload** (`/upload`) — drop a video, it's stored in `/uploads`
2. **Trim** — drag the dual-handle slider to pick up to 8 seconds
3. **Generate** — backend runs ffmpeg to: cut the range → burn in the watermark (`public/logo/watermark.png`) → export an MP4, a looping GIF, and a thumbnail, all saved to `public/clips/`
4. **Share** — you get two links:
   - **Page link** (`/c/[clipId]`) — post *this* to Reddit. The page has Open Graph tags pointing at the watermarked GIF, so Reddit/Twitter render it as a clickable animated preview in the feed.
   - **Direct GIF link** — the raw `.gif` file, in case you need it elsewhere.

Every clip you make also shows up automatically on the homepage gallery.

Clicking the preview on Reddit takes people straight to the clip page, where the full clip plays.

## Setup

```bash
npm install
```

You also need `ffmpeg` and `ffprobe` on the host (already required, not bundled). Check with:

```bash
ffmpeg -version
ffprobe -version
```

## Run

```bash
npm run dev      # development
# or
npm run build && npm run start   # production
```

Opens on `http://localhost:3000` — that's the gallery. Go to `http://localhost:3000/upload` to make a clip.

## Replace the watermark

Swap `public/logo/watermark.png` with your real logo (transparent background PNG works best). It's overlaid at ~22% of the clip's width, bottom-right corner, in `app/api/clip/route.ts`.

## Set your real domain before deploying

`app/c/[clipId]/page.tsx` builds absolute URLs for Open Graph tags using `NEXT_PUBLIC_SITE_URL`. Set this env var to your real domain before deploying, or Reddit will try to scrape `localhost` URLs and fail:

```bash
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

## Storage note

Right now uploads and clips are stored on local disk (`/uploads`, `public/clips`) and clip metadata is a flat JSON file (`data/clips.json`). This is fine for testing but won't survive a redeploy on most hosting platforms (Vercel, etc. have ephemeral filesystems). Before going to production, swap local disk for:
- **Cloudflare R2** or S3 for the video/GIF files
- A real database (Postgres, etc.) for clip metadata

## Known limits

- Max clip length: 8 seconds (edit `MAX_CLIP_SECONDS` in both `app/api/clip/route.ts` and `app/upload/page.tsx` to change)
- Max upload size: 500MB
- GIF auto-downscales to 360px/10fps if the 480px/12fps version exceeds 8MB
- No auth/rate-limiting — add before opening this up publicly

## If your machine is slow

Running this locally needs Node + ffmpeg installed and `npm install` to pull dependencies, which can be heavy on a slow machine. The faster path is usually deploying straight to a host like Vercel and skipping local setup entirely — push the project to a GitHub repo, connect it on vercel.com, and it builds in the cloud instead of on your machine. (ffmpeg won't run on Vercel's default serverless functions though — you'd need a host that supports a Node runtime with ffmpeg available, like Railway or Render, or a custom Docker deploy.)
