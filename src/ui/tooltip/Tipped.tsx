import type { ComponentPropsWithoutRef, ElementType, ReactNode, SyntheticEvent } from 'react';
import { useTip } from './useTip';

type Props<T extends ElementType> = {
  tip: ReactNode;
  as?: T;
} & Omit<ComponentPropsWithoutRef<T>, 'as'>;

type Handler = ((e: SyntheticEvent<HTMLElement>) => void) | undefined;

/** Both handlers run: the host's own (Radix's focus-to-select on a tab trigger, say) and then the tooltip's. */
const chain = (a: Handler, b: Handler) => (a && b ? (e: SyntheticEvent<HTMLElement>) => { a(e); b(e); } : (a ?? b));

/**
 * An element with a tooltip on it, for the places a hook cannot go — inside a `.map`, on a bare icon, on a
 * pill in a row. `<Tipped tip={statusTip('burn')} as="span" className={…}>…</Tipped>`.
 *
 * Buttons and other interactive elements should spread `useTip()` directly instead, so the tooltip and the
 * click land on the same element and a keyboard user focusing the button gets the bubble. Handlers passed in
 * (or merged in by a Radix `asChild` trigger) are chained with the tooltip's, never overwritten by them.
 */
export function Tipped<T extends ElementType = 'span'>({ tip, as, ...rest }: Props<T>) {
  const Tag = (as ?? 'span') as ElementType;
  const tipProps = useTip(tip);
  const own = rest as Record<string, Handler>;
  // A non-interactive host still has to be reachable by keyboard for the focus path to mean anything.
  const focusable = Tag === 'span' || Tag === 'div' ? { tabIndex: 0 } : {};
  return (
    <Tag
      {...focusable}
      {...rest}
      {...tipProps}
      onMouseEnter={chain(own.onMouseEnter, tipProps.onMouseEnter as Handler)}
      onMouseLeave={chain(own.onMouseLeave, tipProps.onMouseLeave as Handler)}
      onFocus={chain(own.onFocus, tipProps.onFocus as Handler)}
      onBlur={chain(own.onBlur, tipProps.onBlur as Handler)}
    />
  );
}
