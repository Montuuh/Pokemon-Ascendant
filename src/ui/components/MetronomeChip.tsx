import { IconArrowsShuffle } from '@tabler/icons-react';
import type { FieldId } from '@/sim';
import { FIELD_LABEL, METRONOME_LABEL, metronomeNextText } from '@/ui/strings';
import { metronomeTip } from '@/ui/tips';
import { Tipped } from '@/ui/tooltip';
import styles from './MetronomeChip.module.css';

// §2.12.2.1 — Mew's Metronome: a field redrawn every turn. In a fight the chip names the next one, a turn ahead.
export function MetronomeChip({ next = null, compact = false }: { next?: FieldId | null; compact?: boolean }) {
  return (
    <Tipped tip={metronomeTip(next)} className={[styles.chip, compact ? styles.compact : ''].join(' ')} data-testid="metronome-chip">
      <IconArrowsShuffle size={compact ? 14 : 16} aria-hidden="true" />
      {METRONOME_LABEL}
      {next && <span className={styles.count} data-testid="metronome-next">{metronomeNextText(FIELD_LABEL[next] ?? next)}</span>}
    </Tipped>
  );
}
