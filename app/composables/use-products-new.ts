// ============================================
// 📦 PRODUCTS COMPOSABLE
// Product & Category Management with Dexie + Nostr
// ============================================

import type { 
  Product, 
  Category, 
  Unit,
} from '~/types';
import { db, type ProductRecord, type CategoryRecord, type UnitRecord } from '~/db/db';

// ============================================
// 📋 DEFAULT DATA (Initial Seed)
// ============================================

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'all', name: 'All Items', description: 'All products', icon: '📦', sortOrder: 0 },
  { id: 'drinks', name: 'Drinks', description: 'Beverages', icon: '🍹', sortOrder: 1 },
  { id: 'food', name: 'Food', description: 'Main dishes', icon: '🍜', sortOrder: 2 },
  { id: 'desserts', name: 'Desserts', description: 'Sweet treats', icon: '🍰', sortOrder: 3 },
  { id: 'snacks', name: 'Snacks', description: 'Light bites', icon: '🍿', sortOrder: 4 },
  { id: 'favorites', name: 'Favorites', description: 'Most popular items', icon: '⭐', sortOrder: 5 },
];

const DEFAULT_UNITS: Unit[] = [
  { id: 'piece', name: 'Piece', symbol: 'pc' },
  { id: 'cup', name: 'Cup', symbol: 'cup' },
  { id: 'bottle', name: 'Bottle', symbol: 'btl' },
  { id: 'glass', name: 'Glass', symbol: 'gl' },
  { id: 'bowl', name: 'Bowl', symbol: 'bwl' },
  { id: 'plate', name: 'Plate', symbol: 'plt' },
  { id: 'basket', name: 'Basket', symbol: 'bsk' },
  { id: 'scoop', name: 'Scoop', symbol: 'scp' },
  { id: 'kg', name: 'Kilogram', symbol: 'kg' },
  { id: 'g', name: 'Gram', symbol: 'g' },
  { id: 'l', name: 'Liter', symbol: 'L' },
  { id: 'ml', name: 'Milliliter', symbol: 'ml' },
];

