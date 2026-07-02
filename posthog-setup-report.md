<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into ClipDrop. The following files were created or modified to add full client-side and server-side event tracking, a reverse proxy to route PostHog requests through the app's own domain, and exception capture for error tracking.

**New files created:**
- `instrumentation-client.ts` — PostHog client-side initialization (Next.js 15.3+ pattern via instrumentation file; no Provider needed)
- `lib/posthog-server.ts` — Singleton server-side PostHog node client for API routes

**Files modified:**
- `next.config.ts` — Added `/ingest/*` reverse proxy rewrites so PostHog traffic routes through ClipDrop's own domain (improves ad-blocker resilience)
- `app/upload/page.tsx` — Added 7 events covering the full clip creation flow
- `app/ClipGallery.tsx` — Added 1 event for gallery pagination
- `app/api/clip/route.ts` — Added server-side `clip_created` event (the core conversion event)
- `app/c/[clipId]/page.tsx` — Added server-side `clip_page_viewed` event (measures sharing reach)

| Event | Description | File |
|---|---|---|
| `video_selected` | User selected a video file to begin upload | `app/upload/page.tsx` |
| `video_upload_completed` | Video uploaded and probed successfully, ready to trim | `app/upload/page.tsx` |
| `video_upload_failed` | Video upload failed (network or server error) | `app/upload/page.tsx` |
| `clip_generation_started` | User clicked generate to start clip processing | `app/upload/page.tsx` |
| `clip_generation_completed` | Clip generated and result panel shown to user | `app/upload/page.tsx` |
| `clip_generation_failed` | Clip generation failed (processing or network error) | `app/upload/page.tsx` |
| `clip_page_link_copied` | User copied the shareable clip page link | `app/upload/page.tsx` |
| `clip_gif_link_copied` | User copied the direct GIF link | `app/upload/page.tsx` |
| `clip_gallery_load_more` | User loaded more clips from the homepage gallery | `app/ClipGallery.tsx` |
| `clip_created` | Clip fully processed and saved to R2 storage (server-side) | `app/api/clip/route.ts` |
| `clip_page_viewed` | A shared clip page was viewed (server-side sharing funnel) | `app/c/[clipId]/page.tsx` |

## Next steps

We've built a dashboard and five insights for you to monitor user behavior:

- [Analytics basics (wizard) — Dashboard](https://us.posthog.com/project/494985/dashboard/1790669)
- [Clips created over time](https://us.posthog.com/project/494985/insights/ar4Ui5jI)
- [Clip creation funnel](https://us.posthog.com/project/494985/insights/cGu0h5NO)
- [Clip links copied (page vs GIF)](https://us.posthog.com/project/494985/insights/0pdTtzfo)
- [Shared clip pages viewed](https://us.posthog.com/project/494985/insights/wCz7Xt3M)
- [Upload and generation error rates](https://us.posthog.com/project/494985/insights/w8XOpdm9)

## Verify before merging

- [ ] Run a full production build (`npm run build`) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` to `.env.example` and any bootstrap scripts so collaborators know what to set.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or your bundler's upload step) into CI so production stack traces de-minify in PostHog Error Tracking.

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
