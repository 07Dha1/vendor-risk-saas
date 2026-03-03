/**
 * VendorShield brand logo — a shield with a "V" check inside.
 * Pass `className` for sizing (e.g. "w-10 h-10").
 * Pass `id` when multiple instances appear on the same page to avoid
 * SVG gradient ID collisions (default "vsl" is fine for one-per-page use).
 */
export default function VendorShieldLogo({ className = 'w-9 h-9', id = 'vsl' }) {
  const gradId   = `${id}-grad`;
  const glowId   = `${id}-glow`;
  const shineId  = `${id}-shine`;

  return (
    <svg
      className={className}
      viewBox="0 0 48 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Main blue → violet gradient */}
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>

        {/* Soft drop-glow */}
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Shine gradient (top-left highlight) */}
        <linearGradient id={shineId} x1="0%" y1="0%" x2="60%" y2="60%">
          <stop offset="0%"    stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="100%"  stopColor="#ffffff" stopOpacity="0"    />
        </linearGradient>
      </defs>

      {/* ── Shield body ─────────────────────────────────────── */}
      <path
        d="M24 2 L44 9.5 L44 28 C44 43 34 51.5 24 54 C14 51.5 4 43 4 28 L4 9.5 Z"
        fill={`url(#${gradId})`}
        filter={`url(#${glowId})`}
      />

      {/* ── Top-left shine ──────────────────────────────────── */}
      <path
        d="M24 2 L44 9.5 L44 28 C44 43 34 51.5 24 54 C14 51.5 4 43 4 28 L4 9.5 Z"
        fill={`url(#${shineId})`}
      />

      {/* ── Inner border ring (subtle) ───────────────────────── */}
      <path
        d="M24 5.5 L41.5 12.5 L41.5 28 C41.5 41 32.5 49 24 51.5 C15.5 49 6.5 41 6.5 28 L6.5 12.5 Z"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="0.8"
        fill="none"
      />

      {/* ── V / check mark ──────────────────────────────────── */}
      <path
        d="M15.5 23 L24 37 L32.5 23"
        stroke="white"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
