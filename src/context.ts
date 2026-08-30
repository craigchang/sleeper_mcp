import type { Identity } from './config.js';
import type { SleeperClient } from './sleeper/client.js';
import type { PlayerCache } from './sleeper/players.js';

export type AppContext = {
  config: Identity;
  client: SleeperClient;
  players: PlayerCache;
};
