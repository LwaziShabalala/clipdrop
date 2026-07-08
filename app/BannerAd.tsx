"use client";

import { useEffect, useRef } from "react";

export function BannerAd() {
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
              'key' : 'c7086ba7a1c0260213ddfe2c1822cbdf',
              'format' : 'iframe',
              'height' : 600,
              'width' : 160,
              'params' : {}
            };
          </script>
          <script src="https://www.highperformanceformat.com/c7086ba7a1c0260213ddfe2c1822cbdf/invoke.js"></script>
        </body>
      </html>
    `);
        doc.close();
    }, []);

    return (
        <iframe
            ref={iframeRef}
            style={{ width: 160, height: 600, border: "none" }}
            title="Advertisement"
        />
    );
}