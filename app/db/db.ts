// db.ts
import Dexie from "dexie";
import type { Table } from "dexie";

export interface NostrEvent {
  id: string;
  kind: number;
  pubkey: string;
  created_at: number;
  tags: string[][];
  content: string; // AES-encrypted JSON string
  sig: string;
  synced?: boolean;
}

export interface MetaEntry {
  id: string;
  type: "category" | "unit" | "term";
  name: string;
  description?: string;
  symbol?: string;
  days?: number;
  notes?: string;
  created_at: number;
}

export interface PendingSync {
  id?: number;
  event: NostrEvent;
  status: "pending" | "error";
  lastAttempt?: number;
}

export class POSDatabase extends Dexie {
  events!: Table<NostrEvent, string>;
  meta!: Table<MetaEntry, string>;
  pendingSync!: Table<PendingSync, number>;

  constructor() {
    super("POSDatabase");

    this.version(1).stores({
      events: "id, kind, created_at, pubkey",
      meta: "id, type",
      pendingSync: "++id, status",
    });
  }
}

export const db = new POSDatabase();
