// ============================================
// 📡 NOSTR EVENT KINDS - CENTRAL REGISTRY
// Single source of truth for all Nostr event kinds used in the POS
// Using parameterized replaceable events (kind 30000-39999)
// ============================================

/**
 * Nostr Event Kinds organized by domain
 *
 * Ranges:
 * - 30078-30099: Store Configuration
 * - 30100-30199: Catalog (Products, Categories, Units)
 * - 30200-30299: Transactions (Orders, Payments, Refunds)
 * - 30300-30399: Customers & Loyalty
 * - 30400-30499: Inventory Management
 * - 30500-30599: Staff & Access Control
 * - 30600-30699: Branch Management
 * - 30700-30799: Supply Chain (Suppliers, POs)
 */
export const NOSTR_KINDS = {
  // ─────────────────────────────────────────
  // 📋 STORE CONFIGURATION (30078-30099)
  // ─────────────────────────────────────────
  /** Store settings, config, preferences */
  STORE_SETTINGS: 30078,
  /** Table/room layout and status */
  TABLE: 30080,

  // ─────────────────────────────────────────
  // 🛍️ CATALOG DATA (30100-30199)
  // ─────────────────────────────────────────
  /** Individual product listing */
  PRODUCT: 30100,
  /** Product category/group */
  CATEGORY: 30101,
  /** Unit of measurement (pc, kg, etc.) */
  UNIT: 30102,
  /** Product modifier groups (size, toppings) */
  MODIFIER_GROUP: 30103,
  /** Ingredient for recipes */
  INGREDIENT: 30104,
  /** Recipe (ingredients + instructions) */
  RECIPE: 30105,
  /** Recipe category */
  RECIPE_CATEGORY: 30106,

  // ─────────────────────────────────────────
  // 🧾 TRANSACTIONS (30200-30299)
  // ─────────────────────────────────────────
  /** Order record */
  ORDER: 30200,
  /** Payment proof/receipt */
  PAYMENT: 30201,
  /** Refund record */
  REFUND: 30202,
  /** Invoice for customers */
  INVOICE: 30203,
  /** Invoice payment record */
  INVOICE_PAYMENT: 30204,
  /** Contract/rental agreement */
  CONTRACT: 30205,

  // ─────────────────────────────────────────
  // 👥 CUSTOMERS & LOYALTY (30300-30399)
  // ─────────────────────────────────────────
  /** Customer profile */
  CUSTOMER: 30300,
  /** Loyalty points transaction */
  LOYALTY_POINTS: 30301,
  /** Reward claim/redemption */
  LOYALTY_REWARD: 30302,
  /** Coupon/discount code */
  COUPON: 30310,
  /** Membership tier/plan */
  MEMBERSHIP: 30311,
  /** Membership subscription */
  MEMBERSHIP_SUBSCRIPTION: 30312,

  // ─────────────────────────────────────────
  // 📦 INVENTORY MANAGEMENT (30400-30499)
  // ─────────────────────────────────────────
  /** Stock adjustment record */
  STOCK_ADJUSTMENT: 30400,
  /** Inventory count session */
  INVENTORY_COUNT: 30401,
  /** Cycle count record */
  CYCLE_COUNT: 30402,

  // ─────────────────────────────────────────
  // 👤 STAFF & ACCESS CONTROL (30500-30599)
  // ─────────────────────────────────────────
  /** Staff member profile */
  STAFF_MEMBER: 30500,
  /** POS session log */
  POS_SESSION: 30501,
  /** Audit trail entry */
  AUDIT_LOG: 30502,
  /** Company code → owner pubkey mapping */
  COMPANY_INDEX: 30503,
  /** Permission grant event */
  PERMISSION_GRANT: 30510,
  /** Permission revoke event */
  PERMISSION_REVOKE: 30511,

  // ─────────────────────────────────────────
  // 🏢 BRANCH MANAGEMENT (30600-30699)
  // ─────────────────────────────────────────
  /** Branch/location details */
  BRANCH: 30600,

  // ─────────────────────────────────────────
  // 🚚 SUPPLY CHAIN (30700-30799)
  // ─────────────────────────────────────────
  /** Supplier profile */
  SUPPLIER: 30700,
  /** Branch-specific stock levels */
  BRANCH_STOCK: 30701,
  /** Purchase order */
  PURCHASE_ORDER: 30702,
  /** Inter-branch stock transfer */
  STOCK_TRANSFER: 30703,

  // ─────────────────────────────────────────
  // 💰 ACCOUNTING (30800-30899)
  // ─────────────────────────────────────────
  /** Chart of accounts entry */
  ACCOUNT: 30800,
  /** Journal entry (double-entry) */
  JOURNAL_ENTRY: 30801,
  /** Expense record */
  EXPENSE: 30802,
  /** Financial report snapshot */
  FINANCIAL_REPORT: 30803,

  // ─────────────────────────────────────────
  // 📚 HELP & DOCUMENTATION (30850-30899)
  // ─────────────────────────────────────────
  /** Dynamic help article (wiki-style) */
  HELP_ARTICLE: 30850,

  // ─────────────────────────────────────────
  // 💬 TEAM CHAT & MESSAGING (30900-30949)
  // ─────────────────────────────────────────
  /** Team chat channel metadata (replaceable) - Legacy NIP-28 */
  CHAT_CHANNEL: 30900,
  /** Chat message (regular event) - Legacy NIP-28 */
  CHAT_MESSAGE: 1234,

  // ─────────────────────────────────────────
  // 👥 GROUP CHAT - NIP-29 (Modern)
  // ─────────────────────────────────────────
  /** Group metadata (name, avatar, settings) - NIP-29 */
  GROUP_METADATA: 39000,
  /** Group admins list - NIP-29 */
  GROUP_ADMINS: 39001,
  /** Group members list - NIP-29 */
  GROUP_MEMBERS: 39002,
  /** Group chat message - NIP-29 */
  GROUP_CHAT_MESSAGE: 9,
  /** Delete message from group - NIP-29 */
  GROUP_DELETE_MESSAGE: 5,
  /** Reaction to group message - NIP-29 */
  GROUP_REACTION: 7,
} as const;

/**
 * Type for all valid Nostr event kinds
 */
export type NostrKind = (typeof NOSTR_KINDS)[keyof typeof NOSTR_KINDS];

/**
 * Get kind name from kind number (for debugging)
 */
export function getKindName(kind: number): string | undefined {
  return Object.entries(NOSTR_KINDS).find(([, v]) => v === kind)?.[0];
}

/**
 * Check if a kind is a replaceable event (30000-39999)
 */
export function isReplaceableKind(kind: number): boolean {
  return kind >= 30000 && kind < 40000;
}
