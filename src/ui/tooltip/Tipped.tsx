import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { useTip } from './useTip';

type Props<T extends ElementType> = {
  tip: ReactNode;
  as?: T;
} & Omit<ComponentPropsWithoutRef<T>, 'as'>;

/**
 * An element with a tooltip on it, for the places a hook cannot go — inside a `.map`, on a bare icon, on a
 * pill in a row. `<Tipped tip={statusTip('burn')} as="span" className={…}>…</Tipped>`.
 *
 * Buttons and other interactive elements should spread `useTip()` directly instead, so the tooltip and the
 * click land on the same element and a keyboard user focusing the button gets the bubble.
 */
export function Tipped<T extends ElementType = 'span'>({ tip, as, ...rest }: Props<T>) {
  const Tag = (as ?? 'span') as ElementType;
  const props = useTip(tip);
  // A non-interactive host still has to be reachable by keyboard for the focus path to mean anything.
  const focusable = Tag === 'span' || Tag === 'div' ? { tabIndex: 0 } : {};
  return <Tag {...focusable} {...rest} {...props} />;
}
