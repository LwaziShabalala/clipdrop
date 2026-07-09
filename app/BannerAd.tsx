"use client";

import { useEffect, useRef } from "react";

export function BannerAd({
  adKey,
  width = 160,
  height = 600,
}: {
  adKey: string;
  width?: number;
  height?: number;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    // Adsterra's script uses document.write, which browsers block once a
    // page has already finished loading — which is always true by the time
    // a React component mounts. Writing it into this iframe's own fresh
    // document instead gives it the "still loading" context it expects, so
    // document.write actually works.
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head><style>body{margin:0;padding:0;}</style></head>
        <body>
          <script>
            atOptions = {
              'key' : '${adKey}',
              'format' : 'iframe',
              'height' : ${height},
              'width' : ${width},
              'params' : {}
            };
          </script>
          <script src="https://www.highperformanceformat.com/${adKey}/invoke.js"></script>
        </body>
      </html>
    `);
    doc.close();
  }, [adKey, width, height]);

  return (
    <iframe
      ref={iframeRef}
      style={{ width, height, border: "none" }}
      title="Advertisement"
    />
  );
}