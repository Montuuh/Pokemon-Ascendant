import { IconTicket } from '@tabler/icons-react';

/** §8.3.4 — the Token glyph, one icon everywhere rather than an emoji that renders differently per font. */
export function TokenIcon({ size = 15 }: { size?: number }) {
  return <IconTicket size={size} stroke={2.4} aria-hidden="true" style={{ verticalAlign: '-2px' }} />;
}
