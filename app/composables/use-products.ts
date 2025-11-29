// composables/use-products.ts
// 📦 Product & Category Management with Dexie + Nostr

import { ref, computed } from 'vue';
import type { Product, Category, Unit, ProductVariant, ProductModifierGroup } from '~/types';

// Common size variants
const SIZE_VARIANTS: ProductVariant[] = [
  { id: 'size-s', name: 'Small', shortName: 'S', priceModifier: 0, priceModifierType: 'fixed', sortOrder: 1, isDefault: true },
  { id: 'size-m', name: 'Medium', shortName: 'M', priceModifier: 5000, priceModifierType: 'fixed', sortOrder: 2 },
  { id: 'size-l', name: 'Large', shortName: 'L', priceModifier: 10000, priceModifierType: 'fixed', sortOrder: 3 },
];

const DRINK_SIZE_VARIANTS: ProductVariant[] = [
  { id: 'size-regular', name: 'Regular', shortName: 'R', priceModifier: 0, priceModifierType: 'fixed', sortOrder: 1, isDefault: true },
  { id: 'size-large', name: 'Large', shortName: 'L', priceModifier: 8000, priceModifierType: 'fixed', sortOrder: 2 },
  { id: 'size-xl', name: 'Extra Large', shortName: 'XL', priceModifier: 15000, priceModifierType: 'fixed', sortOrder: 3 },
];

// Common modifier groups
const DRINK_MODIFIERS: ProductModifierGroup[] = [
  {
    id: 'sugar-level',
    name: '🍬 Sugar Level',
    type: 'single',
    required: false,
    modifiers: [
      { id: 'sugar-0', name: 'No Sugar', price: 0, category: 'preference' },
      { id: 'sugar-25', name: '25% Sugar', price: 0, category: 'preference' },
      { id: 'sugar-50', name: '50% Sugar', price: 0, category: 'preference', isDefault: true },
      { id: 'sugar-100', name: 'Normal Sugar', price: 0, category: 'preference' },
    ],
  },
  {
    id: 'ice-level',
    name: '🧊 Ice Level',
    type: 'single',
    required: false,
    modifiers: [
      { id: 'ice-no', name: 'No Ice', price: 0, category: 'preference' },
      { id: 'ice-less', name: 'Less Ice', price: 0, category: 'preference' },
      { id: 'ice-normal', name: 'Normal Ice', price: 0, category: 'preference', isDefault: true },
      { id: 'ice-extra', name: 'Extra Ice', price: 0, category: 'preference' },
    ],
  },
  {
    id: 'drink-addons',
    name: '➕ Add-ons',
    type: 'multiple',
    required: false,
    maxSelect: 5,
    modifiers: [
      { id: 'addon-espresso', name: 'Extra Espresso Shot', price: 8000, category: 'addon' },
      { id: 'addon-milk', name: 'Extra Milk', price: 3000, category: 'addon' },
      { id: 'addon-whip', name: 'Whipped Cream', price: 5000, category: 'addon' },
      { id: 'addon-caramel', name: 'Caramel Drizzle', price: 5000, category: 'addon' },
    ],
  },
];

const FOOD_MODIFIERS: ProductModifierGroup[] = [
  {
    id: 'spice-level',
    name: '🌶️ Spice Level',
    type: 'single',
    required: false,
    modifiers: [
      { id: 'spice-no', name: 'No Spice', price: 0, category: 'preference' },
      { id: 'spice-mild', name: 'Mild', price: 0, category: 'preference' },
      { id: 'spice-medium', name: 'Medium', price: 0, category: 'preference', isDefault: true },
      { id: 'spice-hot', name: 'Hot 🔥', price: 0, category: 'preference' },
      { id: 'spice-thai', name: 'Thai Hot 🔥🔥', price: 0, category: 'preference' },
    ],
  },
  {
    id: 'food-addons',
    name: '➕ Add-ons',
    type: 'multiple',
    required: false,
    maxSelect: 5,
    modifiers: [
      { id: 'addon-egg', name: 'Fried Egg', price: 5000, category: 'addon' },
      { id: 'addon-rice', name: 'Extra Sticky Rice', price: 5000, category: 'addon' },
      { id: 'addon-veg', name: 'Extra Vegetables', price: 3000, category: 'addon' },
      { id: 'addon-meat', name: 'Extra Meat', price: 15000, category: 'addon' },
    ],
  },
];

