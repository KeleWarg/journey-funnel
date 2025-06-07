// pages/404.tsx

import Link from "next/link";

export default function Custom404() {
  return (
    <div className="flex flex-col items-center justify-center h-screen text-center">
      <h1 className="text-4xl font-bold">404 – Page Not Found</h1>
      <p className="mt-4">
        Sorry, we couldn't find that page.{" "}
        <Link href="/" className="text-blue-600 underline">
          Go back home
        </Link>
        .
      </p>
    </div>
  );
}