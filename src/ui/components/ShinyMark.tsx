import { IconSparkles, IconSparklesFilled } from '@tabler/icons-react';
import { Tipped } from '@/ui/tooltip';
import { shinyTip } from '@/ui/tips';
import styles from './ShinyMark.module.css';

// §5.14 — the one mark a shiny carries wherever it is listed: a sparkle beside its name. `plain` drops the tooltip
// for a mark that sits inside a control which already explains itself on hover (a Box row, a Pokédex card).
export function ShinyMark({ name, size = 16, plain = false, owned = false }: { name: string; size?: number; plain?: boolean; owned?: boolean }) {
  // Filled reads as sparkles at 12–14 px on cream, where the outline blurred into a gold blob; the stage theme's
  // glow keeps the outline legible, so both are drawn and the theme shows one.
  const icon = (
    <>
      <IconSparklesFilled className={styles.light} size={size} aria-hidden="true" />
      <IconSparkles className={styles.stage} size={size} stroke={2.2} aria-hidden="true" />
    </>
  );
  if (plain) {
    return (
      <span className={styles.mark} role="img" aria-label={`Shiny ${name}`} data-testid="shiny-mark">
        {icon}
      </span>
    );
  }
  return (
    <Tipped tip={shinyTip(name, owned)} className={styles.mark} aria-label={`Shiny ${name}`} data-testid="shiny-mark">
      {icon}
    </Tipped>
  );
}
