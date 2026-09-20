import { useState } from 'react';
import { IconAlertTriangle, IconArrowRight, IconDice, IconShieldCheck } from '@tabler/icons-react';
import { useRunStore } from '@/app/runStore';
import { mysteryEvent, RISK_LABEL, type EventRisk } from '@/sim';
import { Money, Price } from '@/ui/components/Money';
import { RUN_REJECT_TEXT } from '@/ui/strings';
import styles from './EventScreen.module.css';

// Mystery Event, §2.10 — a scene and two or three choices.
//
// Pillar 1 survives the word "Mystery" because the *outcome* is stated on the button before you press it.
// The only thing hidden is which event you drew, and even that is banded: the node's risk badge said Safe,
// Tradeoff or Gamble on the map. A Gamble states its odds and both of its branches; nothing here is a
// surprise you could not have priced.

const RISK_ICON: Record<EventRisk, typeof IconDice> = {
  safe: IconShieldCheck,
  tradeoff: IconAlertTriangle,
  gamble: IconDice,
};

const RISK_BLURB: Record<EventRisk, string> = {
  safe: 'Nothing here can hurt you.',
  tradeoff: 'Something is given up for something gained.',
  gamble: 'A stated chance, both sides shown.',
};

export function EventScreen() {
  const run = useRunStore((s) => s.run)!;
  const dispatch = useRunStore((s) => s.dispatch);
  const [toast, setToast] = useState<string | null>(null);

  const event = mysteryEvent(run.pendingEvent!);
  const result = run.eventResult;
  const RiskIcon = RISK_ICON[event.risk];

  function choose(option: number) {
    if (!dispatch({ type: 'choose-event', option })) {
      setToast(RUN_REJECT_TEXT[useRunStore.getState().lastRejected?.reason ?? ''] ?? 'Not now.');
      window.setTimeout(() => setToast(null), 2600);
    }
  }

  return (
    <main className={styles.root} data-testid="event-screen" data-risk={event.risk}>
      <header className={styles.topBar}>
        <span className={styles.risk} data-testid="event-risk">
          <RiskIcon size={18} />
          {RISK_LABEL[event.risk]} · {RISK_BLURB[event.risk]}
        </span>
        <span className={styles.wallet}>
          <Money amount={run.money} size={18} />
        </span>
      </header>

      <section className={styles.scene}>
        <h1 className={`${styles.title} display`}>{event.title}</h1>
        <p className={styles.prose}>{event.scene}</p>
      </section>

      {/* §2.10 — the result stays on screen until it is acknowledged. A Gamble the player never sees land is
          the same as no gamble at all, and even a stated outcome reads better confirmed than assumed. */}
      {result ? (
        <div className={styles.result} data-testid="event-result">
          <h2 className={`${styles.resultTitle} display`}>What happened</h2>
          <ul className={styles.resultList}>
            {result.map((line, i) => (
              <li key={`${line}-${i}`}>{line}</li>
            ))}
          </ul>
          <button
            type="button"
            className={styles.leave}
            onClick={() => dispatch({ type: 'leave-event' })}
            data-testid="btn-leave-event"
          >
            Back to the route <IconArrowRight size={18} />
          </button>
        </div>
      ) : (
      <div className={styles.choices} role="group" aria-label="What do you do?">
        {event.choices.map((choice, i) => {
          const affordable = !choice.cost || run.money >= choice.cost;
          return (
            <button
              key={choice.label}
              type="button"
              className={styles.choice}
              disabled={!affordable}
              onClick={() => choose(i)}
              data-testid={`event-choice-${i}`}
              title={affordable ? choice.detail : 'Not enough money.'}
            >
              <span className={`${styles.choiceLabel} display`}>{choice.label}</span>
              {/* The promise, verbatim from the content row. `eventContent.test.ts` holds this string and the
                  outcomes it describes to the same numbers, so what the button says is what the run does. */}
              <span className={styles.choiceDetail}>{choice.detail}</span>
              {choice.cost ? (
                <span className={styles.choiceCost}>
                  <Price amount={choice.cost} affordable={affordable} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      )}

      <footer className={styles.footer}>
        {toast && (
          <p className={styles.toast} role="status" data-testid="event-toast">
            {toast}
          </p>
        )}
        <p className="sr-only" role="status" aria-live="polite">
          {run.log.slice(-1).join(' ')}
        </p>
      </footer>
    </main>
  );
}
