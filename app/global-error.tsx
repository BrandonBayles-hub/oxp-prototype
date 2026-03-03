"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui", padding: "2rem", background: "#fff", color: "#111" }}>
        <div style={{ maxWidth: "32rem", margin: "0 auto" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Janet – Something went wrong</h1>
          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
            {error?.message || "A critical error occurred."}
          </p>
          <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "#888" }}>
            Check the browser Console (F12) for details. If you keep seeing this, try{" "}
            <code style={{ background: "#f0f0f0", padding: "0.125rem 0.25rem" }}>npm run dev:clean</code>.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              background: "#111",
              color: "#fff",
              border: "none",
              borderRadius: "0.375rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <br />
          <Link href="/" style={{ display: "inline-block", marginTop: "1rem", fontSize: "0.875rem" }}>
            Back to home
          </Link>
        </div>
      </body>
    </html>
  );
}
