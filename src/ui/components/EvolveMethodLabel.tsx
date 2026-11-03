import { IconHeartFilled } from '@tabler/icons-react';
import { getContent } from '@/content/registry';
import { itemIcon } from '@/ui/art';
import { evolveMethodIcons, evolveMethodShort } from '@/ui/evolutionText';
import { evolveMethodTip } from '@/ui/tips';
import { Tipped } from '@/ui/tooltip';
import styles from './EvolveMethodLabel.module.css';

// §6.3.7 — how a stage evolves, as a label: the stone's or the held item's own sprite (or Friendship's heart) and a few
// words, the sentence on hover — which is what tells a Hard Stone held from a Moon Stone used. The same picture the
// Pokédex's path cards use (BranchCard).
export function EvolveMethodLabel({ speciesId, testId }: { speciesId: string; testId?: string }) {
  const content = getContent();
  const text = evolveMethodShort(speciesId, content);
  if (!text) return null;
  return (
    <Tipped as="span" tabIndex={0} tip={evolveMethodTip(speciesId)} className={`${styles.label} tabular`} data-testid={testId}>
      {evolveMethodIcons(speciesId, content).map((icon) =>
        icon.kind === 'item' ? <img key={icon.id} src={itemIcon(icon.id)} alt="" width={15} height={15} className={styles.icon} /> : <IconHeartFilled key="heart" size={14} className={styles.heart} aria-hidden="true" />,
      )}
      {text}
    </Tipped>
  );
}
