// ============================================
// 🚀 bnos.space - FUTURISTIC TYPE SYSTEM
// Lightning + Nostr + Decentralised Commerce
// ============================================

// ============================================
// 🏪 SHOP CONFIGURATION TYPES
// Visibility, Type & Templates for Easy Setup
// ============================================

/**
 * Shop visibility - determines if discoverable in marketplace
 */
export type ShopVisibility = "private" | "public";

/**
 * Shop type categories with associated product templates
 */
export type ShopType =
  | "cafe"
  | "restaurant"
  | "retail"
  | "grocery"
  | "service"
  | "pharmacy"
  | "gym"
  | "karaoke"
  | "garage"
  | "enterprise"
  | "other";

/**
 * Shop type metadata for UI display
 */
export interface ShopTypeMeta {
  type: ShopType;
  name: string;
  nameLao: string;
  icon: string;
  description: string;
  descriptionLao: string;
}

/**
 * Category template for quick store setup
 */
export interface CategoryTemplate {
  id: string;
  name: string;
  nameLao?: string;
  icon?: string;
  sortOrder: number;
}

/**
 * Product template for quick store setup
 */
export interface ProductTemplate {
  id: string;
  name: string;
  nameLao?: string;
  description?: string;
  categoryId: string;
  price: number;
  image?: string;
}

/**
 * Complete shop type configuration with templates
 */
export interface ShopTypeConfig {
  type: ShopType;
  meta: ShopTypeMeta;
  categories: CategoryTemplate[];
  products: ProductTemplate[];
}

// ============================================
// 💳 MEMBERSHIP & SUBSCRIPTION TYPES
// For Gym, Clubs, and Subscription-Based Businesses
// ============================================

/**
 * Membership plan status
 */
export type MembershipStatus =
  | "active"
  | "expired"
  | "cancelled"
  | "suspended"
  | "pending";

/**
 * Membership plan configuration
 */
export interface MembershipPlan {
  id: string;
  name: string;
  nameLao?: string;
  description?: string;
  descriptionLao?: string;
  duration: number; // days
  price: number;
  currency?: string;
  benefits: string[];
  benefitsLao?: string[];
  maxCheckIns?: number; // unlimited if not set
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Customer membership record
 */
export interface Membership {
  id: string;
  customerId: string;
  customerName?: string;
  planId: string;
  planName?: string;
  status: MembershipStatus;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  checkInCount: number;
  lastCheckIn?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Check-in record for membership tracking
 */
export interface MembershipCheckIn {
  id: string;
  membershipId: string;
  customerId: string;
  checkInTime: string;
  checkOutTime?: string;
  notes?: string;
}

// ============================================
// 👥 EMPLOYEE & PAYROLL TYPES
// Enterprise HR, Time Tracking & Payroll
// ============================================

/**
 * Employment type classification
 */
export type EmploymentType =
  | "full-time"
  | "part-time"
  | "contract"
  | "intern"
  | "freelance";

/**
 * Employee status
 */
export type EmployeeStatus = "active" | "inactive" | "on-leave" | "terminated";

/**
 * Salary calculation method
 */
export type SalaryType = "hourly" | "daily" | "weekly" | "monthly";

/**
 * Attendance status for a day
 */
export type AttendanceStatus =
  | "present"
  | "absent"
  | "late"
  | "leave"
  | "holiday"
  | "half-day";

/**
 * Leave type categories
 */
export type LeaveType =
  | "annual"
  | "sick"
  | "personal"
  | "maternity"
  | "paternity"
  | "unpaid"
  | "other";

/**
 * Payment method for payroll
 */
export type EmployeePaymentMethod = "cash" | "bank" | "lightning" | "check";

/**
 * Payment status
 */
export type EmployeePaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled";

/**
 * Employee profile with HR information
 */
export interface Employee {
  id: string;

  // Basic Info
  firstName: string;
  lastName: string;
  displayName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other";
  nationalId?: string;

  // Address
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;

  // Emergency Contact
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;

  // Employment Details
  employeeCode: string;
  department?: string;
  position?: string;
  employmentType: EmploymentType;
  hireDate: string;
  probationEndDate?: string;
  terminationDate?: string;
  terminationReason?: string;
  status: EmployeeStatus;
  branchId?: string;

  // Compensation
  salaryType: SalaryType;
  baseSalary: number;
  currency: string;
  overtimeRate?: number; // Multiplier (e.g., 1.5 for time-and-a-half)

