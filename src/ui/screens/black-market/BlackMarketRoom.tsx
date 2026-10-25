import { asset } from '@/content/paths';
import { PixelRoom } from '@/ui/components/PixelRoom';
import { MARKET_TEXT } from '@/ui/strings';
import { marketCounterTip, marketExitTip } from '@/ui/tips';
import { MARKET_COUNTERS, MARKET_ROOM, MARKET_SPOTS, MARKET_STAIRS, type MarketCounter } from './room';

/** §2.11.6 — the room is pointed at; every transaction remains its counter's existing UI. */
export function BlackMarketRoom({
  chosen,
  dealt,
  onChoose,
  onExit,
}: {
  chosen: MarketCounter | null;
  dealt: Record<MarketCounter, boolean>;
  onChoose: (counter: MarketCounter) => void;
  onExit: () => void;
}) {
  return (
    <PixelRoom
      art={asset('art/black-market/room.png')}
      w={MARKET_ROOM.w}
      h={MARKET_ROOM.h}
      label={MARKET_TEXT.title}
      testId="black-market-room"
      maxScale={3}
      scaleStep={1}
      chosen={chosen}
      onChoose={onChoose}
      sprites={MARKET_COUNTERS.map((id) => ({
        src: asset(`art/black-market/${id}.png`),
        at: MARKET_SPOTS[id].person,
      }))}
      spots={MARKET_COUNTERS.map((id) => ({
        id,
        semantics: { kind: 'dialog', open: chosen === id },
        boxes: MARKET_SPOTS[id].boxes,
        label: `${MARKET_TEXT[id].name}${dealt[id] ? ' ✓' : ''}`,
        ariaLabel: `${MARKET_TEXT[id].name}${dealt[id] ? `, ${MARKET_TEXT.dealt}` : ''}`,
        tip: marketCounterTip(MARKET_TEXT[id].name, MARKET_TEXT[id].line, dealt[id]),
        testId: `market-${id}`,
      }))}
      exit={{
        box: MARKET_STAIRS,
        label: MARKET_TEXT.up,
        tip: marketExitTip(),
        testId: 'market-stairs',
        onExit,
      }}
    />
  );
}
