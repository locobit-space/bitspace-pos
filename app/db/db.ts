// db.ts
// 🗄️ IndexedDB Database for Offline-First POS
import Dexie from "dexie";
import type { Table } from "dexie";
import type { IngredientUnit } from "~/types";

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
  nostrEventId?: string;
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

// NEW: Products (local cache)
export interface ProductRecord {
  id: string;
  data: string; // JSON string of full product
  sku: string;
  name: string;
  categoryId: string;
  status: string;
  price: number;
  stock: number;
  updatedAt: number;
  nostrEventId?: string;
  synced: boolean;
}

// NEW: Categories (local cache)
export interface CategoryRecord {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  nostrEventId?: string;
  synced: boolean;
}

// NEW: Units (local cache)
export interface UnitRecord {
  id: string;
  name: string;
  symbol: string;
  nostrEventId?: string;
  synced: boolean;
}

// NEW: Customers (local cache)
export interface CustomerRecord {
  id: string;
  nostrPubkey: string;
  name?: string;
  phone?: string;
  email?: string;
  points: number;
  tier: string;
  totalSpent: number;
  visitCount: number;
  lastVisit: number;
  joinedAt: number;
  notes?: string;
  nostrEventId?: string;
  synced: boolean;
}

// NEW: Stock Adjustments (for offline tracking)
export interface StockAdjustmentRecord {
  id: string;
  productId: string;
  previousStock: number;
  newStock: number;
  adjustment: number;
  reason: string;
  notes?: string;
  staffId: string;
  createdAt: number;
  nostrEventId?: string;
  synced: boolean;
}

// NEW: Branches
export interface BranchRecord {
  id: string;
  name: string;
  code: string;
  address?: string;
  nostrPubkey?: string;
  bolt12Offer?: string;
  nostrEventId?: string;
  synced: boolean;
}

// NEW: Staff/Users
export interface StaffRecord {
  id: string;
  name: string;
  email?: string;
  pin?: string;
  role: string;
  permissions: string; // JSON string
  branchId?: string;
  isActive: boolean;
  nostrPubkey?: string;
  avatar?: string;
  createdAt: number;
  updatedAt: number;
  nostrEventId?: string;
  synced: boolean;
}

// ============================================
// 🧪 RECIPE & INGREDIENT DATABASE TYPES
// ============================================

// Ingredient (Raw Material)
export interface IngredientRecord {
  id: string;
  code: string;
  name: string;
  nameTh?: string;
  unit: IngredientUnit;
  baseUnit: IngredientUnit;
  conversionFactor: number;
  costPerBaseUnit: number;
  costPerUnit: number;
  currentStock: number;
  minStock: number;
  maxStock: number;
  supplierId?: string;
  categoryId?: string;
  storageType: 'ambient' | 'refrigerated' | 'frozen';
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  nostrEventId?: string;
  synced: boolean;
}

// Ingredient Category
export interface IngredientCategoryRecord {
  id: string;
  name: string;
  nameTh?: string;
  icon?: string;
  sortOrder: number;
  nostrEventId?: string;
  synced: boolean;
}

// Recipe
export interface RecipeRecord {
  id: string;
  productId: string;
  name: string;
  nameTh?: string;
  description?: string;
  servings: number;
  servingUnit: string;
  ingredientsJson: string; // JSON of RecipeIngredient[]
  stepsJson?: string; // JSON of RecipeStep[]
  totalIngredientCost: number;
  costPerServing: number;
  overheadCost: number;
  totalCostPerServing: number;
  sellingPrice: number;
  profitPerServing: number;
  profitMargin: number;
  prepTime: number;
  cookTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  categoryId?: string;
  tagsJson?: string; // JSON of string[]
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  nostrEventId?: string;
  synced: boolean;
}

// Ingredient Stock Adjustment
export interface IngredientStockAdjustmentRecord {
  id: string;
  ingredientId: string;
  type: 'purchase' | 'usage' | 'waste' | 'return' | 'adjustment' | 'count';
  previousStock: number;
  adjustment: number;
  newStock: number;
  unitCost?: number;
  totalCost?: number;
  reason: string;
  referenceId?: string;
  referenceType?: 'order' | 'purchase' | 'production' | 'manual';
  notes?: string;
  staffId: string;
  createdAt: number;
  nostrEventId?: string;
  synced: boolean;
}