  // Payment Info
  bankName?: string;
  bankAccount?: string;
  lightningAddress?: string;
  preferredPaymentMethod: EmployeePaymentMethod;

  // Deductions & Benefits
  socialSecurityNumber?: string;
  taxId?: string;
  insuranceNumber?: string;

  // Leave Balances
  annualLeaveBalance: number;
  sickLeaveBalance: number;
  personalLeaveBalance: number;

  // POS Access
  userId?: string;
  canAccessPOS: boolean;
  pin?: string;

  // Commission Settings
  commissionEnabled: boolean;
  commissionRate?: number; // Percentage of sales

  // Nostr Integration
  npub?: string;

  // Metadata
  notes?: string;
  documents?: string[]; // URLs to uploaded documents
  createdAt: string;
  updatedAt: string;
}

/**
 * Daily attendance record
 */
export interface Attendance {
  id: string;
  employeeId: string;
  employeeName?: string;
  date: string;

  // Time Records
  clockIn?: string;
  clockInPhoto?: string;
  clockOut?: string;
  clockOutPhoto?: string;

  // Break Time
  breakStart?: string;
  breakEnd?: string;
  breakMinutes: number;

  // Calculated Hours
  scheduledHours?: number;
  workedHours: number;
  overtimeHours: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;

  // Status
  status: AttendanceStatus;
  leaveType?: LeaveType;

  // Location (if GPS tracking)
  clockInLocation?: { lat: number; lng: number };
  clockOutLocation?: { lat: number; lng: number };

  // Metadata
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Shift schedule assignment
 */
export interface Shift {
  id: string;
  employeeId: string;
  employeeName?: string;
  branchId?: string;

  // Schedule
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;

  // Details
  role?: string;
  color?: string;
  isPublished: boolean;

  // Swap/Cover
  originalEmployeeId?: string; // If shift was swapped
  swapRequestedAt?: string;

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Leave request
 */
export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName?: string;

  // Leave Details
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string;

  // Approval
  status: "pending" | "approved" | "rejected" | "cancelled";
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;

  // Documents
  attachments?: string[];

  createdAt: string;
  updatedAt: string;
}

/**
 * Payroll run - batch processing for a pay period
 */
export interface PayrollRun {
  id: string;

  // Period
  periodStart: string;
  periodEnd: string;
  periodType: "weekly" | "bi-weekly" | "monthly";

  // Run Info
  runDate: string;
  runBy?: string;
  status:
    | "draft"
    | "calculating"
    | "review"
    | "approved"
    | "processing"
    | "completed"
    | "cancelled";

  // Totals
  employeeCount: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  totalCommissions: number;
  totalBonuses: number;
  currency: string;

  // Payment Breakdown
  cashPayments: number;
  bankPayments: number;
  lightningPayments: number;

  // Metadata
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Individual payslip for an employee
 */
export interface Payslip {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;

  // Period
  periodStart: string;
  periodEnd: string;

  // Work Summary
  daysWorked: number;
  hoursWorked: number;
  overtimeHours: number;
  leaveDays: number;
  absentDays: number;

  // Earnings
  basePay: number;
  overtimePay: number;
  commission: number;
  tips: number;
  bonus: number;
  allowances: number;
  otherEarnings: number;
  grossPay: number;

  // Deductions
  incomeTax: number;
  socialSecurity: number;
  healthInsurance: number;
  loanRepayment: number;
  advances: number;
  otherDeductions: number;
  totalDeductions: number;

  // Net Pay
  netPay: number;
  currency: string;

  // Payment
  paymentMethod: EmployeePaymentMethod;
  paymentStatus: EmployeePaymentStatus;
  paymentReference?: string;
  paidAt?: string;

  // Lightning Payment
  lightningInvoice?: string;
  lightningPreimage?: string;

