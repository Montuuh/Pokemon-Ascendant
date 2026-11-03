import { IconArrowBackUp, IconBan, IconBattery1, IconBatteryCharging, IconEyeExclamation, IconFeather, IconFlame, IconGhost2, IconHandStop, IconHeartbeat, IconMask, IconMoodAngry, IconPlant2, IconSeedling, IconShield, IconShieldHalf, IconZzz } from '@tabler/icons-react';
import type { Combatant } from '@/sim';
import { getContent } from '@/content/registry';
import { KEYWORD_TEXT, fmtMult, frac } from '@/ui/strings';
import { Tip, Tipped } from '@/ui/tooltip';
import type { UnitChip } from './UnitChips';
import card from './UnitCard.module.css';

// §3.11 / §9.2.2.2 — what a move keyword has left on a Pokémon, as chips on its window's corner with its stages and its
// shield (`UnitChips`): Protect, Endure, Guard and Substitute (with what they hold), Counter, a recharge, a charge, a
// rampage, roots. Each chip says itself in a word and opens its rule; on a short stage it folds into "+N" with the rest.
// A keyword changes the turn's decision, so its chips come first.

export function keywordUnitChips(c: Combatant, turn: number, mine = true): UnitChip[] {
  const v = c.volatile;
  const out: UnitChip[] = [];
  const chip = (key: string, Icon: typeof IconShield, label: string, explain: string, tone: string): UnitChip => ({
    key: `kw-${key}`,
    label,
    explain,
    node: (
      <Tipped tip={<Tip title={label} body={explain} />} className={`${card.chip} ${tone}`} data-testid={`keyword-${key}`}>
        <Icon size={11} stroke={2.4} aria-hidden="true" /> {label}
      </Tipped>
    ),
  });
  // Blue: what stands between it and a hit. Amber: a threat or a commitment the other side reads.
  if (v?.protectTurn === turn) out.push(chip('protect', IconShield, KEYWORD_TEXT.protect.label, KEYWORD_TEXT.protect.tip, card.info!));
  if (v?.endureTurn === turn) out.push(chip('endure', IconHeartbeat, KEYWORD_TEXT.endure.label, KEYWORD_TEXT.endure.tip, card.info!));
  if ((c.guard ?? 0) > 0) out.push(chip('guard', IconShieldHalf, KEYWORD_TEXT.guard.label(c.guard!), KEYWORD_TEXT.guard.tip(c.guard!), card.info!));
  if ((c.substitute ?? 0) > 0) out.push(chip('substitute', IconMask, KEYWORD_TEXT.substitute.label(c.substitute!), KEYWORD_TEXT.substitute.tip(c.substitute!), card.info!));
  if (v?.counter?.turn === turn) out.push(chip('counter', IconArrowBackUp, KEYWORD_TEXT.counter.label, KEYWORD_TEXT.counter.tip(v.counter.range), card.warn!));
  if (v?.charge) out.push(v.charge.outOfReach ? chip('charge', IconFeather, KEYWORD_TEXT.charge.away, KEYWORD_TEXT.charge.awayTip, card.warn!) : chip('charge', IconBatteryCharging, KEYWORD_TEXT.charge.label, KEYWORD_TEXT.charge.tip, card.warn!));
  if (v?.rampage) out.push(chip('rampage', IconFlame, KEYWORD_TEXT.rampage.label, KEYWORD_TEXT.rampage.tip(v.rampage.left), card.warn!));
  if (v?.recharge) out.push(chip('recharge', IconBattery1, KEYWORD_TEXT.recharge.label, v.recharge === 'active' ? KEYWORD_TEXT.recharge.now : KEYWORD_TEXT.recharge.next, card.warn!));
  if (v?.rooted) out.push(chip('rooted', IconPlant2, KEYWORD_TEXT.rooted.label, KEYWORD_TEXT.rooted.tip, card.info!));
  // §5.2.3 — what a disruption left on it: amber, a thing to answer — the most urgent first (the trap a swap cannot
  // answer, the sleep and the drain a swap does), so a short stage's fold leads with it.
  if ((v?.trappedUntil ?? 0) >= turn) out.push(chip('trapped', IconEyeExclamation, KEYWORD_TEXT.trapped.label, KEYWORD_TEXT.trapped.tip(v!.trappedUntil!), card.warn!));
  if (v?.drowsyTurn !== undefined) out.push(chip('drowsy', IconZzz, KEYWORD_TEXT.drowsy.label, KEYWORD_TEXT.drowsy.tip(mine), card.warn!));
  if (v?.seeded) out.push(v.seeded.heal ? chip('seeded', IconSeedling, KEYWORD_TEXT.seeded.label, KEYWORD_TEXT.seeded.tip(frac(v.seeded.percent), mine), card.warn!) : chip('cursed', IconGhost2, KEYWORD_TEXT.cursed.label, KEYWORD_TEXT.cursed.tip(frac(v.seeded.percent), mine), card.warn!));
  if ((v?.tauntUntil ?? 0) >= turn) out.push(chip('taunt', IconMoodAngry, KEYWORD_TEXT.taunt.label, KEYWORD_TEXT.taunt.tip(v!.tauntUntil!), card.warn!));
  if (v?.disabledMove && turn <= v.disabledMove.untilTurn) out.push(chip('disabled', IconBan, KEYWORD_TEXT.disabled.label, KEYWORD_TEXT.disabled.tip(getContent().move(v.disabledMove.moveId).name, v.disabledMove.untilTurn), card.warn!));
  if (v?.helped?.turn === turn) out.push(chip('helped', IconHandStop, KEYWORD_TEXT.helped.label, KEYWORD_TEXT.helped.tip(fmtMult(v.helped.multiplier)), card.warn!));
  return out;
}
