// ============================================
// 🚀 BITSPACE POS - FUTURISTIC TYPE SYSTEM
// Lightning + Nostr + Decentralised Commerce
// ============================================

// ============================================
// 💰 MULTI-CURRENCY TYPES
// ============================================

export type CurrencyCode = 'LAK' | 'THB' | 'USD' | 'BTC' | 'SATS';

export interface Currency {
  code: CurrencyCode;
  name: string;
  symbol: string;
  decimals: number;
  isDefault?: boolean;
}

export interface ExchangeRate {
  from: CurrencyCode;
  to: CurrencyCode;
  rate: number;
  source: 'api' | 'manual' | 'oracle';
  updatedAt: string;
}

export interface MultiPrice {
  LAK?: number;
  THB?: number;
  USD?: number;
  BTC?: number;
  SATS?: number;
}

// ============================================
// ⚡ LIGHTNING PAYMENT TYPES
// ============================================

export type PaymentMethod = 'lightning' | 'bolt12' | 'lnurl' | 'onchain' | 'cash' | 'qr_static';

export type PaymentStatus = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'expired' 
  | 'refunded'
  | 'offline_pending'; // For offline mode

export interface LightningInvoice {
  id: string;
  bolt11: string;
  bolt12Offer?: string; // Static QR - BOLT12
  paymentHash: string;
  preimage?: string; // Proof of payment
  amount: number; // in sats
  amountFiat?: number;
  currency?: CurrencyCode;
  description: string;
  expiresAt: string;
  createdAt: string;
  status: PaymentStatus;
  metadata?: Record<string, unknown>;
}

export interface BOLT12Offer {
  id: string;
  offer: string; // BOLT12 offer string
  description: string;
  merchantName: string;
  merchantPubkey: string;
  allowsAnyAmount: boolean;
  minAmount?: number;
  maxAmount?: number;
  currency?: CurrencyCode;
  createdAt: string;
  isActive: boolean;
}

export interface PaymentProof {
  id: string;
  orderId: string;
  paymentHash: string;
  preimage: string;
  amount: number;
  receivedAt: string;
  method: PaymentMethod;
  isOffline: boolean;
  syncedAt?: string;
  nostrEventId?: string;
}

// ============================================
// 📡 NOSTR INTEGRATION TYPES
// ============================================

export interface NostrProfile {
  pubkey: string;
  npub: string;
  name?: string;
  displayName?: string;
  picture?: string;
  nip05?: string;
  lud16?: string; // Lightning address
  about?: string;
}

export interface NostrMerchant extends NostrProfile {
  businessName: string;
  businessType: 'restaurant' | 'retail' | 'service' | 'other';
  branches: Branch[];
  bolt12Offer?: string;
  catalog?: ProductCatalog;
}

export interface ProductCatalog {
  id: string;
  merchantPubkey: string;
  products: Product[];
  categories: Category[];
  updatedAt: string;
  nostrEventId?: string;
}

// ============================================
// 🧾 E-RECEIPT TYPES
// ============================================