// Sample product data (replace with real data from DB/Nostr)
const SAMPLE_PRODUCTS: Product[] = [
  // ☕ Drinks - WITH VARIANTS
  { 
    id: 'p1', name: 'Lao Coffee', sku: 'COF001', categoryId: 'drinks', unitId: 'cup', 
    price: 25000, prices: { LAK: 25000, THB: 45, USD: 1.25, SATS: 1250 }, 
    stock: 100, minStock: 10, branchId: 'main', status: 'active', image: '☕', 
    hasVariants: true, variants: DRINK_SIZE_VARIANTS, modifierGroups: DRINK_MODIFIERS,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() 
  },
  { 
    id: 'p2', name: 'Iced Coffee', sku: 'COF002', categoryId: 'drinks', unitId: 'cup', 
    price: 30000, prices: { LAK: 30000, THB: 54, USD: 1.50, SATS: 1500 }, 
    stock: 100, minStock: 10, branchId: 'main', status: 'active', image: '🧊', 
    hasVariants: true, variants: DRINK_SIZE_VARIANTS, modifierGroups: DRINK_MODIFIERS,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() 
  },
  { id: 'p3', name: 'Beer Lao', sku: 'BEV001', categoryId: 'drinks', unitId: 'bottle', price: 15000, prices: { LAK: 15000, THB: 27, USD: 0.75, SATS: 750 }, stock: 50, minStock: 10, branchId: 'main', status: 'active', image: '🍺', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'p4', name: 'Beer Lao Dark', sku: 'BEV002', categoryId: 'drinks', unitId: 'bottle', price: 18000, prices: { LAK: 18000, THB: 32, USD: 0.90, SATS: 900 }, stock: 40, minStock: 10, branchId: 'main', status: 'active', image: '🍻', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { 
    id: 'p5', name: 'Fruit Shake', sku: 'DRK001', categoryId: 'drinks', unitId: 'glass', 
    price: 20000, prices: { LAK: 20000, THB: 36, USD: 1.00, SATS: 1000 }, 
    stock: 40, minStock: 10, branchId: 'main', status: 'active', image: '🥤', 
    hasVariants: true, variants: DRINK_SIZE_VARIANTS,
    modifierGroups: [
      {
        id: 'shake-flavor',
        name: '🍓 Flavor',
        type: 'single',
        required: true,
        modifiers: [
          { id: 'flavor-mango', name: 'Mango', price: 0, category: 'preference', isDefault: true },
          { id: 'flavor-banana', name: 'Banana', price: 0, category: 'preference' },
          { id: 'flavor-papaya', name: 'Papaya', price: 0, category: 'preference' },
          { id: 'flavor-watermelon', name: 'Watermelon', price: 0, category: 'preference' },
          { id: 'flavor-mixed', name: 'Mixed Fruits', price: 5000, category: 'preference' },
        ],
      },
      ...DRINK_MODIFIERS.slice(0, 2), // Sugar & Ice
    ],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() 
  },
  { id: 'p6', name: 'Water', sku: 'DRK002', categoryId: 'drinks', unitId: 'bottle', price: 5000, prices: { LAK: 5000, THB: 9, USD: 0.25, SATS: 250 }, stock: 200, minStock: 50, branchId: 'main', status: 'active', image: '💧', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { 
    id: 'p7', name: 'Lao Tea', sku: 'TEA001', categoryId: 'drinks', unitId: 'cup', 
    price: 15000, prices: { LAK: 15000, THB: 27, USD: 0.75, SATS: 750 }, 
    stock: 80, minStock: 20, branchId: 'main', status: 'active', image: '🍵', 
    hasVariants: true, variants: DRINK_SIZE_VARIANTS, modifierGroups: DRINK_MODIFIERS.slice(0, 2),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() 
  },
  { id: 'p8', name: 'Sugarcane Juice', sku: 'DRK003', categoryId: 'drinks', unitId: 'glass', price: 12000, prices: { LAK: 12000, THB: 22, USD: 0.60, SATS: 600 }, stock: 60, minStock: 15, branchId: 'main', status: 'active', image: '🧃', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

  // 🍜 Food - WITH MODIFIERS
  { 
    id: 'p9', name: 'Khao Piak Sen', sku: 'FOOD001', categoryId: 'food', unitId: 'bowl', 
    price: 35000, prices: { LAK: 35000, THB: 63, USD: 1.75, SATS: 1750 }, 
    stock: 30, minStock: 5, branchId: 'main', status: 'active', image: '🍜', 
    hasVariants: true, variants: SIZE_VARIANTS, modifierGroups: FOOD_MODIFIERS,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() 
  },
  { 
    id: 'p10', name: 'Laap Moo', sku: 'FOOD002', categoryId: 'food', unitId: 'plate', 
    price: 40000, prices: { LAK: 40000, THB: 72, USD: 2.00, SATS: 2000 }, 
    stock: 25, minStock: 5, branchId: 'main', status: 'active', image: '🥗', 
    modifierGroups: FOOD_MODIFIERS,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() 
  },
  { id: 'p11', name: 'Ping Kai', sku: 'FOOD003', categoryId: 'food', unitId: 'piece', price: 50000, prices: { LAK: 50000, THB: 90, USD: 2.50, SATS: 2500 }, stock: 20, minStock: 5, branchId: 'main', status: 'active', image: '🍗', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'p12', name: 'Sticky Rice', sku: 'FOOD004', categoryId: 'food', unitId: 'basket', price: 10000, prices: { LAK: 10000, THB: 18, USD: 0.50, SATS: 500 }, stock: 100, minStock: 20, branchId: 'main', status: 'active', image: '🍚', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { 
    id: 'p13', name: 'Tam Mak Hoong', sku: 'FOOD005', categoryId: 'food', unitId: 'plate', 
    price: 25000, prices: { LAK: 25000, THB: 45, USD: 1.25, SATS: 1250 }, 
    stock: 30, minStock: 10, branchId: 'main', status: 'active', image: '🥬', 
    modifierGroups: FOOD_MODIFIERS,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() 
  },
  { 
    id: 'p14', name: 'Or Lam', sku: 'FOOD006', categoryId: 'food', unitId: 'bowl', 
    price: 45000, prices: { LAK: 45000, THB: 81, USD: 2.25, SATS: 2250 }, 
    stock: 15, minStock: 5, branchId: 'main', status: 'active', image: '🍲', 
    hasVariants: true, variants: SIZE_VARIANTS, modifierGroups: FOOD_MODIFIERS,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() 
  },
  { id: 'p15', name: 'Khao Jee', sku: 'FOOD007', categoryId: 'food', unitId: 'piece', price: 15000, prices: { LAK: 15000, THB: 27, USD: 0.75, SATS: 750 }, stock: 40, minStock: 10, branchId: 'main', status: 'active', image: '🥖', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { 
    id: 'p16', name: 'Fried Rice', sku: 'FOOD008', categoryId: 'food', unitId: 'plate', 
    price: 30000, prices: { LAK: 30000, THB: 54, USD: 1.50, SATS: 1500 }, 
    stock: 35, minStock: 10, branchId: 'main', status: 'active', image: '🍛',
    hasVariants: true, variants: SIZE_VARIANTS, modifierGroups: FOOD_MODIFIERS,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() 
  },

  // 🍰 Desserts
  { id: 'p17', name: 'Khao Lam', sku: 'DES001', categoryId: 'desserts', unitId: 'piece', price: 20000, prices: { LAK: 20000, THB: 36, USD: 1.00, SATS: 1000 }, stock: 25, minStock: 5, branchId: 'main', status: 'active', image: '🎋', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'p18', name: 'Nam Van', sku: 'DES002', categoryId: 'desserts', unitId: 'bowl', price: 15000, prices: { LAK: 15000, THB: 27, USD: 0.75, SATS: 750 }, stock: 30, minStock: 10, branchId: 'main', status: 'active', image: '🍨', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'p19', name: 'Mango Sticky Rice', sku: 'DES003', categoryId: 'desserts', unitId: 'plate', price: 35000, prices: { LAK: 35000, THB: 63, USD: 1.75, SATS: 1750 }, stock: 20, minStock: 5, branchId: 'main', status: 'active', image: '🥭', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'p20', name: 'Coconut Ice Cream', sku: 'DES004', categoryId: 'desserts', unitId: 'scoop', price: 18000, prices: { LAK: 18000, THB: 32, USD: 0.90, SATS: 900 }, stock: 40, minStock: 10, branchId: 'main', status: 'active', image: '🍦', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

  // 🍿 Snacks
  { id: 'p21', name: 'Fried Insects', sku: 'SNK001', categoryId: 'snacks', unitId: 'plate', price: 25000, prices: { LAK: 25000, THB: 45, USD: 1.25, SATS: 1250 }, stock: 15, minStock: 5, branchId: 'main', status: 'active', image: '🦗', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'p22', name: 'Sai Oua', sku: 'SNK002', categoryId: 'snacks', unitId: 'piece', price: 30000, prices: { LAK: 30000, THB: 54, USD: 1.50, SATS: 1500 }, stock: 20, minStock: 5, branchId: 'main', status: 'active', image: '🌭', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'p23', name: 'Spring Rolls', sku: 'SNK003', categoryId: 'snacks', unitId: 'piece', price: 8000, prices: { LAK: 8000, THB: 14, USD: 0.40, SATS: 400 }, stock: 50, minStock: 15, branchId: 'main', status: 'active', image: '🥟', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'p24', name: 'Fried Banana', sku: 'SNK004', categoryId: 'snacks', unitId: 'piece', price: 10000, prices: { LAK: 1000, THB: 18, USD: 0.50, SATS: 10 }, stock: 35, minStock: 10, branchId: 'main', status: 'active', image: '🍌', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const CATEGORIES: Category[] = [
  { id: 'all', name: 'All Items', description: 'All products' },
  { id: 'drinks', name: 'Drinks', description: 'Beverages' },
  { id: 'food', name: 'Food', description: 'Main dishes' },
  { id: 'desserts', name: 'Desserts', description: 'Sweet treats' },
  { id: 'snacks', name: 'Snacks', description: 'Light bites' },
  { id: 'favorites', name: 'Favorites', description: 'Most popular items' },
];

const UNITS: Unit[] = [
  { id: 'piece', name: 'Piece', symbol: 'pc' },
  { id: 'cup', name: 'Cup', symbol: 'cup' },
  { id: 'bottle', name: 'Bottle', symbol: 'btl' },
  { id: 'glass', name: 'Glass', symbol: 'gl' },
  { id: 'bowl', name: 'Bowl', symbol: 'bwl' },
  { id: 'plate', name: 'Plate', symbol: 'plt' },
  { id: 'basket', name: 'Basket', symbol: 'bsk' },
  { id: 'scoop', name: 'Scoop', symbol: 'scp' },
];

export const useProducts = () => {
  // State
  const products = ref<Product[]>(SAMPLE_PRODUCTS);
  const categories = ref<Category[]>(CATEGORIES);
  const units = ref<Unit[]>(UNITS);
  const isLoading = ref(false);
  const searchQuery = ref('');
  const selectedCategory = ref<string>('all');
  const favoriteIds = ref<Set<string>>(new Set(['p1', 'p9', 'p12', 'p3'])); // Sample favorites

  // Filtered products
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
        p.sku.toLowerCase().includes(query)
      );
    }

    // Only active products
    result = result.filter(p => p.status === 'active');

    return result;
  });

  // Popular products (top 8 by popularity score)
  const popularProducts = computed(() => {
    return [...products.value]
      .filter(p => p.status === 'active')
      .sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0))
      .slice(0, 8);
  });

  // Low stock products
  const lowStockProducts = computed(() => {
    return products.value.filter(p => p.stock <= p.minStock);
  });

  // Get product by ID
  const getProduct = (id: string): Product | undefined => {
    return products.value.find(p => p.id === id);
  };

  // Get category by ID
  const getCategory = (id: string): Category | undefined => {
    return categories.value.find(c => c.id === id);
  };

  // Get products by category
  const getProductsByCategory = (categoryId: string): Product[] => {
    if (categoryId === 'all') return products.value.filter(p => p.status === 'active');
    return products.value.filter(p => p.categoryId === categoryId && p.status === 'active');
  };

  // Add product
  const addProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newProduct: Product = {
      ...product,
      id: `p${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    products.value.push(newProduct);
    return newProduct;
  };

  // Update product
  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const index = products.value.findIndex(p => p.id === id);
    if (index !== -1) {
      const existing = products.value[index]!;
      products.value[index] = {
        ...existing,
        ...updates,
        id: existing.id,
        name: updates.name ?? existing.name,
        sku: updates.sku ?? existing.sku,
        categoryId: updates.categoryId ?? existing.categoryId,
        unitId: updates.unitId ?? existing.unitId,
        price: updates.price ?? existing.price,
        stock: updates.stock ?? existing.stock,
        minStock: updates.minStock ?? existing.minStock,
        branchId: updates.branchId ?? existing.branchId,
        status: updates.status ?? existing.status,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      };
      return products.value[index];
    }
    return null;
  };

  // Update stock
  const updateStock = async (id: string, quantity: number) => {
    const product = products.value.find(p => p.id === id);
    if (product) {
      product.stock += quantity;
      product.updatedAt = new Date().toISOString();
    }
  };

  // Decrease stock after sale
  const decreaseStock = async (id: string, quantity: number) => {
    await updateStock(id, -quantity);
  };

  // Toggle favorite
  const toggleFavorite = (id: string) => {
    if (favoriteIds.value.has(id)) {
      favoriteIds.value.delete(id);
    } else {
      favoriteIds.value.add(id);
    }
    // Save to localStorage
    localStorage.setItem('pos_favorites', JSON.stringify([...favoriteIds.value]));
  };

  // Check if favorite
  const isFavorite = (id: string): boolean => {
    return favoriteIds.value.has(id);
  };

  // Load favorites from storage
  const loadFavorites = () => {
    const stored = localStorage.getItem('pos_favorites');
    if (stored) {
      try {
        favoriteIds.value = new Set(JSON.parse(stored));
      } catch {
        // Ignore parse errors
      }
    }
  };

  // Add category
  const addCategory = async (category: Omit<Category, 'id'>) => {
    const newCategory: Category = {
      ...category,
      id: `cat${Date.now()}`,
    };
    categories.value.push(newCategory);
    return newCategory;
  };

  // Initialize
  const init = async () => {
    isLoading.value = true;
    try {
      loadFavorites();
      // In production, load from Dexie/Nostr here
    } finally {
      isLoading.value = false;
    }
  };

  return {
    // State
    products,
    categories,
    units,
    isLoading,
    searchQuery,
    selectedCategory,
    favoriteIds,

    // Computed
    filteredProducts,
    popularProducts,
    lowStockProducts,

    // Methods
    getProduct,
    getCategory,
    getProductsByCategory,
    addProduct,
    updateProduct,
    updateStock,
    decreaseStock,
    toggleFavorite,
    isFavorite,
    addCategory,
    init,
  };
};
