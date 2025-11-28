// db.ts
// 🗄️ IndexedDB Database for Offline-First POS
import Dexie from "dexie";
import type { Table } from "dexie";

// ============================================
// Database Types
// ============================================

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
  status: "pending" | "error" | "synced";
  lastAttempt?: number;
}

// New: Offline Payments
export interface OfflinePaymentRecord {
  id: string;
  orderId: string;
  paymentHash: string;
  preimage: string;
  amount: number;
  method: string;
  createdAt: number;
  syncStatus: "pending" | "synced" | "failed";
  syncAttempts: number;
  orderData: string; // JSON string of order
}

// New: Loyalty Members
export interface LoyaltyMemberRecord {
  id: string;
  nostrPubkey: string;
  points: number;
  tier: string;
  totalSpent: number;
  visitCount: number;
  lastVisit: number;
  joinedAt: number;
  rewardsJson: string; // JSON string of rewards array
}

// New: Local Orders (for offline support)
export interface LocalOrder {
  id: string;
  data: string; // JSON string of full order
  status: string;
  paymentMethod: string;
  total: number;
  totalSats: number;
  createdAt: number;
  syncedAt?: number;
}

// New: Exchange Rates Cache
export interface ExchangeRateCache {
  id: string; // e.g., "BTC-USD"
  from: string;
  to: string;
  rate: number;
  source: string;
  updatedAt: number;
}

// New: POS Sessions
export interface POSSessionRecord {
  id: string;
  branchId: string;
  staffId: string;
  startedAt: number;
  endedAt?: number;
  openingBalance: number;
  closingBalance?: number;
  totalSales: number;
  totalOrders: number;
  cashSales: number;
  lightningSales: number;
  status: "active" | "closed";
}

// ============================================
// Database Class
// ============================================

export class POSDatabase extends Dexie {
  events!: Table<NostrEvent, string>;
  meta!: Table<MetaEntry, string>;
  pendingSync!: Table<PendingSync, number>;
  offlinePayments!: Table<OfflinePaymentRecord, string>;
  loyaltyMembers!: Table<LoyaltyMemberRecord, string>;
  localOrders!: Table<LocalOrder, string>;
  exchangeRates!: Table<ExchangeRateCache, string>;
  posSessions!: Table<POSSessionRecord, string>;

  constructor() {
    super("POSDatabase");

    this.version(1).stores({
      events: "id, kind, created_at, pubkey",
      meta: "id, type",
      pendingSync: "++id, status",
    });

    // Version 2: Add new tables for futuristic POS
    this.version(2).stores({
      events: "id, kind, created_at, pubkey",
      meta: "id, type",
      pendingSync: "++id, status",
      offlinePayments: "id, orderId, syncStatus, createdAt",
      loyaltyMembers: "id, nostrPubkey, tier, points",
      localOrders: "id, status, createdAt, syncedAt",
      exchangeRates: "id, updatedAt",
      posSessions: "id, branchId, staffId, status, startedAt",
    });
  }
}

export const db = new POSDatabase();