// Singleton state
const products = ref<Product[]>([]);
const categories = ref<Category[]>([]);
const units = ref<Unit[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const isInitialized = ref(false);
const syncPending = ref(0);

// UI State
const searchQuery = ref('');
const selectedCategory = ref<string>('all');
const favoriteIds = ref<Set<string>>(new Set());

/**
 * 📦 PRODUCTS STORE (Production-ready with Dexie + Nostr sync)
 * Use this instead of useProducts() once migrated
 */
export function useProductsStore() {
  const nostrData = useNostrData();
  const offline = useOffline();

  // ============================================
  // 📊 COMPUTED
  // ============================================

  const filteredProducts = computed(() => {
    let result = [...products.value];

    // Category filter
    if (selectedCategory.value === 'favorites') {
      result = result.filter(p => favoriteIds.value.has(p.id));
    } else if (selectedCategory.value !== 'all') {
      result = result.filter(p => p.categoryId === selectedCategory.value);
    }

    // Search filter
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase().trim();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.sku.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }

    // Only active products
    result = result.filter(p => p.status === 'active');

    return result;
  });

  const activeProducts = computed(() => 
    products.value.filter(p => p.status === 'active')
  );

  const lowStockProducts = computed(() => 
    products.value.filter(p => p.stock <= p.minStock && p.status === 'active')
  );

  const outOfStockProducts = computed(() => 
    products.value.filter(p => p.stock <= 0 && p.status === 'active')
  );

  const productsByCategory = computed(() => {
    const grouped: Record<string, Product[]> = {};
    for (const product of activeProducts.value) {
      if (!grouped[product.categoryId]) {
        grouped[product.categoryId] = [];
      }
      grouped[product.categoryId]!.push(product);
    }
    return grouped;
  });

  // ============================================
  // 💾 LOCAL DB OPERATIONS
  // ============================================

  async function loadProductsFromLocal(): Promise<Product[]> {
    try {
      const records = await db.products
        .where('status')
        .equals('active')
        .toArray();
      return records.map(r => JSON.parse(r.data) as Product);
    } catch (e) {
      console.error('Failed to load products from local DB:', e);
      return [];
    }
  }

  async function loadCategoriesFromLocal(): Promise<Category[]> {
    try {
      const records = await db.categories.orderBy('sortOrder').toArray();
      if (records.length === 0) {
        // Seed default categories
        await seedDefaultCategories();
        return DEFAULT_CATEGORIES;
      }
      return records.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        icon: r.icon,
        sortOrder: r.sortOrder,
      }));
    } catch (e) {
      console.error('Failed to load categories:', e);
      return DEFAULT_CATEGORIES;
    }
  }

  async function loadUnitsFromLocal(): Promise<Unit[]> {
    try {
      const records = await db.units.toArray();
      if (records.length === 0) {
        // Seed default units
        await seedDefaultUnits();
        return DEFAULT_UNITS;
      }
      return records.map(r => ({
        id: r.id,
        name: r.name,
        symbol: r.symbol,
      }));
    } catch (e) {
      console.error('Failed to load units:', e);
      return DEFAULT_UNITS;
    }
  }

  async function seedDefaultCategories(): Promise<void> {
    for (const cat of DEFAULT_CATEGORIES) {
      await db.categories.put({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        sortOrder: cat.sortOrder || 0,
        synced: false,
      });
    }
  }

  async function seedDefaultUnits(): Promise<void> {
    for (const unit of DEFAULT_UNITS) {
      await db.units.put({
        id: unit.id,
        name: unit.name,
        symbol: unit.symbol,
        synced: false,
      });
    }
  }

  async function saveProductToLocal(product: Product): Promise<void> {
    const record: ProductRecord = {
      id: product.id,
      data: JSON.stringify(product),
      sku: product.sku,
      name: product.name,
      categoryId: product.categoryId,
      status: product.status,
      price: product.price,
      stock: product.stock,
      updatedAt: Date.now(),
      synced: false,
    };
    await db.products.put(record);
  }

  async function saveCategoryToLocal(category: Category): Promise<void> {
    const record: CategoryRecord = {
      id: category.id,
      name: category.name,
      description: category.description,
      icon: category.icon,
      sortOrder: category.sortOrder || 0,
      synced: false,
    };
    await db.categories.put(record);
  }

  async function saveUnitToLocal(unit: Unit): Promise<void> {
    const record: UnitRecord = {
      id: unit.id,
      name: unit.name,
      symbol: unit.symbol,
      synced: false,
    };
    await db.units.put(record);
  }

  // ============================================
  // 📡 NOSTR SYNC
  // ============================================

  async function syncProductToNostr(product: Product): Promise<boolean> {
    try {
      const event = await nostrData.saveProduct(product);
      if (event) {
        await db.products.update(product.id, {
          synced: true,
          nostrEventId: event.id,
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to sync product to Nostr:', e);
      return false;
    }
  }

  async function syncCategoryToNostr(category: Category): Promise<boolean> {
    try {
      const event = await nostrData.saveCategory(category);
      if (event) {
        await db.categories.update(category.id, {
          synced: true,
          nostrEventId: event.id,
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to sync category to Nostr:', e);
      return false;
    }
  }

  async function loadFromNostr(): Promise<void> {
    try {
      const [nostrProducts, nostrCategories, nostrUnits] = await Promise.all([
        nostrData.getAllProducts(),
        nostrData.getAllCategories(),
        nostrData.getAllUnits(),
      ]);

      // Merge with local (Nostr takes precedence for synced items)
      for (const product of nostrProducts) {
        await saveProductToLocal(product);
      }
      for (const category of nostrCategories) {
        await saveCategoryToLocal(category);
      }
      for (const unit of nostrUnits) {
        await saveUnitToLocal(unit);
      }

      // Reload from local
      products.value = await loadProductsFromLocal();
      categories.value = await loadCategoriesFromLocal();
      units.value = await loadUnitsFromLocal();
    } catch (e) {
      console.error('Failed to load from Nostr:', e);
    }
  }

  async function syncAllToNostr(): Promise<{ synced: number; failed: number }> {
    let synced = 0;
    let failed = 0;

    // Sync unsynced products
    const unsyncedProducts = await db.products.filter(p => !p.synced).toArray();
    for (const record of unsyncedProducts) {
      const product = JSON.parse(record.data) as Product;
      if (await syncProductToNostr(product)) {
        synced++;
      } else {
        failed++;
      }
    }

    // Sync unsynced categories
    const unsyncedCategories = await db.categories.filter(c => !c.synced).toArray();
    for (const record of unsyncedCategories) {
      const category: Category = {
        id: record.id,
        name: record.name,
        description: record.description,
        icon: record.icon,
        sortOrder: record.sortOrder,
      };
      if (await syncCategoryToNostr(category)) {
        synced++;
      } else {
        failed++;
      }
    }

    syncPending.value = failed;
    return { synced, failed };
  }

  // ============================================
  // 🚀 INITIALIZATION
  // ============================================

  async function init(): Promise<void> {
    if (isInitialized.value) return;
    
    isLoading.value = true;
    error.value = null;

    try {
      // Load from local DB first (fast)
      products.value = await loadProductsFromLocal();
      categories.value = await loadCategoriesFromLocal();
      units.value = await loadUnitsFromLocal();

      // Load favorites
      loadFavorites();

      // Sync with Nostr if online
      if (offline.isOnline.value) {
        await loadFromNostr();
      }

      // Count pending syncs
      const unsyncedCount = await db.products.filter(p => !p.synced).count();
      syncPending.value = unsyncedCount;

      isInitialized.value = true;
    } catch (e) {
      error.value = `Failed to initialize products: ${e}`;
    } finally {
      isLoading.value = false;
    }
  }

  // ============================================
  // 🛍️ PRODUCT CRUD
  // ============================================

  async function addProduct(
    productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Product> {
    const product: Product = {
      ...productData,
      id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add to state
    products.value.push(product);

    // Save to local DB
    await saveProductToLocal(product);

    // Sync to Nostr
    if (offline.isOnline.value) {
      const synced = await syncProductToNostr(product);
      if (!synced) syncPending.value++;
    } else {
      syncPending.value++;
    }

    return product;
  }

  async function updateProduct(
    id: string, 
    updates: Partial<Product>
  ): Promise<Product | null> {
    const index = products.value.findIndex(p => p.id === id);
    if (index === -1) return null;

    const existing = products.value[index]!;
    const updatedProduct: Product = {
      ...existing,
      ...updates,
      id: existing.id, // Ensure ID doesn't change
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    products.value[index] = updatedProduct;

    // Save to local DB
    await saveProductToLocal(updatedProduct);

    // Sync to Nostr
    if (offline.isOnline.value) {
      await syncProductToNostr(updatedProduct);
    }

    return updatedProduct;
  }

  async function deleteProduct(id: string): Promise<boolean> {
    const index = products.value.findIndex(p => p.id === id);
    if (index === -1) return false;

    // Soft delete - mark as inactive
    const product = products.value[index]!;
    product.status = 'inactive';
    product.updatedAt = new Date().toISOString();

    // Update local DB
    await saveProductToLocal(product);

    // Remove from active list
    products.value.splice(index, 1);

    // Sync to Nostr
    if (offline.isOnline.value) {
      await nostrData.deleteProduct(id);
    }

    return true;
  }

  function getProduct(id: string): Product | undefined {
    return products.value.find(p => p.id === id);
  }

  function getProductBySku(sku: string): Product | undefined {
    return products.value.find(p => p.sku === sku);
  }

  function getProductsByCategory(categoryId: string): Product[] {
    if (categoryId === 'all') return activeProducts.value;
    return activeProducts.value.filter(p => p.categoryId === categoryId);
  }

  // ============================================
  // 📁 CATEGORY CRUD
  // ============================================

  async function addCategory(
    categoryData: Omit<Category, 'id'>
  ): Promise<Category> {
    const category: Category = {
      ...categoryData,
      id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sortOrder: categories.value.length,
    };

    categories.value.push(category);
    await saveCategoryToLocal(category);

    if (offline.isOnline.value) {
      await syncCategoryToNostr(category);
    }

    return category;
  }

  async function updateCategory(
    id: string, 
    updates: Partial<Category>
  ): Promise<Category | null> {
    const index = categories.value.findIndex(c => c.id === id);
    if (index === -1) return null;

    const existing = categories.value[index]!;
    const updatedCategory: Category = {
      ...existing,
      ...updates,
      id: existing.id,
    };

    categories.value[index] = updatedCategory;
    await saveCategoryToLocal(updatedCategory);

    if (offline.isOnline.value) {
      await syncCategoryToNostr(updatedCategory);
    }

    return updatedCategory;
  }

  async function deleteCategory(id: string): Promise<boolean> {
    // Don't delete built-in categories
    if (['all', 'favorites'].includes(id)) return false;

    const index = categories.value.findIndex(c => c.id === id);
    if (index === -1) return false;

    // Check if category has products
    const hasProducts = products.value.some(p => p.categoryId === id);
    if (hasProducts) {
      error.value = 'Cannot delete category with products';
      return false;
    }

    categories.value.splice(index, 1);
    await db.categories.delete(id);

    return true;
  }

  function getCategory(id: string): Category | undefined {
    return categories.value.find(c => c.id === id);
  }

  // ============================================
  // 📐 UNIT CRUD
  // ============================================

  async function addUnit(unitData: Omit<Unit, 'id'>): Promise<Unit> {
    const unit: Unit = {
      ...unitData,
      id: `unit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    units.value.push(unit);
    await saveUnitToLocal(unit);

    return unit;
  }

  async function updateUnit(
    id: string, 
    updates: Partial<Unit>
  ): Promise<Unit | null> {
    const index = units.value.findIndex(u => u.id === id);
    if (index === -1) return null;

    const existing = units.value[index]!;
    const updatedUnit: Unit = {
      ...existing,
      ...updates,
      id: existing.id,
    };

    units.value[index] = updatedUnit;
    await saveUnitToLocal(updatedUnit);

    return updatedUnit;
  }

  function getUnit(id: string): Unit | undefined {
    return units.value.find(u => u.id === id);
  }

  // ============================================
  // 📦 STOCK MANAGEMENT
  // ============================================

  async function updateStock(
    productId: string, 
    adjustment: number,
    reason: 'sale' | 'purchase' | 'adjustment' | 'count' | 'waste' | 'return' = 'adjustment',
    notes?: string
  ): Promise<boolean> {
    const product = products.value.find(p => p.id === productId);
    if (!product) return false;

    const previousStock = product.stock;
    const newStock = previousStock + adjustment;

    // Update product
    await updateProduct(productId, { stock: newStock });

    // Record stock adjustment
    const adjustmentRecord = {
      id: `adj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      productId,
      previousStock,
      newStock,
      adjustment,
      reason,
      notes,
      staffId: 'current_user', // TODO: Get from auth
      createdAt: new Date().toISOString(),
    };

    await db.stockAdjustments.put({
      ...adjustmentRecord,
      createdAt: Date.now(),
      synced: false,
    });

    // Sync to Nostr
    if (offline.isOnline.value) {
      await nostrData.recordStockAdjustment(adjustmentRecord);
    }

    return true;
  }

  async function decreaseStock(productId: string, quantity: number): Promise<boolean> {
    return updateStock(productId, -quantity, 'sale');
  }

  async function increaseStock(productId: string, quantity: number, reason: 'purchase' | 'return' = 'purchase'): Promise<boolean> {
    return updateStock(productId, quantity, reason);
  }

  async function setStock(productId: string, newStock: number, notes?: string): Promise<boolean> {
    const product = products.value.find(p => p.id === productId);
    if (!product) return false;

    const adjustment = newStock - product.stock;
    return updateStock(productId, adjustment, 'count', notes);
  }

  async function getStockHistory(productId: string, limit = 50): Promise<Array<{
    id: string;
    adjustment: number;
    reason: string;
    notes?: string;
    createdAt: string;
  }>> {
    const records = await db.stockAdjustments
      .where('productId')
      .equals(productId)
      .reverse()
      .limit(limit)
      .toArray();

    return records.map(r => ({
      id: r.id,
      adjustment: r.adjustment,
      reason: r.reason,
      notes: r.notes,
      createdAt: new Date(r.createdAt).toISOString(),
    }));
  }

  // ============================================
  // ⭐ FAVORITES
  // ============================================

  function toggleFavorite(id: string): void {
    if (favoriteIds.value.has(id)) {
      favoriteIds.value.delete(id);
    } else {
      favoriteIds.value.add(id);
    }
    saveFavorites();
  }

  function isFavorite(id: string): boolean {
    return favoriteIds.value.has(id);
  }

  function saveFavorites(): void {
    localStorage.setItem('pos_favorites', JSON.stringify([...favoriteIds.value]));
  }

  function loadFavorites(): void {
    const stored = localStorage.getItem('pos_favorites');
    if (stored) {
      try {
        favoriteIds.value = new Set(JSON.parse(stored));
      } catch {
        favoriteIds.value = new Set();
      }
    }
  }

  // ============================================
  // 🔍 SEARCH & FILTER
  // ============================================

  function searchProducts(query: string): Product[] {
    const q = query.toLowerCase();
    return activeProducts.value.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  }

  function setSearchQuery(query: string): void {
    searchQuery.value = query;
  }

  function setSelectedCategory(categoryId: string): void {
    selectedCategory.value = categoryId;
  }

  // ============================================
  // 📊 IMPORT/EXPORT
  // ============================================

  async function exportProducts(): Promise<string> {
    const data = {
      products: products.value,
      categories: categories.value,
      units: units.value,
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }

  async function importProducts(jsonData: string): Promise<{
    products: number;
    categories: number;
    units: number;
  }> {
    const data = JSON.parse(jsonData);
    let productCount = 0;
    let categoryCount = 0;
    let unitCount = 0;

    // Import categories first
    if (data.categories) {
      for (const cat of data.categories) {
        if (!categories.value.find(c => c.id === cat.id)) {
          await addCategory(cat);
          categoryCount++;
        }
      }
    }

    // Import units
    if (data.units) {
      for (const unit of data.units) {
        if (!units.value.find(u => u.id === unit.id)) {
          await addUnit(unit);
          unitCount++;
        }
      }
    }

    // Import products
    if (data.products) {
      for (const prod of data.products) {
        if (!products.value.find(p => p.id === prod.id)) {
          await addProduct(prod);
          productCount++;
        }
      }
    }

    return { products: productCount, categories: categoryCount, units: unitCount };
  }

  return {
    // State
    products,
    categories,
    units,
    isLoading,
    error,
    isInitialized,
    syncPending,

    // UI State
    searchQuery,
    selectedCategory,
    favoriteIds,

    // Computed
    filteredProducts,
    activeProducts,
    lowStockProducts,
    outOfStockProducts,
    productsByCategory,

    // Init
    init,

    // Product CRUD
    addProduct,
    updateProduct,
    deleteProduct,
    getProduct,
    getProductBySku,
    getProductsByCategory,

    // Category CRUD
    addCategory,
    updateCategory,
    deleteCategory,
    getCategory,

    // Unit CRUD
    addUnit,
    updateUnit,
    getUnit,

    // Stock
    updateStock,
    decreaseStock,
    increaseStock,
    setStock,
    getStockHistory,

    // Favorites
    toggleFavorite,
    isFavorite,

    // Search
    searchProducts,
    setSearchQuery,
    setSelectedCategory,

    // Sync
    syncAllToNostr,
    loadFromNostr,

    // Import/Export
    exportProducts,
    importProducts,
  };
}
