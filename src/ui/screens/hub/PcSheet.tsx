import { IconArrowLeft, IconX } from '@tabler/icons-react';
import { Dialog } from 'radix-ui';
import type { AccountState } from '@/sim';
import { getContent } from '@/content/registry';
import { LineSheet } from './LineSheet';
import { SpeciesSheet } from './SpeciesSheet';
import type { PcSheetState } from './usePcSheet';
import styles from './PcSheet.module.css';

// §8.4.1 — the PC Terminal's sheet: a dialog that shows one species or one line, with a history so a line's
// stage can open its species and Back returns to the line. Radix Dialog for the focus trap, Escape and the
// overlay; the look is ours.

export function PcSheet({ sheet, account }: { sheet: PcSheetState; account: AccountState }) {
  const content = getContent();
  const page = sheet.stack[sheet.stack.length - 1];
  const title = !page ? '' : page.kind === 'species' ? content.species(page.id).name : `${content.species(page.id).name} line`;
  return (
    <Dialog.Root open={!!page} onOpenChange={(o) => { if (!o) sheet.close(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content} aria-describedby={undefined}>
          {page && (
            <div className={styles.sheet} data-testid="pc-sheet" data-kind={page.kind}>
              <Dialog.Title className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{title}</Dialog.Title>
              <div className={styles.chrome}>
                {sheet.stack.length > 1 ? (
                  <button type="button" className={styles.chromeBtn} onClick={sheet.back} data-testid="pc-sheet-back"><IconArrowLeft size={16} /> Back</button>
                ) : <span />}
                <Dialog.Close asChild>
                  <button type="button" className={styles.chromeBtn} aria-label="Close" data-testid="pc-sheet-close"><IconX size={16} /></button>
                </Dialog.Close>
              </div>
              {page.kind === 'species' ? (
                <SpeciesSheet speciesId={page.id} account={account} onSpecies={(id) => sheet.push({ kind: 'species', id })} onLine={(id) => sheet.push({ kind: 'line', id })} />
              ) : (
                <LineSheet line={page.id} account={account} onSpecies={(id) => sheet.push({ kind: 'species', id })} />
              )}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