// Production Plan
export interface ProductionPlanRecord {
  id: string;
  date: string;
  itemsJson: string; // JSON of ProductionPlanItem[]
  totalIngredientCost: number;
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled';
  notes?: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  nostrEventId?: string;
  synced: boolean;
}

// Low Stock Alert
export interface LowStockAlertRecord {
  id: string;
  ingredientId: string;
  currentStock: number;
  minStock: number;
  deficitAmount: number;
  suggestedPurchaseQty: number;
  estimatedCost: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: number;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
  synced: boolean;
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
  // New tables
  products!: Table<ProductRecord, string>;
  categories!: Table<CategoryRecord, string>;
  units!: Table<UnitRecord, string>;
  customers!: Table<CustomerRecord, string>;
  stockAdjustments!: Table<StockAdjustmentRecord, string>;
  branches!: Table<BranchRecord, string>;
  staff!: Table<StaffRecord, string>;
  // Recipe & Ingredient tables
  ingredients!: Table<IngredientRecord, string>;
  ingredientCategories!: Table<IngredientCategoryRecord, string>;
  recipes!: Table<RecipeRecord, string>;
  ingredientStockAdjustments!: Table<IngredientStockAdjustmentRecord, string>;
  productionPlans!: Table<ProductionPlanRecord, string>;
  lowStockAlerts!: Table<LowStockAlertRecord, string>;

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

    // Version 3: Full product & order management
    this.version(3).stores({
      events: "id, kind, created_at, pubkey",
      meta: "id, type",
      pendingSync: "++id, status",
      offlinePayments: "id, orderId, syncStatus, createdAt",
      loyaltyMembers: "id, nostrPubkey, tier, points",
      localOrders: "id, status, paymentMethod, createdAt, syncedAt",
      exchangeRates: "id, updatedAt",
      posSessions: "id, branchId, staffId, status, startedAt",
      // New in v3
      products: "id, sku, name, categoryId, status, price, stock, updatedAt, synced",
      categories: "id, name, sortOrder, synced",
      units: "id, name, symbol, synced",
      customers: "id, nostrPubkey, name, phone, tier, points, lastVisit, synced",
      stockAdjustments: "id, productId, reason, createdAt, synced",
      branches: "id, name, code, synced",
      staff: "id, name, role, branchId, isActive, synced",
    });

    // Version 4: Recipe & Ingredient Management System
    this.version(4).stores({
      events: "id, kind, created_at, pubkey",
      meta: "id, type",
      pendingSync: "++id, status",
      offlinePayments: "id, orderId, syncStatus, createdAt",
      loyaltyMembers: "id, nostrPubkey, tier, points",
      localOrders: "id, status, paymentMethod, createdAt, syncedAt",
      exchangeRates: "id, updatedAt",
      posSessions: "id, branchId, staffId, status, startedAt",
      products: "id, sku, name, categoryId, status, price, stock, updatedAt, synced",
      categories: "id, name, sortOrder, synced",
      units: "id, name, symbol, synced",
      customers: "id, nostrPubkey, name, phone, tier, points, lastVisit, synced",
      stockAdjustments: "id, productId, reason, createdAt, synced",
      branches: "id, name, code, synced",
      staff: "id, name, role, branchId, isActive, synced",
      // New in v4 - Recipe & Ingredients
      ingredients: "id, code, name, categoryId, currentStock, minStock, isActive, synced, updatedAt",
      ingredientCategories: "id, name, sortOrder, synced",
      recipes: "id, productId, name, categoryId, isActive, synced, updatedAt",
      ingredientStockAdjustments: "id, ingredientId, type, referenceId, createdAt, synced",
      productionPlans: "id, date, status, createdAt, synced",
      lowStockAlerts: "id, ingredientId, priority, createdAt, acknowledgedAt",
    });
  }
}

export const db = new POSDatabase();
