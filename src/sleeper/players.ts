import { mkdir, readFile, writeFile } from 'node:fs/promises';

import { CACHE_DIR, PLAYERS_CACHE_PATH } from '../paths.js';
import type { SleeperClient } from './client.js';
import type { PlayerInfo, PlayersCacheFile, SleeperPlayerRaw } from './types.js';

export function playerInfoFromRaw(id: string, raw: SleeperPlayerRaw): PlayerInfo {
  const name =
    [raw.first_name, raw.last_name].filter(Boolean).join(' ') || raw.full_name || id;
  return {
    player_id: id,
    name,
    position: raw.position ?? raw.fantasy_positions?.[0] ?? null,
    team: raw.team ?? null,
  };
}

export function fallbackPlayer(id: string): PlayerInfo {
  const looksLikeTeam = /^[A-Z]{2,4}$/.test(id);
  return {
    player_id: id,
    name: id,
    position: looksLikeTeam ? 'DEF' : null,
    team: looksLikeTeam ? id : null,
  };
}

export function resolvePlayer(id: string, map: Record<string, PlayerInfo>): PlayerInfo {
  return map[id] ?? fallbackPlayer(id);
}

export function isSameUtcDay(iso: string, now: Date = new Date()): boolean {
  const fetched = new Date(iso);
  if (Number.isNaN(fetched.getTime())) {
    return false;
  }
  return fetched.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
}

const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

export function parsePlayersCache(text: string): PlayersCacheFile | null {
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }
  const record = parsed as Record<string, unknown>;
  if (typeof record.fetchedAt !== 'string' || !record.players || typeof record.players !== 'object') {
    return null;
  }
  if (Array.isArray(record.players)) {
    return null;
  }

  const players: Record<string, PlayerInfo> = Object.create(null);
  for (const [id, value] of Object.entries(record.players as Record<string, unknown>)) {
    if (DANGEROUS_KEYS.has(id) || !value || typeof value !== 'object') {
      continue;
    }
    const row = value as Record<string, unknown>;
    if (typeof row.player_id !== 'string' || typeof row.name !== 'string') {
      continue;
    }
    players[id] = {
      player_id: row.player_id,
      name: row.name,
      position: typeof row.position === 'string' ? row.position : null,
      team: typeof row.team === 'string' ? row.team : null,
    };
  }
  return { fetchedAt: record.fetchedAt, players };
}

export function indexPlayers(raw: Record<string, SleeperPlayerRaw>): Record<string, PlayerInfo> {
  const players: Record<string, PlayerInfo> = {};
  for (const [id, value] of Object.entries(raw)) {
    players[id] = playerInfoFromRaw(id, value);
  }
  return players;
}

export class PlayerCache {
  private players: Record<string, PlayerInfo> | null = null;
  private loadPromise: Promise<void> | null = null;

  constructor(
    private readonly client: SleeperClient,
    private readonly cachePath: string = PLAYERS_CACHE_PATH,
    private readonly cacheDir: string = CACHE_DIR,
  ) {}

  resolve(id: string): PlayerInfo {
    return resolvePlayer(id, this.players ?? {});
  }

  async lookup(id: string): Promise<PlayerInfo> {
    await this.ensureLoaded();
    return this.resolve(id);
  }

  async lookupMany(ids: string[]): Promise<PlayerInfo[]> {
    await this.ensureLoaded();
    return ids.map((id) => this.resolve(id));
  }

  async ensureLoaded(): Promise<void> {
    if (this.players) {
      return;
    }
    if (!this.loadPromise) {
      this.loadPromise = this.load().catch((err: unknown) => {
        this.loadPromise = null;
        throw err;
      });
    }
    await this.loadPromise;
  }

  private async load(): Promise<void> {
    const cached = await this.readCache();
    if (cached && isSameUtcDay(cached.fetchedAt)) {
      this.players = cached.players;
      return;
    }

    const raw = await this.client.getPlayers();
    this.players = indexPlayers(raw);
    await this.writeCache({
      fetchedAt: new Date().toISOString(),
      players: this.players,
    });
  }

  private async readCache(): Promise<PlayersCacheFile | null> {
    try {
      const text = await readFile(this.cachePath, 'utf8');
      return parsePlayersCache(text);
    } catch {
      return null;
    }
  }

  private async writeCache(data: PlayersCacheFile): Promise<void> {
    await mkdir(this.cacheDir, { recursive: true });
    await writeFile(this.cachePath, JSON.stringify(data));
  }
}
