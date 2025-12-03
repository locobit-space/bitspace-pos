// ============================================
// 🚀 BITSPACE POS - FUTURISTIC TYPE SYSTEM
// Lightning + Nostr + Decentralised Commerce
// ============================================

// ============================================
// 🧪 RECIPE & INGREDIENT TYPES
// Cost Calculation + Stock Management
// ============================================

/**
 * Unit of measurement for ingredients
 */
export type IngredientUnit = 'g' | 'kg' | 'ml' | 'l' | 'piece' | 'pack' | 'tray' | 'bottle' | 'can' | 'cup' | 'tbsp' | 'tsp';

/**
 * Raw ingredient/material used in recipes
 */
export interface Ingredient {
  id: string;
  code: string; // e.g., "F001", "C001"
  name: string;
  nameTh?: string; // Thai name (e.g., "แป้งเค้ก")
  unit: IngredientUnit;
  baseUnit: IngredientUnit; // Base unit for purchase (e.g., "kg")
  conversionFactor: number; // How many units in 1 base unit (e.g., 1000g = 1kg)
  costPerBaseUnit: number; // Cost per base unit (e.g., 40 THB/kg)
  costPerUnit: number; // Calculated: costPerBaseUnit / conversionFactor
  currentStock: number; // In base unit
  minStock: number; // Minimum stock level (in base unit)
  maxStock: number; // Maximum stock level (in base unit)
  supplierId?: string;
  lastPurchaseDate?: string;
  lastPurchasePrice?: number;
  categoryId?: string; // Ingredient category (e.g., "dry", "dairy", "fresh")
  expiryDays?: number; // Days until expiry
  storageType: 'ambient' | 'refrigerated' | 'frozen';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Category for organizing ingredients
 */
export interface IngredientCategory {
  id: string;
  name: string;
  nameTh?: string;
  icon?: string;
  sortOrder: number;
}

/**
 * Ingredient used in a recipe
 */
export interface RecipeIngredient {
  ingredientId: string;
  ingredient?: Ingredient; // Populated reference
  quantity: number; // Amount needed
  unit: IngredientUnit; // Unit for this recipe
  cost: number; // Calculated cost for this quantity
  notes?: string; // e.g., "sifted", "room temperature"
}

/**
 * Production step in a recipe
 */
export interface RecipeStep {
  order: number;
  instruction: string;
  duration?: number; // Minutes
  temperature?: number; // Celsius
  notes?: string;
}

/**
 * Recipe for a menu item
 */
export interface Recipe {
  id: string;
  productId?: string; // Links to Product (optional - recipe can exist without product link)
  product?: Product; // Populated reference
  name: string;
  nameTh?: string;
  description?: string;
  servings: number; // How many portions this recipe makes (e.g., 8 slices for 1 pound cake)
  servingUnit: string; // e.g., "slice", "plate", "cup", "portion"
  ingredients: RecipeIngredient[];
  steps?: RecipeStep[];
  // Cost calculations
  totalIngredientCost: number; // Sum of all ingredient costs
  costPerServing: number; // totalIngredientCost / servings
  overheadCost: number; // Labor, utilities, etc.
  totalCostPerServing: number; // costPerServing + overhead allocation
  // Pricing
  sellingPrice: number; // Price per serving
  profitPerServing: number; // sellingPrice - totalCostPerServing
  profitMargin: number; // (profitPerServing / sellingPrice) * 100
  // Management
  prepTime: number; // Minutes
  cookTime: number; // Minutes
  difficulty: 'easy' | 'medium' | 'hard';
  categoryId?: string;
  tags?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Stock adjustment for ingredients
 */
export interface IngredientStockAdjustment {
  id: string;
  ingredientId: string;
  ingredient?: Ingredient;
  type: 'purchase' | 'usage' | 'waste' | 'return' | 'adjustment' | 'count';
  previousStock: number;
  adjustment: number; // Positive for increase, negative for decrease
  newStock: number;
  unitCost?: number; // Cost per unit at time of adjustment
  totalCost?: number; // Total cost of adjustment
  reason: string;
  referenceId?: string; // Order ID or Purchase ID
  referenceType?: 'order' | 'purchase' | 'production' | 'manual';
  notes?: string;
  staffId: string;
  createdAt: string;
}

/**
 * Low stock alert
 */
export interface LowStockAlert {
  id: string;
  ingredientId: string;
  ingredient: Ingredient;
  currentStock: number;
  minStock: number;
  deficitAmount: number;
  suggestedPurchaseQty: number;
  estimatedCost: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

/**
 * Daily production plan
 */
export interface ProductionPlan {
  id: string;
  date: string;
  items: ProductionPlanItem[];
  totalIngredientCost: number;
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled';
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionPlanItem {
  recipeId: string;
  recipe?: Recipe;
  quantity: number; // How many batches
  totalServings: number; // quantity * recipe.servings
  ingredientCost: number;
  status: 'pending' | 'in-progress' | 'completed';
}

/**
 * Profit analytics for menu items
 */
export interface MenuProfitAnalysis {
  productId: string;
  productName: string;
  recipeId?: string;
  totalSold: number;
  totalRevenue: number;
  totalIngredientCost: number;
  totalProfit: number;
  profitMargin: number;
  avgCostPerUnit: number;
  period: string; // Date range
}

/**
 * Ingredient usage report
 */
export interface IngredientUsageReport {
  ingredientId: string;
  ingredientName: string;
  usedQuantity: number;
  unit: IngredientUnit;
  totalCost: number;
  usedInRecipes: Array<{
    recipeId: string;
    recipeName: string;
    quantity: number;
  }>;
  period: string;
}

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

export type PaymentMethod = 'lightning' | 'bolt12' | 'lnurl' | 'onchain' | 'cash' | 'qr_static' | 'bank_transfer' | 'external';

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
  // Profile info (can be fetched from Nostr profile or manually entered)
  name?: string;
  email?: string;
  phone?: string;
  lud16?: string; // Lightning address
  address?: string;
  notes?: string;
  tags?: string[];
  // Loyalty data
  points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  totalSpent: number;
  totalOrders?: number;
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
// 🎫 COUPON & DISCOUNT TYPES
// ============================================

export type CouponType = 'percentage' | 'fixed' | 'free_item' | 'buy_x_get_y';

export interface Coupon {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: CouponType;
  value: number; // percentage or fixed amount
  minOrderAmount?: number;
  maxDiscount?: number; // cap for percentage discounts
  freeItemId?: string; // for free_item type
  buyQuantity?: number; // for buy_x_get_y
  getQuantity?: number; // for buy_x_get_y
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  usedCount: number;
  perCustomerLimit?: number;
  applicableProducts?: string[]; // product IDs, empty = all
  applicableCategories?: string[]; // category IDs, empty = all
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppliedCoupon {
  coupon: Coupon;
  discountAmount: number;
  appliedAt: string;
}

// ============================================
// 🏦 BANK TRANSFER TYPES
// ============================================

export interface BankAccount {
  id: string;
  bankName: string;
  bankCode?: string;
  accountNumber: string;
  accountName: string;
  qrCode?: string; // QR code image URL or data
  isDefault?: boolean;
  isActive: boolean;
}

export interface ExternalPaymentProvider {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  isActive: boolean;
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

// Product size/variant options
export interface ProductVariant {
  id: string;
  name: string; // e.g., "Small", "Medium", "Large"
  shortName: string; // e.g., "S", "M", "L"
  priceModifier: number; // Additional price (can be negative for discounts)
  priceModifierType: 'fixed' | 'percentage';
  sku?: string;
  stock?: number;
  isDefault?: boolean;
  sortOrder: number;
}

export interface ProductModifier {
  id: string;
  name: string; // e.g., "Extra Shot", "No Ice", "Less Sugar"
  price: number; // Additional price
  category: 'addon' | 'removal' | 'preference';
  isDefault?: boolean;
}

export interface ProductModifierGroup {
  id: string;
  name: string; // e.g., "Size", "Sugar Level", "Ice Level", "Add-ons"
  type: 'single' | 'multiple'; // single = radio, multiple = checkbox
  required: boolean;
  minSelect?: number;
  maxSelect?: number;
  modifiers: ProductModifier[];
}

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
  // Variants & Modifiers
  hasVariants?: boolean;
  variants?: ProductVariant[];
  modifierGroups?: ProductModifierGroup[];
  // AI enhancement
  upsellProducts?: string[];
  complementaryProducts?: string[];
  popularityScore?: number;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
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
  // Kitchen display
  kitchenStatus?: 'new' | 'preparing' | 'ready' | 'served';
  kitchenNotes?: string;
  preparedAt?: string;
  servedAt?: string;
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
  // Variant & modifier selections
  selectedVariant?: ProductVariant;
  selectedModifiers?: ProductModifier[];
  // Custom notes (e.g., "no onions", "extra spicy")
  notes?: string;
  // Kitchen tracking
  kitchenStatus?: 'pending' | 'preparing' | 'ready';
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
  price: number; // Base price + variant + modifiers
  total: number;
  // Variant & modifiers
  selectedVariant?: ProductVariant;
  selectedModifiers?: ProductModifier[];
  // Custom notes for kitchen
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

// ============================================
// 👤 USER & ROLE MANAGEMENT TYPES
// ============================================

export type UserRole = 'owner' | 'admin' | 'cashier' | 'staff';

// Authentication method - supports hybrid auth
export type AuthMethod = 'nostr' | 'password' | 'pin';

export interface UserPermissions {
  // POS Operations
  canCreateOrders: boolean;
  canVoidOrders: boolean;
  canApplyDiscounts: boolean;
  canProcessRefunds: boolean;
  // Product Management
  canViewProducts: boolean;
  canEditProducts: boolean;
  canDeleteProducts: boolean;
  // Customer Management
  canViewCustomers: boolean;
  canEditCustomers: boolean;
  // Reports & Analytics
  canViewReports: boolean;
  canExportReports: boolean;
  // Settings
  canViewSettings: boolean;
  canEditSettings: boolean;
  canManageLightning: boolean;
  canManageUsers: boolean;
  // Inventory
  canViewInventory: boolean;
  canEditInventory: boolean;
  canAdjustStock: boolean;
}

export const DEFAULT_PERMISSIONS: Record<UserRole, UserPermissions> = {
  owner: {
    canCreateOrders: true,
    canVoidOrders: true,
    canApplyDiscounts: true,
    canProcessRefunds: true,
    canViewProducts: true,
    canEditProducts: true,
    canDeleteProducts: true,
    canViewCustomers: true,
    canEditCustomers: true,
    canViewReports: true,
    canExportReports: true,
    canViewSettings: true,
    canEditSettings: true,
    canManageLightning: true,
    canManageUsers: true,
    canViewInventory: true,
    canEditInventory: true,
    canAdjustStock: true,
  },
  admin: {
    canCreateOrders: true,
    canVoidOrders: true,
    canApplyDiscounts: true,
    canProcessRefunds: true,
    canViewProducts: true,
    canEditProducts: true,
    canDeleteProducts: false,
    canViewCustomers: true,
    canEditCustomers: true,
    canViewReports: true,
    canExportReports: true,
    canViewSettings: true,
    canEditSettings: true,
    canManageLightning: false,
    canManageUsers: false,
    canViewInventory: true,
    canEditInventory: true,
    canAdjustStock: true,
  },
  cashier: {
    canCreateOrders: true,
    canVoidOrders: false,
    canApplyDiscounts: true,
    canProcessRefunds: false,
    canViewProducts: true,
    canEditProducts: false,
    canDeleteProducts: false,
    canViewCustomers: true,
    canEditCustomers: false,
    canViewReports: false,
    canExportReports: false,
    canViewSettings: false,
    canEditSettings: false,
    canManageLightning: false,
    canManageUsers: false,
    canViewInventory: true,
    canEditInventory: false,
    canAdjustStock: false,
  },
  staff: {
    canCreateOrders: true,
    canVoidOrders: false,
    canApplyDiscounts: false,
    canProcessRefunds: false,
    canViewProducts: true,
    canEditProducts: false,
    canDeleteProducts: false,
    canViewCustomers: false,
    canEditCustomers: false,
    canViewReports: false,
    canExportReports: false,
    canViewSettings: false,
    canEditSettings: false,
    canManageLightning: false,
    canManageUsers: false,
    canViewInventory: true,
    canEditInventory: false,
    canAdjustStock: false,
  },
};

export interface StoreUser {
  id: string;
  name: string;
  email?: string;
  pin?: string; // For quick POS login (hashed)
  role: UserRole;
  permissions: UserPermissions;
  branchId?: string; // Optional - restrict to specific branch
  isActive: boolean;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  
  // ============================================
  // 🔐 HYBRID AUTHENTICATION FIELDS
  // ============================================
  