  // Metadata
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payroll deduction/addition template
 */
export interface PayrollItem {
  id: string;
  name: string;
  nameLao?: string;
  type: "earning" | "deduction";
  category:
    | "salary"
    | "overtime"
    | "commission"
    | "bonus"
    | "allowance"
    | "tax"
    | "insurance"
    | "loan"
    | "other";
  calculationType: "fixed" | "percentage" | "hourly" | "per-day";
  amount: number; // Fixed amount or percentage
  isDefault: boolean;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// 🧪 RECIPE & INGREDIENT TYPES
// Cost Calculation + Stock Management
// ============================================

/**
 * Unit of measurement for ingredients
 */
export type IngredientUnit =
  | "g"
  | "kg"
  | "ml"
  | "l"
  | "piece"
  | "pack"
  | "tray"
  | "bottle"
  | "can"
  | "cup"
  | "tbsp"
  | "tsp";

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
  storageType: "ambient" | "refrigerated" | "frozen";
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
  difficulty: "easy" | "medium" | "hard";
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
  type: "purchase" | "usage" | "waste" | "return" | "adjustment" | "count";
  previousStock: number;
  adjustment: number; // Positive for increase, negative for decrease
  newStock: number;
  unitCost?: number; // Cost per unit at time of adjustment
  totalCost?: number; // Total cost of adjustment
  reason: string;
  referenceId?: string; // Order ID or Purchase ID
  referenceType?: "order" | "purchase" | "production" | "manual";
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
  priority: "low" | "medium" | "high" | "critical";
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

// ============================================
// 📦 STOCK LOT/BATCH TRACKING TYPES
// FIFO/FEFO Inventory Management with Expiry
// ============================================

/**
 * Storage location/position in warehouse
 */
export interface StoragePosition {
  id: string;
  branchId: string;
  zone: string; // e.g., "A", "B", "Cold Storage", "Freezer"
  rack?: string; // e.g., "R1", "R2"
  shelf?: string; // e.g., "S1", "S2"
  bin?: string; // e.g., "B01", "B02"
  fullCode: string; // Combined: "A-R1-S2-B01"
  description?: string;
  capacity?: number; // Optional capacity limit
  storageType: "ambient" | "refrigerated" | "frozen" | "controlled";
  temperature?: { min: number; max: number }; // Temperature range if applicable
  isActive: boolean;
}

/**
 * Stock Lot/Batch - Each received batch tracked separately
 * Enables FIFO (First In First Out) or FEFO (First Expired First Out)
 */
export interface StockLot {
  id: string;
  productId: string;
  product?: Product;
  branchId: string;
  // Lot/Batch Information
  lotNumber: string; // Supplier's batch number or internal
  batchCode?: string; // Internal batch code (auto-generated)
  // Quantity Tracking
  initialQuantity: number; // Original received quantity
  currentQuantity: number; // Current remaining quantity
  reservedQuantity: number; // Reserved for pending orders
  availableQuantity: number; // currentQuantity - reservedQuantity
  // Expiry & Dates
  manufacturingDate?: string; // When product was made
  expiryDate?: string; // Product expiration date
  bestBeforeDate?: string; // Best before (quality, not safety)
  receivedDate: string; // When received in warehouse
  // Status & Alerts
  status:
    | "available"
    | "low"
    | "expiring"
    | "expired"
    | "quarantine"
    | "depleted";
  daysUntilExpiry?: number; // Calculated field
  expiryAlertSent?: boolean;
  // Storage Location
  positionId?: string;
  position?: StoragePosition;
  positionCode?: string; // Quick reference: "A-R1-S2"
  // Supplier & Cost
  supplierId?: string;
  supplierName?: string;
  purchaseOrderId?: string;
  costPrice: number; // Cost per unit at time of receipt
  totalCost: number; // initialQuantity * costPrice
  // Quality
  qualityGrade?: "A" | "B" | "C";
  qualityNotes?: string;
  inspectedAt?: string;
  inspectedBy?: string;
  // Metadata
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Stock Receipt/Goods Received - When receiving stock
 */
export interface StockReceipt {
  id: string;
  branchId: string;
  supplierId?: string;
  supplierName?: string;
  purchaseOrderId?: string;
  // Receipt Details
  receiptNumber: string; // GRN number (Goods Received Note)
  receiptDate: string;
  deliveryNote?: string;
  invoiceNumber?: string;
  // Items Received
  items: StockReceiptItem[];
  // Totals
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  // Status
  status:
    | "draft"
    | "pending_inspection"
    | "inspected"
    | "completed"
    | "rejected";
  inspectionNotes?: string;
  // Metadata
  receivedBy: string;
  inspectedBy?: string;
  approvedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Individual item in a stock receipt
 */
export interface StockReceiptItem {
  productId: string;
  productName: string;
  productSku: string;
  // Quantity
  orderedQty?: number; // From PO if linked
  receivedQty: number;
  acceptedQty: number; // After inspection
  rejectedQty: number;
  // Lot Details
  lotNumber: string;
  manufacturingDate?: string;
  expiryDate?: string;
  // Position
  positionId?: string;
  positionCode?: string;
  // Cost
  unitCost: number;
  totalCost: number;
  // Notes
  notes?: string;
  rejectionReason?: string;
}

/**
 * Expiry alert configuration
 */
export interface ExpiryAlertConfig {
  warningDays: number; // Alert when X days before expiry (e.g., 30)
  criticalDays: number; // Critical alert (e.g., 7)
  urgentDays: number; // Urgent/immediate action (e.g., 3)
  autoQuarantine: boolean; // Auto-quarantine expired items
  notifyEmail?: boolean;
  notifyPush?: boolean;
}

/**
 * Stock movement with lot tracking
 */
export interface LotStockMovement {
  id: string;
  lotId: string;
  lot?: StockLot;
  productId: string;
  branchId: string;
  type:
    | "receipt"
    | "sale"
    | "transfer_in"
    | "transfer_out"
    | "adjustment"
    | "waste"
    | "return"
    | "production";
  quantity: number; // Positive for in, negative for out
  previousQty: number;
  newQty: number;
  // Reference
  referenceType?:
    | "order"
    | "purchase_order"
    | "transfer"
    | "production"
    | "manual";
  referenceId?: string;
  reason: string;
  notes?: string;
  // Cost tracking
  unitCost?: number;
  totalCost?: number;
  // Position change
  fromPositionId?: string;
  toPositionId?: string;
  // Metadata
  createdBy: string;
  createdAt: string;
}

/**
 * Daily production plan
 */
export interface ProductionPlan {
  id: string;
  date: string;
  items: ProductionPlanItem[];
  totalIngredientCost: number;
  status: "planned" | "in-progress" | "completed" | "cancelled";
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
  status: "pending" | "in-progress" | "completed";
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

export type CurrencyCode = "LAK" | "THB" | "USD" | "BTC" | "SATS";

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
  source: "api" | "manual" | "oracle";
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

export type PaymentMethod =
  | "lightning"
  | "bolt12"
  | "lnurl"
  | "onchain"
  | "bitcoin"
  | "usdt"
  | "cash"
  | "qr_static"
  | "bank_transfer"
  | "external";

export type PaymentStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "expired"
  | "refunded"
  | "offline_pending"
  | "cancelled"; // For offline mode

// USDT Network Types
export type USDTNetwork = "tron" | "polygon" | "ethereum" | "arbitrum";

// Crypto Provider Types
export type CryptoProvider = "btcpay" | "blockonomics" | "manual";

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
// ₿ BITCOIN ON-CHAIN PAYMENT TYPES
// ============================================

export interface BitcoinPayment {
  id: string;
  orderId: string;
  address: string; // BTC receiving address
  amountBTC: string; // Amount in BTC (string for precision)
  amountSats: number; // Amount in satoshis
  amountFiat: number; // Original fiat amount
  currency: CurrencyCode;
  exchangeRate: number; // BTC/fiat rate at time of creation
  txid?: string; // Transaction ID once detected
  confirmations: number; // Current confirmation count
  requiredConfirmations: number; // Required confirmations (1-6)
  status: PaymentStatus;
  expiresAt: string;
  createdAt: string;
  confirmedAt?: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// 💵 USDT STABLECOIN PAYMENT TYPES
// ============================================

export interface USDTPayment {
  id: string;
  orderId: string;
  network: USDTNetwork; // Tron, Polygon, Ethereum
  address: string; // USDT receiving address
  amountUSDT: string; // Exact USDT amount (string for precision)
  amountFiat: number; // Original fiat amount
  currency: CurrencyCode;
  exchangeRate: number; // USD/fiat rate
  txHash?: string; // Transaction hash once detected
  confirmations: number;
  requiredConfirmations: number;
  status: PaymentStatus;
  networkFee?: string; // Estimated network fee
  expiresAt: string;
  createdAt: string;
  confirmedAt?: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// ⚙️ CRYPTO SETTINGS TYPES
// ============================================

export interface CryptoSettings {
  // Bitcoin On-Chain
  bitcoinEnabled: boolean;
  bitcoinProvider: CryptoProvider;
  // BTCPay Server
  btcpayServerUrl?: string;
  btcpayApiKey?: string;
  btcpayStoreId?: string;
  // Blockonomics
  blockonomicsApiKey?: string;
  // Manual / Shared
  bitcoinAddress?: string; // Static receive address
  bitcoinXpub?: string; // xpub for address derivation
  bitcoinRequiredConfirmations: number; // 1, 3, or 6

