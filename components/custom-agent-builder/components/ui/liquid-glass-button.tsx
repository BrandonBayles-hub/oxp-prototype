import Link from "next/link";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

/**
 * styled-jsx replaced with a static <style> tag rendered inline so this
 * component works inside the OXP microfrontend (Vite + Tailwind), which does
 * not have styled-jsx. The CSS is inert when the component is not mounted.
 */
const LIQUID_GLASS_STYLES = `
.liquid-glass-btn {
  position: relative;
  isolation: isolate;
  background: linear-gradient(135deg, rgba(255,255,255,0.72) 0%, rgba(240,240,255,0.55) 50%, rgba(220,226,255,0.6) 100%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  backdrop-filter: blur(14px) saturate(160%);
  box-shadow: 0 1px 1px rgba(255,255,255,0.9) inset, 0 -2px 6px rgba(99,102,241,0.08) inset, 0 8px 24px rgba(99,102,241,0.18), 0 1px 2px rgba(0,0,0,0.05);
  transition: transform 160ms ease, box-shadow 200ms ease;
  overflow: hidden;
}
.liquid-glass-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 1px 1px rgba(255,255,255,0.95) inset, 0 -2px 6px rgba(99,102,241,0.12) inset, 0 12px 32px rgba(99,102,241,0.28), 0 2px 4px rgba(0,0,0,0.06);
}
.liquid-glass-btn:active { transform: translateY(0); }
.liquid-glass-btn__border {
  position: absolute; inset: 0; border-radius: inherit; padding: 1.5px;
  background: conic-gradient(from var(--lgb-angle, 0deg), #ffffff 0deg, #a5b4fc 55deg, #60a5fa 100deg, #c4b5fd 150deg, #ffffff 210deg, #93c5fd 260deg, #a78bfa 310deg, #ffffff 360deg);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  animation: lgb-spin 5.5s linear infinite; pointer-events: none;
}
.liquid-glass-btn__sheen {
  position: absolute; inset: 0; border-radius: inherit;
  background: linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.9) 45%, rgba(255,255,255,0.3) 55%, transparent 70%);
  transform: translateX(-120%); animation: lgb-sheen 3.2s ease-in-out infinite;
  pointer-events: none; mix-blend-mode: soft-light;
}
.liquid-glass-btn__cube {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 999px;
  position: relative; z-index: 1;
  animation: lgb-shimmer 2.6s ease-in-out infinite;
  filter: drop-shadow(0 0 6px rgba(99,102,241,0.35));
}
.liquid-glass-btn__cube img { display: block; width: 28px; height: 28px; }
.liquid-glass-btn__label {
  position: relative; z-index: 1;
  background: linear-gradient(90deg, #0b0b0b 0%, #1f1f3a 50%, #0b0b0b 100%);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  text-shadow: 0 1px 0 rgba(255,255,255,0.35);
}
@property --lgb-angle { syntax: "<angle>"; inherits: false; initial-value: 0deg; }
@keyframes lgb-spin { to { --lgb-angle: 360deg; } }
@keyframes lgb-sheen {
  0% { transform: translateX(-120%); }
  60% { transform: translateX(160%); }
  100% { transform: translateX(160%); }
}
@keyframes lgb-shimmer {
  0%, 100% { box-shadow: 0 0 0 1px rgba(99,102,241,0.22), 0 0 6px rgba(99,102,241,0.3); }
  50% { box-shadow: 0 0 0 1px rgba(99,102,241,0.35), 0 0 14px rgba(99,102,241,0.55); }
}
`;

type LiquidGlassButtonProps = {
  href?: string;
  onClick?: () => void;
  label?: string;
  sublabel?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
};

export function LiquidGlassButton({
  href,
  onClick,
  label = "Build Your Own Agent",
  sublabel,
  className,
  size = "md",
}: LiquidGlassButtonProps) {
  const dims =
    size === "sm"
      ? "px-4 py-2 text-[13px]"
      : size === "lg"
      ? "px-7 py-3.5 text-[15px]"
      : "px-5 py-2.5 text-[14px]";

  const content = (
    <span
      className={cn(
        "liquid-glass-btn relative inline-flex items-center gap-2 rounded-full font-semibold tracking-tight",
        "text-slate-900 dark:text-slate-50",
        dims,
        className
      )}
    >
      <span className="liquid-glass-btn__border" aria-hidden />
      <span className="liquid-glass-btn__sheen" aria-hidden />
      <span className="liquid-glass-btn__cube" aria-hidden>
        <img
          src="/eli-cube.svg"
          alt=""
          width={28}
          height={28}
          className="shrink-0"
        />
      </span>
      <span className="liquid-glass-btn__label">
        {label}
        {sublabel && (
          <span className="ml-1.5 opacity-60 text-[11px] font-medium">{sublabel}</span>
        )}
      </span>
      <Sparkles className="h-3.5 w-3.5 opacity-70" />
      <style dangerouslySetInnerHTML={{ __html: LIQUID_GLASS_STYLES }} />
    </span>
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} aria-label={label}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} className="focus:outline-none">
      {content}
    </button>
  );
}
