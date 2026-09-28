import Script from "next/script";
import { CLARITY_PROJECT_ID, GA4_MEASUREMENT_ID, GTM_CONTAINER_ID, isProductionEnv } from "@/lib/analytics";

// Google Tag Manager — head script. Renders only in production (see lib/analytics.ts).
// Pair with <GoogleTagManagerNoscript /> immediately after the opening <body> tag.
export function GoogleTagManagerScript() {
  if (!isProductionEnv) return null;
  return (
    <Script id="gtm-head" strategy="afterInteractive">
      {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_CONTAINER_ID}');`}
    </Script>
  );
}

// GTM noscript fallback — must be the first element inside <body>.
export function GoogleTagManagerNoscript() {
  if (!isProductionEnv) return null;
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
      />
    </noscript>
  );
}

// GA4 installed directly via gtag.js (no GTM web UI/API access to add it as a GTM tag).
// NOTE: if GA4 is later configured as a tag inside GTM-KCXDN3XN, remove this component
// to avoid double counting pageviews/events.
export function GoogleAnalytics() {
  if (!isProductionEnv) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA4_MEASUREMENT_ID}');`}
      </Script>
    </>
  );
}

// Microsoft Clarity official async snippet.
// NOTE: if Clarity is later moved into/managed via GTM-KCXDN3XN, remove this component
// to avoid double counting sessions.
export function MicrosoftClarity() {
  if (!isProductionEnv) return null;
  return (
    <Script id="clarity-init" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");`}
    </Script>
  );
}
