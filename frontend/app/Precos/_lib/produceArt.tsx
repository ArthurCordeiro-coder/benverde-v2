// Stylized product "photos" — flat illustrations inside a glass thumbnail.
// Greens were retinted to teal per the new Lumii palette. A neutral "default"
// glyph covers products that don't match any known kind.
import type { ReactElement } from "react";

type ArtEntry = { bg: string; art: ReactElement };

export const ProduceArt: Record<string, ArtEntry> = {
  banana: { bg: "linear-gradient(135deg,#fde68a,#f59e0b)", art: (
    <g><path d="M30 95 Q35 50 70 30 Q95 18 105 22 Q108 28 100 35 Q80 50 70 75 Q60 95 38 100 Z" fill="#fde047" stroke="#a16207" strokeWidth="1.5" /><path d="M100 22 Q104 20 108 22 L107 28 Q105 30 102 28 Z" fill="#854d0e" /><path d="M38 100 Q35 102 32 100" stroke="#854d0e" strokeWidth="1.5" fill="none" /></g>
  ) },
  banana_prata: { bg: "linear-gradient(135deg,#fef3c7,#eab308)", art: (
    <g><path d="M28 90 Q32 50 60 28 Q90 14 102 18 Q106 24 96 32 Q76 48 66 72 Q58 92 36 96 Z" fill="#facc15" stroke="#854d0e" strokeWidth="1.5" /><path d="M97 18 Q102 16 105 18 L104 24 Q101 26 98 24 Z" fill="#713f12" /></g>
  ) },
  banana_nanica: { bg: "linear-gradient(135deg,#fef9c3,#facc15)", art: (
    <g><path d="M30 95 Q30 55 60 35 Q85 22 100 25 Q103 32 92 38 Q72 52 64 78 Q56 96 38 100 Z" fill="#fde047" stroke="#854d0e" strokeWidth="1.5" /></g>
  ) },
  apple: { bg: "linear-gradient(135deg,#fecaca,#dc2626)", art: (
    <g><path d="M64 38 Q40 38 32 60 Q26 84 50 100 Q60 104 64 96 Q68 104 78 100 Q102 84 96 60 Q88 38 64 38 Z" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1.5" /><path d="M64 38 Q62 28 70 22" stroke="#3f6212" strokeWidth="2.5" fill="none" /><path d="M70 22 Q78 22 82 30" fill="#0d9488" /></g>
  ) },
  tomato: { bg: "linear-gradient(135deg,#fecaca,#b91c1c)", art: (
    <g><circle cx="64" cy="68" r="32" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1.5" /><path d="M50 38 L58 46 L64 38 L70 46 L78 38 L72 52 L56 52 Z" fill="#0d9488" /></g>
  ) },
  lettuce: { bg: "linear-gradient(135deg,#ccfbf1,#1ba99c)", art: (
    <g><circle cx="64" cy="72" r="34" fill="#2ec4b6" stroke="#134e4a" strokeWidth="1.5" /><path d="M40 60 Q52 50 64 60 Q76 50 88 60" stroke="#134e4a" strokeWidth="1.5" fill="none" /><path d="M44 78 Q56 70 64 78 Q72 70 84 78" stroke="#134e4a" strokeWidth="1.5" fill="none" /><path d="M50 92 Q60 86 64 92 Q70 86 78 92" stroke="#134e4a" strokeWidth="1.5" fill="none" /></g>
  ) },
  carrot: { bg: "linear-gradient(135deg,#fed7aa,#ea580c)", art: (
    <g><path d="M50 36 L78 36 L70 100 L58 100 Z" fill="#f97316" stroke="#7c2d12" strokeWidth="1.5" /><path d="M52 36 Q48 22 42 22 M64 36 Q64 18 64 16 M76 36 Q80 22 86 22" stroke="#0d9488" strokeWidth="2.5" fill="none" /></g>
  ) },
  potato: { bg: "linear-gradient(135deg,#fde68a,#a16207)", art: (
    <g><ellipse cx="64" cy="68" rx="38" ry="28" fill="#d6a371" stroke="#78350f" strokeWidth="1.5" /><circle cx="50" cy="60" r="2" fill="#78350f" /><circle cx="74" cy="58" r="1.5" fill="#78350f" /><circle cx="66" cy="78" r="2" fill="#78350f" /></g>
  ) },
  onion: { bg: "linear-gradient(135deg,#fde68a,#d97706)", art: (
    <g><ellipse cx="64" cy="72" rx="30" ry="32" fill="#fbbf24" stroke="#78350f" strokeWidth="1.5" /><path d="M48 50 Q64 56 80 50" stroke="#78350f" strokeWidth="1" fill="none" /><path d="M60 38 Q64 28 68 38" stroke="#0d9488" strokeWidth="2" fill="none" /></g>
  ) },
  garlic: { bg: "linear-gradient(135deg,#f5f5f4,#a8a29e)", art: (
    <g><path d="M64 36 Q40 50 44 80 Q48 102 64 102 Q80 102 84 80 Q88 50 64 36 Z" fill="#fafaf9" stroke="#57534e" strokeWidth="1.5" /><path d="M64 36 Q60 30 64 24 Q68 30 64 36" fill="#fafaf9" stroke="#57534e" strokeWidth="1.5" /><path d="M64 42 L64 100 M50 50 Q58 70 56 96 M78 50 Q70 70 72 96" stroke="#a8a29e" strokeWidth="1" fill="none" /></g>
  ) },
  cucumber: { bg: "linear-gradient(135deg,#ccfbf1,#0f766e)", art: (
    <g><rect x="32" y="50" width="64" height="32" rx="16" fill="#1ba99c" stroke="#134e4a" strokeWidth="1.5" /><circle cx="44" cy="60" r="1.5" fill="#134e4a" /><circle cx="58" cy="68" r="1.5" fill="#134e4a" /><circle cx="76" cy="60" r="1.5" fill="#134e4a" /><circle cx="88" cy="70" r="1.5" fill="#134e4a" /></g>
  ) },
  pepper: { bg: "linear-gradient(135deg,#fecaca,#dc2626)", art: (
    <g><path d="M64 32 Q56 32 56 40 Q56 50 50 60 Q44 84 60 96 Q70 102 78 92 Q88 76 80 56 Q74 44 72 38 Q72 32 64 32 Z" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1.5" /><path d="M60 36 L60 28 M68 36 L70 26" stroke="#0d9488" strokeWidth="2.5" fill="none" /></g>
  ) },
  orange: { bg: "linear-gradient(135deg,#fed7aa,#ea580c)", art: (
    <g><circle cx="64" cy="68" r="32" fill="#f97316" stroke="#7c2d12" strokeWidth="1.5" /><circle cx="64" cy="68" r="26" stroke="#fdba74" strokeWidth="0.8" fill="none" /><path d="M58 38 Q62 32 68 38" fill="#0d9488" /></g>
  ) },
  lemon: { bg: "linear-gradient(135deg,#fef9c3,#ca8a04)", art: (
    <g><ellipse cx="64" cy="68" rx="32" ry="26" fill="#facc15" stroke="#713f12" strokeWidth="1.5" transform="rotate(-15 64 68)" /><path d="M36 60 Q34 56 32 58 M92 76 Q94 80 96 78" stroke="#854d0e" strokeWidth="2" /></g>
  ) },
  grape: { bg: "linear-gradient(135deg,#e9d5ff,#7e22ce)", art: (
    <g><circle cx="64" cy="44" r="8" fill="#a855f7" stroke="#581c87" strokeWidth="1" /><circle cx="54" cy="56" r="8" fill="#9333ea" stroke="#581c87" strokeWidth="1" /><circle cx="74" cy="56" r="8" fill="#9333ea" stroke="#581c87" strokeWidth="1" /><circle cx="48" cy="70" r="8" fill="#a855f7" stroke="#581c87" strokeWidth="1" /><circle cx="64" cy="70" r="8" fill="#7e22ce" stroke="#581c87" strokeWidth="1" /><circle cx="80" cy="70" r="8" fill="#a855f7" stroke="#581c87" strokeWidth="1" /><circle cx="58" cy="84" r="8" fill="#9333ea" stroke="#581c87" strokeWidth="1" /><circle cx="72" cy="84" r="8" fill="#7e22ce" stroke="#581c87" strokeWidth="1" /><path d="M64 36 Q62 28 68 24" stroke="#0d9488" strokeWidth="2" fill="none" /></g>
  ) },
  watermelon: { bg: "linear-gradient(135deg,#ccfbf1,#1ba99c)", art: (
    <g><path d="M22 96 L106 96 Q106 50 64 32 Q22 50 22 96 Z" fill="#ef4444" stroke="#0f766e" strokeWidth="1.5" /><path d="M22 96 L106 96 Q106 88 100 84 Q88 90 64 88 Q40 90 28 84 Q22 88 22 96 Z" fill="#ccfbf1" /><path d="M22 96 L106 96 Q106 92 102 90 Q88 94 64 92 Q40 94 26 90 Q22 92 22 96 Z" fill="#1ba99c" /><circle cx="50" cy="72" r="1.5" fill="#1c1917" /><circle cx="66" cy="80" r="1.5" fill="#1c1917" /><circle cx="82" cy="68" r="1.5" fill="#1c1917" /></g>
  ) },
  mango: { bg: "linear-gradient(135deg,#fde047,#dc2626)", art: (
    <g><path d="M40 50 Q44 30 70 32 Q98 36 96 70 Q92 100 64 100 Q36 96 40 50 Z" fill="#f97316" stroke="#7c2d12" strokeWidth="1.5" /><path d="M58 38 Q60 30 68 30" stroke="#0d9488" strokeWidth="2" fill="none" /></g>
  ) },
  pineapple: { bg: "linear-gradient(135deg,#fde047,#a16207)", art: (
    <g><ellipse cx="64" cy="80" rx="22" ry="26" fill="#f59e0b" stroke="#78350f" strokeWidth="1.5" /><path d="M52 70 L64 76 L76 70 M52 86 L64 92 L76 86" stroke="#78350f" strokeWidth="1" fill="none" /><path d="M48 60 L56 38 L60 58 M62 58 L66 32 L70 58 M68 58 L76 40 L80 60" fill="#2ec4b6" stroke="#134e4a" strokeWidth="1" /></g>
  ) },
  papaya: { bg: "linear-gradient(135deg,#fed7aa,#1ba99c)", art: (
    <g><ellipse cx="64" cy="72" rx="24" ry="32" fill="#fb923c" stroke="#7c2d12" strokeWidth="1.5" /><path d="M64 40 Q62 32 64 24" stroke="#1ba99c" strokeWidth="3" /><circle cx="64" cy="76" r="2" fill="#1c1917" /><circle cx="60" cy="82" r="1.5" fill="#1c1917" /><circle cx="68" cy="82" r="1.5" fill="#1c1917" /><circle cx="64" cy="88" r="2" fill="#1c1917" /></g>
  ) },
  cabbage: { bg: "linear-gradient(135deg,#a5f3fc,#0d9488)", art: (
    <g><circle cx="64" cy="68" r="34" fill="#14b8a6" stroke="#134e4a" strokeWidth="1.5" /><path d="M64 34 Q42 44 36 68 Q42 92 64 102 Q86 92 92 68 Q86 44 64 34" stroke="#134e4a" strokeWidth="1" fill="none" /><path d="M44 56 Q64 66 84 56 M40 72 Q64 82 88 72 M48 86 Q64 92 80 86" stroke="#134e4a" strokeWidth="1" fill="none" /></g>
  ) },
  broccoli: { bg: "linear-gradient(135deg,#ccfbf1,#0f766e)", art: (
    <g><circle cx="48" cy="50" r="14" fill="#1ba99c" stroke="#134e4a" strokeWidth="1" /><circle cx="64" cy="42" r="16" fill="#2ec4b6" stroke="#134e4a" strokeWidth="1" /><circle cx="80" cy="50" r="14" fill="#1ba99c" stroke="#134e4a" strokeWidth="1" /><circle cx="58" cy="60" r="14" fill="#0f766e" stroke="#134e4a" strokeWidth="1" /><circle cx="74" cy="60" r="14" fill="#1ba99c" stroke="#134e4a" strokeWidth="1" /><rect x="56" y="68" width="16" height="32" rx="4" fill="#5eead4" stroke="#134e4a" strokeWidth="1" /></g>
  ) },
  strawberry: { bg: "linear-gradient(135deg,#fecaca,#dc2626)", art: (
    <g><path d="M40 50 Q44 80 64 100 Q84 80 88 50 Q64 36 40 50 Z" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1.5" /><path d="M40 50 L52 38 L60 46 L68 36 L76 46 L88 50 Q70 42 64 42 Q58 42 40 50 Z" fill="#1ba99c" stroke="#134e4a" strokeWidth="1" /><circle cx="54" cy="68" r="1.2" fill="#fde047" /><circle cx="66" cy="74" r="1.2" fill="#fde047" /><circle cx="74" cy="64" r="1.2" fill="#fde047" /><circle cx="58" cy="82" r="1.2" fill="#fde047" /><circle cx="72" cy="86" r="1.2" fill="#fde047" /></g>
  ) },
  avocado: { bg: "linear-gradient(135deg,#a5f3fc,#134e4a)", art: (
    <g><path d="M64 28 Q44 32 42 60 Q40 92 64 100 Q88 92 86 60 Q84 32 64 28 Z" fill="#14b8a6" stroke="#1a2e05" strokeWidth="1.5" /><circle cx="64" cy="72" r="14" fill="#a16207" stroke="#451a03" strokeWidth="1" /></g>
  ) },
  // Neutral fallback — a simple leaf/tag glyph for unknown products.
  default: { bg: "linear-gradient(135deg,#c4b5fd,#6247c7)", art: (
    <g><circle cx="64" cy="64" r="30" fill="#6247c7" stroke="#312e81" strokeWidth="1.5" /><path d="M52 64 L60 72 L78 54" stroke="#e9d5ff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></g>
  ) },
};

export function Thumb({
  kind,
  size = 128,
  rounded = 16,
}: {
  kind: string;
  size?: number | string;
  rounded?: number;
}) {
  const data = ProduceArt[kind] || ProduceArt.default;
  const haloId = `halo-${kind || "default"}`;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: rounded,
        overflow: "hidden",
        background: "linear-gradient(160deg, #1b0f47 0%, #0c0526 55%, #08031a 100%)",
        position: "relative",
        flexShrink: 0,
      }}
    >
      <svg viewBox="0 0 128 128" width="100%" height="100%" style={{ display: "block" }}>
        <radialGradient id={haloId} cx="50%" cy="32%" r="72%">
          <stop offset="0%" stopColor="rgba(120,90,225,0.42)" />
          <stop offset="62%" stopColor="rgba(98,71,199,0)" />
        </radialGradient>
        <rect width="128" height="128" fill={`url(#${haloId})`} />
        <g opacity="0.97">{data.art}</g>
      </svg>
    </div>
  );
}