  // USDT
  usdtEnabled: boolean;
  usdtDefaultNetwork: USDTNetwork;
  usdtAddresses: {
    tron?: string;
    polygon?: string;
    ethereum?: string;
    arbitrum?: string;
  };
  usdtRequiredConfirmations: number;

  // General
  isConfigured: boolean;
  lastTestedAt?: string;
  testStatus?: "success" | "failed";
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
  businessType: "restaurant" | "retail" | "service" | "other";
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
  // Credit/Payment terms
  defaultPaymentTermId?: string; // Reference to PaymentTerm
  creditLimit?: number; // Maximum credit allowed
  currentBalance?: number; // Outstanding balance
  // Loyalty data
  points: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
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
  reason: "purchase" | "referral" | "loyalty" | "promotion";
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

export type CouponType = "percentage" | "fixed" | "free_item" | "buy_x_get_y";

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
  type: "upsell" | "trend" | "alert" | "recommendation";
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
  basedOn: "history" | "popular" | "complementary" | "seasonal";
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
  syncStatus: "pending" | "syncing" | "synced" | "failed";
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
  priceModifierType: "fixed" | "percentage";
  sku?: string;
  stock?: number;
  isDefault?: boolean;
  sortOrder: number;
}

export interface ProductModifier {
  id: string;
  name: string; // e.g., "Extra Shot", "No Ice", "Less Sugar"
  price: number; // Additional price
  category: "addon" | "removal" | "preference";
  isDefault?: boolean;
}

export interface ProductModifierGroup {
  id: string;
  name: string; // e.g., "Size", "Sugar Level", "Ice Level", "Add-ons"
  type: "single" | "multiple"; // single = radio, multiple = checkbox
  required: boolean;
  minSelect?: number;
  maxSelect?: number;
  modifiers: ProductModifier[];
}

// Product Type - determines stock behavior
export type ProductType =
  | "good"
  | "service"
  | "digital"
  | "subscription"
  | "bundle";

/**
 * Product Activity Log - Track all changes to products
 */
export interface ProductActivityLog {
  id: string;
  productId: string;
  action:
    | "create"
    | "update"
    | "delete"
    | "price_change"
    | "stock_adjust"
    | "status_change"
    | "restore";
  userId: string;
  userName?: string;
  userRole?: string;
  timestamp: string;
  // Change details
  changes?: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  // For stock adjustments
  stockBefore?: number;
  stockAfter?: number;
  stockReason?: string;
  // For price changes
  priceBefore?: number;
  priceAfter?: number;
  // Reference
  referenceType?: "order" | "purchase" | "adjustment" | "transfer" | "manual";
  referenceId?: string;
  // Metadata
  notes?: string;
  ipAddress?: string;
  deviceInfo?: string;
  // Nostr sync
  nostrEventId?: string;
  syncedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string; // EAN-13, UPC-A, Code128, QR code
  barcodeType?: "ean13" | "upca" | "code128" | "qr" | "custom";
  description?: string;
  categoryId: string;
  unitId: string;
  price: number;
  prices?: MultiPrice; // Multi-currency support
  costPrice?: number; // Cost price for inventory valuation
  stock: number;
  minStock: number;
  branchId: string;
  status: "active" | "inactive";
  image?: string;
  // Gallery images
  images?: string[];
  // Additional info
  brand?: string;
  manufacturer?: string;
  weight?: number;
  weightUnit?: "g" | "kg" | "oz" | "lb";
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: "cm" | "in";
  };
  // Timestamps
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  // Product Type & Stock Tracking
  productType?: ProductType; // Default: 'good'
  trackStock?: boolean; // Default: true for 'good', false for 'service'/'digital'
  // Expiry & Lot Tracking
  hasExpiry?: boolean; // Does this product expire?
  defaultShelfLifeDays?: number; // Default shelf life in days (e.g., 30, 90, 365)
  trackLots?: boolean; // Enable lot/batch tracking (for FIFO/FEFO)
  requiresExpiryDate?: boolean; // Must enter expiry when receiving stock
  expiryWarningDays?: number; // Alert X days before expiry (default from system config)
  storageType?: "ambient" | "refrigerated" | "frozen" | "controlled";
  storageInstructions?: string;
  // Variants & Modifiers
  hasVariants?: boolean;
  variants?: ProductVariant[];
  modifierGroups?: ProductModifierGroup[];
  // AI enhancement
  upsellProducts?: string[];
  complementaryProducts?: string[];
  popularityScore?: number;
  // Tags for better search
  tags?: string[];
  // Tax
  taxable?: boolean;
  taxRate?: number;
  // Public menu visibility
  isPublic?: boolean; // If true, visible on customer menu (unencrypted)
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
  status?: "active" | "inactive";
}

// Order Types (dine-in, take-away, delivery)
export type OrderType = "dine_in" | "take_away" | "delivery" | "pickup";

export interface Order {
  id: string;
  customer: string;
  customerEmail?: string;
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
  // Order type
  orderType?: OrderType;
  tableNumber?: string; // For dine-in
  deliveryAddress?: string; // For delivery
  customerPhone?: string; // For delivery/pickup
  scheduledTime?: string; // For scheduled pickup/delivery
  // Kitchen display
  kitchenStatus?: "new" | "preparing" | "ready" | "served";
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
  kitchenStatus?:
    | "new"
    | "pending"
    | "preparing"
    | "cooking"
    | "ready"
    | "served"
    | "cancelled";
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
  status: "active" | "closed";
}

export interface CartItem {
  id?: string; // Optional: ID from existing order (for editing)
  kitchenStatus?:
    | "new"
    | "pending"
    | "preparing"
    | "cooking"
    | "ready"
    | "served"
    | "cancelled";
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

export type NotificationPriority = "low" | "medium" | "high" | "critical";

export interface POSNotification {
  id: string;
  type:
    | "payment"
    | "order"
    | "stock"
    | "loyalty"
    | "ai_insight"
    | "alert"
    | "system";
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
  priority?: NotificationPriority;
  actionUrl?: string; // Link to navigate when clicked
  expiresAt?: string; // Auto-dismiss after this time
  nostrEventId?: string;
}

// ============================================
// 👤 USER & ROLE MANAGEMENT TYPES
// ============================================

export type UserRole = "owner" | "admin" | "cashier" | "staff";

// Authentication method - supports hybrid auth
export type AuthMethod = "nostr" | "password" | "pin";

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
  deletedAt?: string; // For soft delete

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

export type LightningProvider =
  | "lnbits"
  | "alby"
  | "alby-hub"
  | "blink"
  | "nwc"
  | "lnd"
  | "cln"
  | "lnurl";

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
  testStatus?: "success" | "failed" | "pending";
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

export interface PaymentTerm {
  id: string;
  name: string;
  days: number;
  description: string;
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
  paymentTerms?: PaymentTerm[];
  enabledFeatures?: Record<string, boolean>; // Feature flags
}

export interface StoreSettings {
  // Company/Shop Info
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  taxNumber?: string;
  companyAddress?: string;