  // Primary authentication method
  authMethod: AuthMethod;
  
  // Nostr authentication (for tech-savvy users)
  npub?: string; // Nostr public key (npub format)
  pubkeyHex?: string; // Nostr public key (hex format)
  
  // Password authentication (for traditional users)
  passwordHash?: string; // Hashed password
  
  // ============================================
  // 🛡️ PERMISSION & ACCESS CONTROL
  // ============================================
  
  // Permission event tracking (for Nostr-based revocation)
  permissionGrantId?: string; // ID of the permission grant event
  grantedBy?: string; // npub of who granted access
  grantedAt?: string; // When permission was granted
  expiresAt?: string; // Auto-expiry date (optional)
  revokedAt?: string; // If access was revoked
  revocationReason?: string; // Why access was revoked
  
  // Security
  failedLoginAttempts?: number;
  lockedUntil?: string; // Account lockout
  mustChangePassword?: boolean;
  passwordChangedAt?: string;
}

// ============================================
// ⚙️ STORE SETTINGS TYPES
// ============================================

export type LightningProvider = 'lnbits' | 'alby' | 'alby-hub' | 'blink' | 'nwc' | 'lnd' | 'cln' | 'lnurl';

export interface LightningSettings {
  provider: LightningProvider;
  nodeUrl?: string; // LNbits URL, LND REST, Alby Hub URL
  apiKey?: string; // LNbits Admin/Invoice key
  accessToken?: string; // Alby Hub access token
  blinkApiKey?: string; // Blink API key
  blinkWalletId?: string; // Blink wallet ID
  macaroon?: string; // LND macaroon (hex)
  rune?: string; // CLN rune
  nwcConnectionString?: string; // NWC connection string (nostr+walletconnect://...)
  lightningAddress?: string; // name@domain.com (for LNURL-pay)
  bolt12Offer?: string; // Static QR
  isConfigured: boolean;
  lastTestedAt?: string;
  testStatus?: 'success' | 'failed' | 'pending';
}

export interface SecuritySettings {
  dataEncryption: boolean;
  encryptionKey?: string; // Encrypted with master password
  autoLockTimeout: number; // Minutes
  requirePinForRefunds: boolean;
  requirePinForVoids: boolean;
  requirePinForDiscounts: boolean;
  auditLogging: boolean;
}

export interface GeneralSettings {
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  storeEmail?: string;
  storeLogo?: string;
  defaultCurrency: CurrencyCode;
  taxRate: number; // Percentage
  tipEnabled: boolean;
  tipSuggestions: number[]; // e.g., [10, 15, 20]
  receiptFooter?: string;
  language: string;
  timezone: string;
}

export interface StoreSettings {
  general: GeneralSettings;
  lightning: LightningSettings;
  security: SecuritySettings;
  updatedAt: string;
}

// ============================================
// 🔐 ENCRYPTION TYPES
// ============================================

export interface EncryptedData {
  iv: string; // Initialization vector (base64)
  data: string; // Encrypted data (base64)
  tag?: string; // Auth tag for GCM mode
}

export interface SecurityAuditLog {
  id: string;
  action: 'login' | 'logout' | 'settings_change' | 'refund' | 'void' | 'role_change' | 'permission_grant' | 'permission_revoke';
  userId: string;
  userName: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

// ============================================
// 🎫 PERMISSION EVENT TYPES (Nostr-based)
// ============================================

export type PermissionEventKind = 30078 | 30079; // 30078 = grant, 30079 = revoke

export interface PermissionGrant {
  id: string;
  kind: 30078;
  storeId: string;
  storeName: string;
  granterPubkey: string; // Owner/Admin who granted
  granterNpub: string;
  granteePubkey: string; // Staff member receiving permission
  granteeNpub: string;
  role: UserRole;
  permissions: UserPermissions;
  createdAt: string;
  expiresAt?: string;
  signature?: string; // Nostr event signature
  nostrEventId?: string;
}

export interface PermissionRevocation {
  id: string;
  kind: 30079;
  storeId: string;
  revokerPubkey: string; // Owner/Admin who revoked
  revokerNpub: string;
  revokeePubkey: string; // Staff member being revoked
  revokeeNpub: string;
  grantId: string; // Reference to the grant being revoked
  reason?: string;
  createdAt: string;
  signature?: string;
  nostrEventId?: string;
}

// ============================================
// 🏪 STORE IDENTITY TYPES
// ============================================

export interface StoreIdentity {
  id: string;
  name: string;
  npub: string; // Store's Nostr public key
  pubkeyHex: string;
  ownerNpub: string; // Owner's personal npub
  ownerPubkeyHex: string;
  createdAt: string;
  // Store key is used for data encryption
  // The actual nsec is encrypted with owner's master password
  encryptedStoreKey?: string;
}

// ============================================
// 🔑 AUTH SESSION TYPES
// ============================================

export interface AuthSession {
  userId: string;
  npub?: string;
  authMethod: AuthMethod;
  loginAt: string;
  expiresAt: string;
  isValid: boolean;
  deviceId?: string;
  ipAddress?: string;
}

export interface AuthChallenge {
  id: string;
  challenge: string; // Random string to sign
  createdAt: string;
  expiresAt: string;
  npub: string; // Who should sign this
  isUsed: boolean;
}