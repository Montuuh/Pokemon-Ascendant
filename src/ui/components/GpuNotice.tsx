import { useEffect } from 'react';
import { IconX } from '@tabler/icons-react';
import { useAppStore } from '@/app/store';
import { useGpuStore } from '@/app/gpuStore';
import { useSettingsStore } from '@/app/settingsStore';
import { GPU_TEXT } from '@/ui/strings';
import styles from './GpuNotice.module.css';

// §9.6.2 — once, quietly: the browser draws without the graphics card, and where the switch is. Non-modal, in
// the bottom-right corner of the main menu and the Hub only: on the map and in fights it would sit over controls.
// Settings carries the same fact as a row; Escape or the cross closes it for the visit.

export function GpuNotice() {
  const { verdict, browser, dismissed, hide, probe, close, dismissForever } = useGpuStore();
  const away = useAppStore((s) => s.screen !== 'menu' && s.screen !== 'hub');
  const motion = useSettingsStore((s) => s.motion);
  const setSetting = useSettingsStore((s) => s.set);

  useEffect(() => {
    probe();
  }, [probe]);

  const open = verdict === 'software' && !dismissed && !hide && !away;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open) return null;
  return (
    <aside className={styles.notice} role="status" aria-label={GPU_TEXT.title} data-testid="gpu-notice" data-browser={browser}>
      <button type="button" className={styles.close} onClick={close} aria-label={GPU_TEXT.close} data-testid="gpu-notice-close">
        <IconX size={16} />
      </button>
      <p className={styles.body}>{GPU_TEXT.body}</p>
      <p className={styles.path} data-testid="gpu-notice-path">
        {GPU_TEXT.path[browser]}
      </p>
      <div className={styles.actions}>
        {motion !== 'reduced' && (
          <button type="button" className={styles.action} onClick={() => setSetting({ motion: 'reduced' })} data-testid="gpu-notice-reduce">
            {GPU_TEXT.reduceMotion}
          </button>
        )}
        <button type="button" className={styles.action} onClick={dismissForever} data-testid="gpu-notice-dismiss">
          {GPU_TEXT.dismiss}
        </button>
      </div>
    </aside>
  );
}
