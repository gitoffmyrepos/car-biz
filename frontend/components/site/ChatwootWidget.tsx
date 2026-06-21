'use client';

/**
 * Chatwoot live-chat widget loader.
 *
 * Loads the Chatwoot web-widget SDK from the self-hosted instance and boots it
 * with the website token. Both values are build-time NEXT_PUBLIC_* env vars
 * (baked into the client bundle by the Dockerfile / k8s ConfigMap):
 *
 *   NEXT_PUBLIC_CHATWOOT_BASE_URL  e.g. https://gigwheels-chat.strategybase.io
 *   NEXT_PUBLIC_CHATWOOT_TOKEN     the per-inbox website token from Chatwoot admin
 *
 * If either is unset/empty (e.g. before the operator fills the token) the
 * component renders nothing and loads no script — fail-quiet, never blocks the
 * page. The launcher styling is owned by Chatwoot admin; this only loads it.
 */

import Script from 'next/script';

declare global {
  interface Window {
    chatwootSDK?: {
      run: (config: { websiteToken: string; baseUrl: string }) => void;
    };
    chatwootSettings?: Record<string, unknown>;
  }
}

const BASE_URL = process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL;
const TOKEN = process.env.NEXT_PUBLIC_CHATWOOT_TOKEN;

export function ChatwootWidget() {
  // Gate: render nothing unless BOTH env vars are present and non-empty.
  if (!BASE_URL || !TOKEN) {
    return null;
  }

  const sdkUrl = `${BASE_URL}/packs/js/sdk.js`;

  return (
    <Script
      id="chatwoot-sdk"
      src={sdkUrl}
      strategy="afterInteractive"
      onLoad={() => {
        if (window.chatwootSDK && BASE_URL && TOKEN) {
          window.chatwootSDK.run({
            websiteToken: TOKEN,
            baseUrl: BASE_URL,
          });
        }
      }}
    />
  );
}
