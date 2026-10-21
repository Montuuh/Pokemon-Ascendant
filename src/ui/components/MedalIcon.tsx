import { medalGlyph } from '@/ui/art';

// §8.7 — a medal's GBA pixel-art ribbon in its tier's colour (a fight's progress door, the PC Terminal medal case).
export function MedalIcon({ tier, size = 26 }: { tier: string; size?: number }) {
  return (
    <img
      src={medalGlyph(tier)}
      alt=""
      width={size}
      height={size}
      className="pixel"
      style={{ flex: 'none' }}
      aria-hidden="true"
    />
  );
}
