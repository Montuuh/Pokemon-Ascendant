import { IconArrowLeft, IconX } from '@tabler/icons-react';
import { Dialog } from 'radix-ui';
import type { AccountState } from '@/sim';
import { getContent } from '@/content/registry';
import { SpeciesSheet } from './SpeciesSheet';
import type { PcSheetState } from './usePcSheet';
import styles from './PcSheet.module.css';

// §8.4.1 — the Pokédex sheet: a dialog that shows one species, with a history so an evolution or a stage on
// the Line tab can open its species and Back returns. Radix Dialog for the focus trap, Escape and the overlay;
// the look is ours.

export function PcSheet({ sheet, account }: { sheet: PcSheetState; account: AccountState }) {
  const content = getContent();
  const page = sheet.stack[sheet.stack.length - 1];
  return (
    <Dialog.Root open={!!page} onOpenChange={(o) => { if (!o) sheet.close(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content} aria-describedby={undefined}>
          {page && (
            <div className={styles.sheet} data-testid="pc-sheet">
              <Dialog.Title style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{content.species(page.id).name}</Dialog.Title>
              <div className={styles.chrome}>
                {sheet.stack.length > 1 ? (
                  <button type="button" className={styles.chromeBtn} onClick={sheet.back} data-testid="pc-sheet-back"><IconArrowLeft size={16} /> Back</button>
                ) : <span />}
                <Dialog.Close asChild>
                  <button type="button" className={styles.chromeBtn} aria-label="Close" data-testid="pc-sheet-close"><IconX size={16} /></button>
                </Dialog.Close>
              </div>
              {/* Keyed by species so the tabs reset when Back lands on another sheet. */}
              <SpeciesSheet key={`${page.id}-${sheet.stack.length}`} speciesId={page.id} account={account} initialTab={page.tab} onSpecies={(id, tab) => sheet.push({ id, tab })} />
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
