import { IconBolt, IconBrain, IconCloudFog, IconCloudRain, IconHome, IconLeaf, IconSnowflake, IconSpider, IconSun, IconVaccineBottle, IconWind } from '@tabler/icons-react';
import { battlefields, type FieldId, type FieldState, type PokemonType } from '@/sim';
import { FIELD_LABEL, homeFieldLabel } from '@/ui/strings';
import { fieldTip, homeFieldTip } from '@/ui/tips';
import { Tipped } from '@/ui/tooltip';
import styles from './FieldChips.module.css';

const ICON: Record<FieldId, typeof IconSun> = {
  'sunny-day': IconSun,
  'rain-dance': IconCloudRain,
  'electric-terrain': IconBolt,
  sandstorm: IconWind,
  hail: IconSnowflake,
  'grassy-terrain': IconLeaf,
  'psychic-terrain': IconBrain,
  'misty-terrain': IconCloudFog,
  'toxic-spikes': IconVaccineBottle,
  'sticky-web': IconSpider,
};

/** Each field's own border colour, by class. */
const TONE: Record<FieldId, string | undefined> = {
  'sunny-day': styles.sunnyDay,
  'rain-dance': styles.rainDance,
  'electric-terrain': styles.electricTerrain,
  sandstorm: styles.sandstorm,
  hail: styles.hail,
  'grassy-terrain': styles.grassyTerrain,
  'psychic-terrain': styles.psychicTerrain,
  'misty-terrain': styles.mistyTerrain,
  'toxic-spikes': styles.toxicSpikes,
  'sticky-web': styles.stickyWeb,
};

interface Props {
  fields: FieldState;
  /** §4.3 Cloud Nine — the fields stand but do nothing while it leads. */
  suppressed?: boolean;
  /** Smaller, for a preview card. */
  compact?: boolean;
}

// §9.2.2.1 / §4.3 — the ground a fight is on: each Battlefield standing and any Home Field, one chip each, with the
// numbers behind a hover. The same chips on the combat top bar and on a node's preview card.
export function FieldChips({ fields, suppressed = false, compact = false }: Props) {
  const standing = battlefields(fields);
  if (!standing.length && !fields.home) return null;
  return (
    <span className={[styles.row, compact ? styles.compact : ''].join(' ')} data-testid="field-chips">
      {standing.map((id) => {
        const Icon = ICON[id];
        return (
          <Tipped key={id} tip={fieldTip(id, suppressed)} className={[styles.chip, TONE[id] ?? '', suppressed ? styles.suppressed : ''].join(' ')} data-testid={`field-${id}`}>
            <Icon size={compact ? 14 : 16} aria-hidden="true" />
            {FIELD_LABEL[id]}
          </Tipped>
        );
      })}
      {fields.home && (
        <Tipped tip={homeFieldTip(fields.home as PokemonType, suppressed)} className={[styles.chip, styles.home, suppressed ? styles.suppressed : ''].join(' ')} data-testid="field-home">
          <IconHome size={compact ? 14 : 16} aria-hidden="true" />
          {homeFieldLabel(fields.home)}
        </Tipped>
      )}
    </span>
  );
}
