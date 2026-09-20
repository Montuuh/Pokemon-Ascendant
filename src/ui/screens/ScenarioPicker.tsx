import { IconArrowLeft, IconSwords } from '@tabler/icons-react';
import { ENCOUNTER_LABEL } from '@/ui/strings';
import { useAppStore } from '@/app/store';
import { useCombatStore } from '@/app/combatStore';
import { getContent } from '@/content/registry';
import { battleSpriteUrl } from '@/content/schemas/species';
import { stageBackdrop } from '@/ui/art';
import styles from './ScenarioPicker.module.css';

// v0.1 dev/playtest entry: the six combat fixtures as cards. Deep-link: /?scenario=<id>.
export function ScenarioPicker() {
  const goTo = useAppStore((s) => s.goTo);
  const rememberScenario = useAppStore((s) => s.rememberScenario);
  const start = useCombatStore((s) => s.start);
  const content = getContent();
  const scenarios = content.allScenarios();

  function launch(id: string) {
    start(id);
    rememberScenario(id);
    goTo('combat');
  }

  return (
    <main className={styles.root} data-testid="scenario-picker">
      <header className={styles.header}>
        <button type="button" className={styles.back} onClick={() => goTo('menu')} data-testid="btn-back">
          <IconArrowLeft size={18} /> Menu
        </button>
        <h1 className={`${styles.title} display`}>Combat Slice — scenarios</h1>
        <p className={styles.sub}>Six fixtures that exercise every rule of the combat loop. Pick one, read the intent, decide who leads.</p>
      </header>
      <div className={styles.grid}>
        {scenarios.map((sc) => {
          const teamSpecies = sc.player.team.map((m) => content.species(m.species));
          const enemies = sc.enemies.map((e) => content.species(e.species));
          return (
            <button key={sc.id} type="button" className={styles.card} onClick={() => launch(sc.id)} data-testid={`scenario-${sc.id}`}>
              <span className={styles.thumb} style={{ backgroundImage: `url(${stageBackdrop(sc.stage)})` }}>
                <span className={styles.kind}>{ENCOUNTER_LABEL[sc.kind] ?? sc.kind}</span>
                <span className={styles.vs}>
                  <span className={styles.side}>
                    {teamSpecies.map((s) => (
                      <img key={s.id} className="pixel" src={battleSpriteUrl(s.id, 'back')} alt={s.name} />
                    ))}
                  </span>
                  <IconSwords size={22} className={styles.swords} />
                  <span className={styles.side}>
                    {enemies.map((s, i) => (
                      <img key={`${s.id}-${i}`} className="pixel" src={battleSpriteUrl(s.id)} alt={s.name} />
                    ))}
                  </span>
                </span>
              </span>
              <span className={styles.body}>
                <span className={`${styles.name} display`}>{sc.name}</span>
                <span className={styles.desc}>{sc.description}</span>
                <span className={styles.meta}>
                  {sc.player.team.map((m) => `${content.species(m.species).name} L${m.level}`).join(' · ')}
                  <br />
                  vs {sc.enemies.map((e) => `${content.species(e.species).name} L${e.level}${e.phaseCount > 1 ? ` (${e.phaseCount} phases)` : ''}`).join(', ')}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </main>
  );
}
