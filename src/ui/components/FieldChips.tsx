import { IconBolt, IconBrain, IconCloudFog, IconCloudRain, IconHome, IconLeaf, IconMusic, IconSnowflake, IconSpider, IconSun, IconVaccineBottle, IconWind } from '@tabler/icons-react';
import { battlefields, FIELD_CATEGORY, type CombatState, type FieldId, type FieldState, type PokemonType } from '@/sim';
import { FIELD_LABEL, PERISH_TEXT, homeFieldLabel } from '@/ui/strings';
import { fieldTip, homeFieldTip } from '@/ui/tips';
import { Tip, Tipped } from '@/ui/tooltip';
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
  /** §4.3.15 — the turns a move-set field has left, by category. */
  timers?: CombatState['fieldTimers'];
  /** §5.2.3 — Perish Song's count, when one is sung. */
  perish?: { turnsLeft: number; percent: number };
}

// §9.2.2.1 / §4.3 — the ground a fight is on: each Battlefield standing and any Home Field, one chip each, with the
// numbers behind a hover. The same chips on the combat top bar and on a node's preview card.
export function FieldChips({ fields, suppressed = false, compact = false, timers, perish }: Props) {
  const standing = battlefields(fields);
  if (!standing.length && !fields.home && !perish) return null;
  return (
    <span className={[styles.row, compact ? styles.compact : ''].join(' ')} data-testid="field-chips">
      {standing.map((id) => {
        const Icon = ICON[id];
        return (
          <Tipped key={id} tip={fieldTip(id, suppressed, timers?.[FIELD_CATEGORY[id]])} className={[styles.chip, TONE[id] ?? '', suppressed ? styles.suppressed : ''].join(' ')} data-testid={`field-${id}`}>
            <Icon size={compact ? 14 : 16} aria-hidden="true" />
            {FIELD_LABEL[id]}
            {/* §4.3.15 — a field a move set says how long it has. */}
            {timers?.[FIELD_CATEGORY[id]] && <span className={`${styles.turns} tabular`} data-testid={`field-${id}-turns`}>{timers[FIELD_CATEGORY[id]]!.turnsLeft}</span>}
          </Tipped>
        );
      })}
      {fields.home && (
        <Tipped tip={homeFieldTip(fields.home as PokemonType, suppressed)} className={[styles.chip, styles.home, suppressed ? styles.suppressed : ''].join(' ')} data-testid="field-home">
          <IconHome size={compact ? 14 : 16} aria-hidden="true" />
          {homeFieldLabel(fields.home)}
        </Tipped>
      )}
      {perish && (
        <Tipped tip={<Tip title={PERISH_TEXT.title} body={PERISH_TEXT.body(perish.turnsLeft, perish.percent)} />} className={[styles.chip, styles.perish].join(' ')} data-testid="field-perish">
          <IconMusic size={compact ? 14 : 16} aria-hidden="true" />
          {PERISH_TEXT.label}
          <span className={`${styles.turns} tabular`}>{perish.turnsLeft}</span>
        </Tipped>
      )}
    </span>
  );
}