export interface EReceipt {
  id: string;
  orderId: string;
  merchantPubkey: string;
  customerPubkey?: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  tip?: number;
  total: number;
  currency: CurrencyCode;
  paymentProof: PaymentProof;
  createdAt: string;
  nostrEventId?: string; // Stored on Nostr
  signature?: string;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// ============================================
// 🎟️ LOYALTY & REWARDS TYPES
// ============================================

export interface LoyaltyMember {
  id: string;
  nostrPubkey: string;
  points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  totalSpent: number;
  visitCount: number;
  lastVisit: string;
  joinedAt: string;
  zapRewards: ZapReward[];
}

export interface ZapReward {
  id: string;
  memberId: string;
  amount: number; // in sats
  reason: 'purchase' | 'referral' | 'loyalty' | 'promotion';
  orderId?: string;
  zapEventId?: string;
  createdAt: string;
  claimed: boolean;
}

export interface LoyaltyProgram {
  id: string;
  merchantPubkey: string;
  name: string;
  pointsPerSat: number;
  rewardTiers: RewardTier[];
  isActive: boolean;
}

export interface RewardTier {
  name: string;
  minPoints: number;
  benefits: string[];
  zapMultiplier: number;
}

// ============================================
// 🧠 AI ANALYTICS TYPES
// ============================================

export interface SalesInsight {
  type: 'upsell' | 'trend' | 'alert' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  data?: Record<string, unknown>;
  createdAt: string;
}

export interface ProductRecommendation {
  productId: string;
  product: Product;
  reason: string;
  score: number;
  basedOn: 'history' | 'popular' | 'complementary' | 'seasonal';
}

export interface StaffPerformance {
  staffId: string;
  name: string;
  totalSales: number;
  orderCount: number;
  avgOrderValue: number;
  topProducts: string[];
  rating: number;
}

// ============================================
// 📴 OFFLINE MODE TYPES
// ============================================

export interface OfflineTransaction {
  id: string;
  orderId: string;
  paymentProof: PaymentProof;
  order: Order;
  createdAt: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  syncAttempts: number;
  lastSyncAttempt?: string;
  errorMessage?: string;
}

export interface SyncQueue {
  transactions: OfflineTransaction[];
  lastSyncedAt?: string;
  isOnline: boolean;
}

// ============================================
// 🛒 PRODUCT & ORDER TYPES (Enhanced)
// ============================================

export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  categoryId: string;
  unitId: string;
  price: number;
  prices?: MultiPrice; // Multi-currency support
  stock: number;
  minStock: number;
  branchId: string;
  status: "active" | "inactive";
  image?: string;
  createdAt: string;
  updatedAt: string;
  // AI enhancement
  upsellProducts?: string[];
  complementaryProducts?: string[];
  popularityScore?: number;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Unit {
  id: string;
  name: string;
  symbol: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  nostrPubkey?: string;
  bolt12Offer?: string;
  address?: string;
}

export interface Order {
  id: string;
  customer: string;
  customerPubkey?: string; // Nostr pubkey for loyalty
  branch: string;
  date: string;
  total: number;
  totalSats?: number;
  currency: CurrencyCode;
  status: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paymentProof?: PaymentProof;
  notes?: string;
  items: OrderItem[];
  tip?: number;
  loyaltyPointsEarned?: number;
  eReceiptId?: string;
  isOffline?: boolean;
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  product: Product;
}

// ============================================
// 📊 ANALYTICS TYPES
// ============================================

export interface SalesMetric {
  period: string;
  sales: number;
  salesSats?: number;
  orders: number;
  currency?: CurrencyCode;
}

export interface TopProduct {
  id: number | string;
  name: string;
  sales: number;
  revenue: number;
  revenueSats?: number;
}

export interface RecentOrder {
  id: string;
  customer: string;
  customerPubkey?: string;
  amount: number;
  amountSats?: number;
  status: PaymentStatus;
  time: string;
  paymentMethod?: PaymentMethod;
}

// ============================================
// 🏪 POS SESSION TYPES
// ============================================

export interface POSSession {
  id: string;
  branchId: string;
  staffId: string;
  startedAt: string;
  endedAt?: string;
  openingBalance: number;
  closingBalance?: number;
  totalSales: number;
  totalOrders: number;
  cashSales: number;
  lightningSales: number;
  status: 'active' | 'closed';
}

export interface CartItem {
  product: Product;
  quantity: number;
  price: number;
  total: number;
  notes?: string;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  totalSats: number;
  currency: CurrencyCode;
}

// ============================================
// 🔔 NOTIFICATION TYPES
// ============================================

export interface POSNotification {
  id: string;
  type: 'payment' | 'order' | 'stock' | 'loyalty' | 'ai_insight';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
  nostrEventId?: string;
}