  // Regional Settings
  defaultCurrency?: string;
  defaultLanguage?: string;
  dateFormat?: string;
  timeFormat?: string;
  timezone?: string;
  decimalPlaces?: number;

  // Nested settings (legacy support)
  general?: GeneralSettings;
  lightning?: LightningSettings;
  security?: SecuritySettings;

  // New settings sections
  appearance?: AppearanceSettings;
  customization?: CustomizationSettings;
  notificationSettings?: NotificationPreferences;
  relays?: RelayConfig[];

  // Accounting settings
  accounting?: {
    enabled: boolean; // ON/OFF toggle for auto journal entries
    standard: "global" | "lao"; // Accounting standard
    vatRate: number; // VAT rate (0.10 = 10%)
    autoPostJournals: boolean; // Auto-post or require approval
    fiscalYearStart: string; // "01-01" format
  };

  updatedAt?: string;
}

// ============================================
// 🎨 APPEARANCE SETTINGS
// ============================================

export interface AppearanceSettings {
  theme: "system" | "light" | "dark";
  accentColor: string;
  fontSize: "small" | "medium" | "large";
  fontFamily: string;
  compactMode: boolean;
  sidebarPosition: "left" | "right";
  highContrast: boolean;
  reduceMotion: boolean;
}

// ============================================
// ⚙️ CUSTOMIZATION SETTINGS
// ============================================

export interface CustomizationSettings {
  // Feed Display
  defaultView: "timeline" | "grid" | "compact";
  showReposts: boolean;
  showReplies: boolean;
  contentDensity: "compact" | "normal" | "comfortable";
  // UI Preferences
  animationSpeed: "fast" | "normal" | "slow";
  hapticFeedback: boolean;
  autoPlayMedia: boolean;
  imageQuality: "low" | "medium" | "high";
  // POS Settings
  gridColumns: number;
  cartPosition: "left" | "right" | "bottom";
  quickActions: QuickActionConfig[];
}

export interface QuickActionConfig {
  id: string;
  label: string;
  icon: string;
  enabled: boolean;
}

// ============================================
// 🔔 NOTIFICATION PREFERENCES
// ============================================

export interface NotificationPreferences {
  notifications: {
    // Orders
    newOrder: boolean;
    orderStatus: boolean;
    paymentReceived: boolean;
    // Nostr
    mentions: boolean;
    reactions: boolean;
    reposts: boolean;
    directMessages: boolean;
    // System
    backupReminders: boolean;
    lowStock: boolean;
    relayIssues: boolean;
  };
  delivery: {
    push: boolean;
    inApp: boolean;
    sound: boolean;
  };
}

// ============================================
// 📡 RELAY CONFIGURATION
// ============================================

export interface RelayConfig {
  url: string;
  read: boolean;
  write: boolean;
  outbox: boolean;
  isPrimary: boolean;
  status?: "connected" | "connecting" | "disconnected" | "error";
  latency?: number;
  lastConnectedAt?: string;
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
  action:
    | "login"
    | "logout"
    | "settings_change"
    | "refund"
    | "void"
    | "role_change"
    | "permission_grant"
    | "permission_revoke";
  userId: string;
  userName: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

// ============================================
// 🎫 PERMISSION EVENT TYPES (Nostr-based)
// ============================================

export type PermissionEventKind = 30510 | 30511; // 30510 = grant, 30511 = revoke

export interface PermissionGrant {
  id: string;
  kind: 30510;
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
  kind: 30511;
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

// ============================================
// 🔐 NOSTR USER & ACCOUNT TYPES
// ============================================

/**
 * Nostr user keys for authentication and signing
 */
export interface NostrUserKeys {
  pub: string; // Public key (hex format)
  sec: string; // Secret key / nsec (hex or nsec format)
  npub?: string; // npub encoded public key
  nsec?: string; // nsec encoded secret key
  privateKey?: string; // Alias for sec (hex format)
  publicKey?: string; // Alias for pub (hex format)
}

/**
 * Nostr user returned from key generation or extension
 */
export interface NostrUser {
  privateKey: string;
  publicKey: string;
  nsec: string;
  npub: string;
}

/**
 * User profile information stored in localStorage
 */
export interface UserInfo {
  pubkey: string; // Public key (hex format)
  name?: string; // Profile name
  displayName?: string; // Display name
  display_name?: string; // Alternative display name field
  about?: string; // Bio/description
  picture?: string; // Avatar URL
  banner?: string; // Banner image URL
  nip05?: string; // NIP-05 identifier
  lud16?: string; // Lightning address
  website?: string; // Website URL
  verified?: boolean; // NIP-05 verified
  lastUpdated?: number | null; // Last profile update timestamp
  userKeys?: NostrUserKeys; // User's cryptographic keys
}

// ============================================
// 🚚 DELIVERY TYPES
// Order Delivery Tracking & Driver Management
// ============================================

/**
 * Status of a delivery
 */
export type DeliveryStatus =
  | "pending"
  | "assigned"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "cancelled"
  | "failed";

/**
 * Delivery driver
 */
export interface Driver {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicleType?: "motorcycle" | "car" | "bicycle" | "walk";
  vehiclePlate?: string;
  isAvailable: boolean;
  currentDeliveryId?: string;
  totalDeliveries?: number;
  rating?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Delivery record linked to an order
 */
export interface Delivery {
  id: string;
  orderId: string;
  order?: Order;
  driverId?: string;
  driver?: Driver;
  status: DeliveryStatus;
  // Customer details
  customerName: string;
  customerPhone: string;
  address: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  notes?: string;
  // Times
  scheduledAt?: string;
  assignedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  // Tracking
  estimatedMinutes?: number;
  actualMinutes?: number;
  distanceKm?: number;
  // Fee
  deliveryFee: number;
  tip?: number;
  // Metadata
  cancellationReason?: string;
  failureReason?: string;
  proofOfDelivery?: string; // Photo or signature
  createdAt: string;
  updatedAt: string;
}

// ============================================
// 🧾 INVOICE TYPES
// Invoicing & Payment Tracking
// ============================================

/**
 * Invoice status
 */
export type InvoiceStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "paid"
  | "partial"
  | "overdue"
  | "cancelled"
  | "refunded";

/**
 * Invoice line item
 */
export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  discountType?: "fixed" | "percentage";
  taxRate?: number;
  total: number;
}

/**
 * Payment recorded against an invoice
 */
export interface InvoicePayment {
  id: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  paidAt: string;
  createdBy?: string;
}

/**
 * Invoice for customers
 */
export interface Invoice {
  id: string;
  invoiceNumber: string;
  // Customer
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerTaxId?: string;
  // Linked order
  orderId?: string;
  // Items
  items: InvoiceItem[];
  // Amounts
  subtotal: number;
  discountAmount?: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: CurrencyCode;
  // Dates
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  sentDate?: string;
  viewedDate?: string;
  // Status
  status: InvoiceStatus;
  // Content
  notes?: string;
  terms?: string;
  footerText?: string;
  // Payments
  payments: InvoicePayment[];
  // Metadata
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// 📋 CONTRACT & RENTAL TYPES
// Contract Management & Asset Rentals
// ============================================

/**
 * Contract type
 */
export type ContractType = "rental" | "lease" | "service" | "subscription";

/**
 * Contract status
 */
export type ContractStatus =
  | "draft"
  | "pending"
  | "active"
  | "expired"
  | "terminated"
  | "cancelled";

/**
 * Rental asset type
 */
export type AssetType =
  | "room"
  | "equipment"
  | "vehicle"
  | "locker"
  | "space"
  | "other";

/**
 * Rental Asset (room, equipment, vehicle, locker, etc.)
 */
export interface RentalAsset {
  id: string;
  name: string;
  nameLao?: string;
  type: AssetType;
  category?: string;
  description?: string;
  image?: string;
  // Pricing
  hourlyRate?: number;
  dailyRate?: number;
  weeklyRate?: number;
  monthlyRate?: number;
  deposit?: number;
  currency?: CurrencyCode;
  // Availability
  isAvailable: boolean;
  isActive: boolean;
  // Details
  location?: string;
  capacity?: number;
  serialNumber?: string;
  // Metadata
  tags?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Contract for rentals, leases, or services
 */
export interface Contract {
  id: string;
  contractNumber: string;
  // Customer
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  // Type & Status
  type: ContractType;
  status: ContractStatus;
  // Asset (for rentals)
  assetId?: string;
  asset?: RentalAsset;
  // Period
  startDate: string;
  endDate: string;
  // Billing
  amount: number;
  paymentSchedule: "once" | "daily" | "weekly" | "monthly" | "yearly";
  currency: CurrencyCode;
  totalPaid?: number;
  // Deposit
  depositAmount?: number;
  depositStatus?:
    | "pending"
    | "collected"
    | "partial"
    | "returned"
    | "forfeited";
  depositPaidAt?: string;
  depositReturnedAt?: string;
  // Options
  autoRenew: boolean;
  renewalNotificationDays?: number;
  // Content
  description?: string;
  notes?: string;
  terms?: string;
  // Linked records
  invoiceIds?: string[];
  paymentIds?: string[];
  // Timestamps
  activatedAt?: string;
  terminatedAt?: string;
  terminationReason?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Rental booking for assets
 */
export interface RentalBooking {
  id: string;
  bookingNumber?: string;
  // Asset
  assetId: string;
  asset?: RentalAsset;
  // Customer
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  // Contract link
  contractId?: string;
  // Times
  startTime: string;
  endTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  // Status
  status: "reserved" | "checked_out" | "returned" | "cancelled" | "no_show";
  // Billing
  totalAmount: number;
  depositAmount?: number;
  lateFee?: number;
  currency?: CurrencyCode;
  isPaid?: boolean;
  // Notes
  notes?: string;
  returnCondition?: string;
  // Timestamps
  checkedOutAt?: string;
  returnedAt?: string;
  createdAt: string;
  updatedAt?: string;
}
