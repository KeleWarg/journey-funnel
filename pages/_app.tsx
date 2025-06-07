// File: pages/_app.tsx

import "../styles/globals.css";   // ← Tells Next.js to load the CSS you just copied
import type { AppProps } from "next/app";
import { Analytics } from "@vercel/analytics/next"

// This default export is required for all Next.js pages.
// It wraps every page in your app, so you can load global styles here.
export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}