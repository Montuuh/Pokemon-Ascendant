import { renderTrack, replyOf, type RenderRequest } from './render';

// §9.5.4 — the render worker: a track is expanded, rendered and normalised off the main thread, and its samples are
// handed back as transferred buffers, so a change of music never holds a frame.

const scope = self as unknown as {
  onmessage: ((e: MessageEvent<RenderRequest>) => void) | null;
  postMessage: (message: unknown, transfer: Transferable[]) => void;
};

scope.onmessage = (e) => {
  const reply = replyOf(e.data.id, renderTrack(e.data.id));
  const transfer: Transferable[] = [reply.l.buffer, reply.r.buffer];
  if (reply.stem) transfer.push(reply.stem.buffer);
  scope.postMessage(reply, transfer);
};
