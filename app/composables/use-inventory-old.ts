// ============================================
// 📦 INVENTORY COMPOSABLE
// Stock Management with Dexie + Nostr Sync
// ============================================

import type { Product } from '~/types';
import { db, type StockAdjustmentRecord } from '~/db/db';

// ============================================
// 📋 TYPES
// ============================================

export interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  categoryId: string;
  categoryName: string;
  branchId: string;
  branchName: string;
  unitId: string;
  unitSymbol: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  lastRestocked: string;
  lastUpdated: string;
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'overstocked';
  value: number;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'in' | 'out' | 'adjustment' | 'transfer';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  reference?: string;
  branchFrom?: string;
  branchTo?: string;
  createdBy: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  products: string[];
  lastOrderDate?: string;
  status: 'active' | 'inactive';
}

// Singleton state
const inventoryItems = ref<InventoryItem[]>([]);
const stockMovements = ref<StockMovement[]>([]);
const suppliers = ref<Supplier[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const isInitialized = ref(false);
const syncPending = ref(0);

export function useInventory() {
  const nostrData = useNostrData();
  const offline = useOffline();
  const productsStore = useProductsStore();

  // ============================================
  // 📊 COMPUTED
  // ============================================

  const totalInventoryValue = computed(() =>
    inventoryItems.value.reduce((sum, item) => sum + item.value, 0)
  );

  const lowStockCount = computed(() =>
    inventoryItems.value.filter(item => 
      item.status === 'low-stock' || item.status === 'out-of-stock'
    ).length
  );

  const outOfStockCount = computed(() =>
    inventoryItems.value.filter(item => item.status === 'out-of-stock').length
  );

  const totalProducts = computed(() => inventoryItems.value.length);

  const activeSuppliers = computed(() =>
    suppliers.value.filter(s => s.status === 'active')
  );

  // ============================================
  // 🔧 HELPER FUNCTIONS
  // ============================================

  function calculateStockStatus(
    currentStock: number,
    minStock: number,
    maxStock: number
  ): InventoryItem['status'] {
    if (currentStock <= 0) return 'out-of-stock';
    if (currentStock <= minStock) return 'low-stock';
    if (currentStock > maxStock) return 'overstocked';
    return 'in-stock';
  }

  function generateId(): string {
    return `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================
  // 💾 LOCAL DB OPERATIONS
  // ============================================

  async function loadFromLocal(): Promise<void> {
    try {
      // Load products from products table
      const productRecords = await db.products.toArray();
      const categoryRecords = await db.categories.toArray();
      const unitRecords = await db.units.toArray();
      const branchRecords = await db.branches.toArray();

      // Create lookup maps
      const categoryMap = new Map(categoryRecords.map(c => [c.id, c.name]));
      const unitMap = new Map(unitRecords.map(u => [u.id, u.symbol]));
      const branchMap = new Map(branchRecords.map(b => [b.id, b.name]));

      // Convert products to inventory items
      inventoryItems.value = productRecords.map(record => {
        const product: Product = JSON.parse(record.data);
        const maxStock = product.minStock ? product.minStock * 5 : 100;
        
        return {
          id: `inv_${product.id}`,
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          categoryId: product.categoryId,
          categoryName: categoryMap.get(product.categoryId) || 'Uncategorized',
          branchId: product.branchId,
          branchName: branchMap.get(product.branchId) || 'Main Branch',
          unitId: product.unitId,
          unitSymbol: unitMap.get(product.unitId) || 'pc',
          currentStock: product.stock,
          minStock: product.minStock,
          maxStock,
          reorderPoint: Math.ceil(product.minStock * 1.5),
          lastRestocked: product.updatedAt,
          lastUpdated: product.updatedAt,
          status: calculateStockStatus(product.stock, product.minStock, maxStock),
          value: product.stock * product.price,
        };
      });

      // Load stock movements
      const adjustments = await db.stockAdjustments
        .orderBy('createdAt')
        .reverse()
        .limit(100)
        .toArray();

      stockMovements.value = adjustments.map(adj => ({
        id: adj.id,
        productId: adj.productId,
        productName: productRecords.find(p => p.id === adj.productId)?.name || 'Unknown',
        type: adj.adjustment > 0 ? 'in' : adj.adjustment < 0 ? 'out' : 'adjustment',
        quantity: Math.abs(adj.adjustment),
        previousStock: adj.previousStock,
        newStock: adj.newStock,
        reason: adj.reason,
        reference: adj.notes,
        createdBy: adj.staffId,
        createdAt: new Date(adj.createdAt).toISOString(),
      }));

      // Load suppliers from localStorage (for now - can add Nostr later)
      const storedSuppliers = localStorage.getItem('bitspace_suppliers');
      if (storedSuppliers) {
        suppliers.value = JSON.parse(storedSuppliers);
      }
    } catch (e) {
      console.error('Failed to load inventory from local DB:', e);
      error.value = `Failed to load inventory: ${e}`;
    }
  }

  async function saveStockAdjustmentToLocal(adjustment: StockAdjustmentRecord): Promise<void> {
    await db.stockAdjustments.put(adjustment);
  }

  // ============================================
  // 📡 NOSTR SYNC
  // ============================================

  async function syncToNostr(adjustment: StockAdjustmentRecord): Promise<boolean> {
    try {
      const event = await nostrData.recordStockAdjustment({
        id: adjustment.id,
        productId: adjustment.productId,
        previousStock: adjustment.previousStock,
        newStock: adjustment.newStock,
        adjustment: adjustment.adjustment,
        reason: adjustment.reason as 'sale' | 'purchase' | 'adjustment' | 'count' | 'waste' | 'return',
        notes: adjustment.notes,
        staffId: adjustment.staffId,
        createdAt: new Date(adjustment.createdAt).toISOString(),
      });

      if (event) {
        await db.stockAdjustments.update(adjustment.id, {
          synced: true,
          nostrEventId: event.id,
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to sync stock adjustment to Nostr:', e);
      return false;
    }
  }

  // ============================================
  // 🚀 INITIALIZATION
  // ============================================

  async function init(): Promise<void> {
    if (isInitialized.value) return;

    isLoading.value = true;
    error.value = null;

    try {
      // Initialize products store first
      await productsStore.init();

      // Load inventory data
      await loadFromLocal();

      // Count pending syncs
      const unsyncedCount = await db.stockAdjustments.filter(a => !a.synced).count();
      syncPending.value = unsyncedCount;

      isInitialized.value = true;
    } catch (e) {
      error.value = `Failed to initialize inventory: ${e}`;
    } finally {
      isLoading.value = false;
    }
  }

  // ============================================
  // 📦 STOCK OPERATIONS
  // ============================================

  /**
   * Adjust stock for a product
   */
  async function adjustStock(
    productId: string,
    adjustment: number,
    reason: 'sale' | 'purchase' | 'adjustment' | 'count' | 'waste' | 'return',
    notes?: string
  ): Promise<boolean> {
    try {
      // Get current product
      const productRecord = await db.products.get(productId);
      if (!productRecord) {
        error.value = 'Product not found';
        return false;
      }

      const product: Product = JSON.parse(productRecord.data);
      const previousStock = product.stock;
      const newStock = Math.max(0, previousStock + adjustment);

      // Update product stock
      product.stock = newStock;
      product.updatedAt = new Date().toISOString();

      await db.products.update(productId, {
        data: JSON.stringify(product),
        stock: newStock,
        updatedAt: Date.now(),
        synced: false,
      });

      // Create stock adjustment record
      const adjustmentRecord: StockAdjustmentRecord = {
        id: generateId(),
        productId,
        previousStock,
        newStock,
        adjustment,
        reason,
        notes,
        staffId: 'current_user', // TODO: Get from useUsers()
        createdAt: Date.now(),
        synced: false,
      };

      await saveStockAdjustmentToLocal(adjustmentRecord);

      // Sync to Nostr if online
      if (offline.isOnline.value) {
        const synced = await syncToNostr(adjustmentRecord);
        if (!synced) {
          syncPending.value++;
        }
      } else {
        syncPending.value++;
      }

      // Reload inventory
      await loadFromLocal();

      return true;
    } catch (e) {
      console.error('Failed to adjust stock:', e);
      error.value = `Failed to adjust stock: ${e}`;
      return false;
    }
  }

  /**
   * Add stock (purchase/restock)
   */
  async function addStock(
    productId: string,
    quantity: number,
    notes?: string
  ): Promise<boolean> {
    return adjustStock(productId, quantity, 'purchase', notes);
  }

  /**
   * Remove stock (sale/waste)
   */
  async function removeStock(
    productId: string,
    quantity: number,
    reason: 'sale' | 'waste' | 'return' = 'sale',
    notes?: string
  ): Promise<boolean> {
    return adjustStock(productId, -quantity, reason, notes);
  }

  /**
   * Set stock to specific value (count/adjustment)
   */
  async function setStock(
    productId: string,
    newStock: number,
    notes?: string
  ): Promise<boolean> {
    const productRecord = await db.products.get(productId);
    if (!productRecord) {
      error.value = 'Product not found';
      return false;
    }

    const product: Product = JSON.parse(productRecord.data);
    const adjustment = newStock - product.stock;
    
    return adjustStock(productId, adjustment, 'count', notes);
  }

  /**
   * Transfer stock between branches
   */
  async function transferStock(
    productId: string,
    fromBranchId: string,
    toBranchId: string,
    quantity: number,
    notes?: string
  ): Promise<boolean> {
    // For multi-branch support, we'd need to handle this differently
    // For now, just record the adjustment with branch info in notes
    const transferNotes = `Transfer from ${fromBranchId} to ${toBranchId}${notes ? `: ${notes}` : ''}`;
    
    // Record as adjustment with transfer info
    return adjustStock(productId, 0, 'adjustment', transferNotes);
  }

  // ============================================
  // 👥 SUPPLIER OPERATIONS
  // ============================================

  async function addSupplier(supplier: Omit<Supplier, 'id'>): Promise<Supplier> {
    const newSupplier: Supplier = {
      ...supplier,
      id: `sup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    suppliers.value.push(newSupplier);
    localStorage.setItem('bitspace_suppliers', JSON.stringify(suppliers.value));

    return newSupplier;
  }

  async function updateSupplier(id: string, updates: Partial<Supplier>): Promise<boolean> {
    const index = suppliers.value.findIndex(s => s.id === id);
    if (index === -1) return false;

    suppliers.value[index] = { ...suppliers.value[index], ...updates };
    localStorage.setItem('bitspace_suppliers', JSON.stringify(suppliers.value));

    return true;
  }

  async function deleteSupplier(id: string): Promise<boolean> {
    const index = suppliers.value.findIndex(s => s.id === id);
    if (index === -1) return false;

    suppliers.value.splice(index, 1);
    localStorage.setItem('bitspace_suppliers', JSON.stringify(suppliers.value));

    return true;
  }

  function getSupplier(id: string): Supplier | undefined {
    return suppliers.value.find(s => s.id === id);
  }

  // ============================================
  // 🔍 QUERY OPERATIONS
  // ============================================

  function getInventoryItem(productId: string): InventoryItem | undefined {
    return inventoryItems.value.find(item => item.productId === productId);
  }

  function getInventoryByBranch(branchId: string): InventoryItem[] {
    return inventoryItems.value.filter(item => item.branchId === branchId);
  }

  function getInventoryByCategory(categoryId: string): InventoryItem[] {
    return inventoryItems.value.filter(item => item.categoryId === categoryId);
  }

  function getInventoryByStatus(status: InventoryItem['status']): InventoryItem[] {
    return inventoryItems.value.filter(item => item.status === status);
  }

  function getLowStockItems(): InventoryItem[] {
    return inventoryItems.value.filter(item => 
      item.status === 'low-stock' || item.status === 'out-of-stock'
    );
  }

  function getStockMovements(productId?: string, limit = 50): StockMovement[] {
    let movements = stockMovements.value;
    
    if (productId) {
      movements = movements.filter(m => m.productId === productId);
    }

    return movements.slice(0, limit);
  }

  // ============================================
  // 📊 ANALYTICS
  // ============================================

  function getInventoryStats(): {
    totalProducts: number;
    totalValue: number;
    lowStock: number;
    outOfStock: number;
    overstocked: number;
    inStock: number;
  } {
    return {
      totalProducts: inventoryItems.value.length,
      totalValue: totalInventoryValue.value,
      lowStock: inventoryItems.value.filter(i => i.status === 'low-stock').length,
      outOfStock: inventoryItems.value.filter(i => i.status === 'out-of-stock').length,
      overstocked: inventoryItems.value.filter(i => i.status === 'overstocked').length,
      inStock: inventoryItems.value.filter(i => i.status === 'in-stock').length,
    };
  }

  // ============================================
  // 🔄 SYNC OPERATIONS
  // ============================================

  async function syncPendingAdjustments(): Promise<{ synced: number; failed: number }> {
    let synced = 0;
    let failed = 0;

    const unsynced = await db.stockAdjustments.filter(a => !a.synced).toArray();

    for (const adjustment of unsynced) {
      const success = await syncToNostr(adjustment);
      if (success) {
        synced++;
      } else {
        failed++;
      }
    }

    syncPending.value = failed;
    return { synced, failed };
  }

  // ============================================
  // 📤 EXPORT
  // ============================================

  async function exportInventory(): Promise<string> {
    return JSON.stringify({
      inventory: inventoryItems.value,
      movements: stockMovements.value,
      suppliers: suppliers.value,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  return {
    // State
    inventoryItems,
    stockMovements,
    suppliers,
    isLoading,
    error,
    isInitialized,
    syncPending,

    // Computed
    totalInventoryValue,
    lowStockCount,
    outOfStockCount,
    totalProducts,
    activeSuppliers,

    // Init
    init,

    // Stock Operations
    adjustStock,
    addStock,
    removeStock,
    setStock,
    transferStock,

    // Supplier Operations
    addSupplier,
    updateSupplier,
    deleteSupplier,
    getSupplier,

    // Query
    getInventoryItem,
    getInventoryByBranch,
    getInventoryByCategory,
    getInventoryByStatus,
    getLowStockItems,
    getStockMovements,

    // Analytics
    getInventoryStats,

    // Sync
    syncPendingAdjustments,

    // Export
    exportInventory,
  };
}
