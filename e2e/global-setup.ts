import { assertOurServer } from '../scripts/lib/dev-server.mjs';

// Before any spec: the server Playwright started or reused answers as this game, not another project's on the port.
export default async function globalSetup(): Promise<void> {
  await assertOurServer();
}
