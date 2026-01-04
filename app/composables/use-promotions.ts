// ============================================
// 🎁 PROMOTIONS COMPOSABLE
// BOGO, Discounts, Bundles Management
// ============================================

import type {
  Promotion,
  PromotionType,
  PromotionStatus,
  AppliedPromotion,
  Product,
} from "~/types";
import { db, type PromotionRecord } from "~/db/db";
import { generateUUIDv7 } from "~/utils/id";

// Singleton state
const promotions = ref<Promotion[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const isInitialized = ref(false);

/**
 * 🎁 PROMOTIONS STORE
 * Promotion CRUD with BOGO logic
 */
export function usePromotionsStore() {
  const toast = useToast();
  const { t } = useI18n();

  // ============================================
  // 📊 COMPUTED
  // ============================================

  // Active promotions (status = active AND within date range)
  const activePromotions = computed(() => {
    const now = new Date();
    const today = now.toISOString().split("T")[0]!; // Non-null assertion for date string
    const currentDay = now.getDay(); // 0-6

    return promotions.value.filter((p) => {
      // Check status
      if (p.status !== "active") return false;

      // Check date range
      if (p.startDate && today < p.startDate) return false;
      if (p.endDate && today > p.endDate) return false;

      // Check day of week
      if (p.daysOfWeek && p.daysOfWeek.length > 0) {
        if (!p.daysOfWeek.includes(currentDay)) return false;
      }

      // Check usage limit
      if (p.maxUsesTotal && p.usageCount >= p.maxUsesTotal) return false;

      return true;
    });
  });

  // BOGO promotions only
  const bogoPromotions = computed(() =>
    activePromotions.value.filter((p) => p.type === "bogo")
  );

  // ============================================
  // 🗄️ LOCAL STORAGE (Dexie)
  // ============================================

  async function loadPromotionsFromLocal(): Promise<Promotion[]> {
    try {
      if (!db.promotions) {
        console.warn("Promotions table not initialized in Dexie");
        return [];
      }
      const records = await db.promotions.toArray();
      return records.map((r: PromotionRecord) => ({
        ...r,
        triggerProductIds: r.triggerProductIds
          ? JSON.parse(r.triggerProductIds)
          : [],
        triggerCategoryIds: r.triggerCategoryIds
          ? JSON.parse(r.triggerCategoryIds)
          : undefined,
        rewardProductIds: r.rewardProductIds
          ? JSON.parse(r.rewardProductIds)
          : [],
        daysOfWeek: r.daysOfWeek ? JSON.parse(r.daysOfWeek) : undefined,
        type: r.type as PromotionType,
        status: r.status as PromotionStatus,
        rewardType: r.rewardType as
          | "free_product"
          | "discount"
          | "percentage_off",
      })) as Promotion[];
    } catch (e) {
      console.error("Failed to load promotions:", e);
      return [];
    }
  }

  async function savePromotionToLocal(promotion: Promotion): Promise<void> {
    if (!promotion.id) return;
    if (!db.promotions) {
      console.warn("Promotions table not initialized");
      return;
    }
    const record: PromotionRecord = {
      ...promotion,
      triggerProductIds: JSON.stringify(promotion.triggerProductIds),
      triggerCategoryIds: promotion.triggerCategoryIds
        ? JSON.stringify(promotion.triggerCategoryIds)
        : undefined,
      rewardProductIds: JSON.stringify(promotion.rewardProductIds),
      daysOfWeek: promotion.daysOfWeek
        ? JSON.stringify(promotion.daysOfWeek)
        : undefined,
      synced: false,
    };
    await db.promotions.put(record);
  }

  // ============================================
  // 🔄 INITIALIZATION
  // ============================================

  async function init(): Promise<void> {
    if (isInitialized.value) return;
    isLoading.value = true;
    error.value = null;

    try {
      promotions.value = await loadPromotionsFromLocal();
      isInitialized.value = true;
    } catch (e) {
      error.value = `Failed to initialize promotions: ${e}`;
      console.error(error.value);
    } finally {
      isLoading.value = false;
    }
  }

  // ============================================
  // 📝 CRUD OPERATIONS
  // ============================================

  async function addPromotion(
    data: Omit<Promotion, "id" | "usageCount" | "createdAt" | "updatedAt">
  ): Promise<Promotion> {
    const now = new Date().toISOString();
    const promotion: Promotion = {
      ...data,
      id: generateUUIDv7(),
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    promotions.value.push(promotion);
    await savePromotionToLocal(promotion);

    toast.add({
      title: t("promotions.createSuccess") || "Promotion created",
      icon: "i-heroicons-check-circle",
      color: "success",
    });

    return promotion;
  }

  async function updatePromotion(
    id: string,
    updates: Partial<Promotion>
  ): Promise<Promotion | null> {
    const index = promotions.value.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const existing = promotions.value[index]!;
    const updated: Promotion = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    promotions.value[index] = updated;
    await savePromotionToLocal(updated);

    toast.add({
      title: t("promotions.updateSuccess") || "Promotion updated",
      icon: "i-heroicons-check-circle",
      color: "success",
    });

    return updated;
  }

  async function deletePromotion(id: string): Promise<boolean> {
    const index = promotions.value.findIndex((p) => p.id === id);
    if (index === -1) return false;

    promotions.value.splice(index, 1);
    if (db.promotions) {
      await db.promotions.delete(id);
    }

    toast.add({
      title: t("promotions.deleteSuccess") || "Promotion deleted",
      icon: "i-heroicons-check-circle",
      color: "success",
    });

    return true;
  }

  // ============================================
  // 🔍 GETTERS
  // ============================================

  function getPromotion(id: string): Promotion | undefined {
    return promotions.value.find((p) => p.id === id);
  }

  function getPromotionsForProduct(productId: string): Promotion[] {
    return activePromotions.value.filter((p) =>
      p.triggerProductIds.includes(productId)
    );
  }

  function getPromotionsForCategory(categoryId: string): Promotion[] {
    return activePromotions.value.filter((p) =>
      p.triggerCategoryIds?.includes(categoryId)
    );
  }

  // ============================================
  // 🎁 BOGO LOGIC
  // ============================================

  interface CartItem {
    id: string;
    product: Product;
    quantity: number;
    price: number;
    isFreeItem?: boolean;
    promotionId?: string;
  }

  /**
   * Check which promotions apply to the current cart
   */
  function checkPromotions(
    cartItems: CartItem[]
  ): { promotion: Promotion; timesApplicable: number }[] {
    const applicablePromotions: {
      promotion: Promotion;
      timesApplicable: number;
    }[] = [];

    for (const promotion of activePromotions.value) {
      if (promotion.type !== "bogo") continue;

      // Count trigger products in cart
      let triggerCount = 0;
      for (const item of cartItems) {
        if (item.isFreeItem) continue; // Don't count free items
        if (promotion.triggerProductIds.includes(item.product.id)) {
          triggerCount += item.quantity;
        }
      }

      // Calculate how many times this promotion can be applied
      const timesApplicable = Math.floor(
        triggerCount / promotion.triggerQuantity
      );

      if (timesApplicable > 0) {
        // Respect maxUsesPerOrder limit
        const maxAllowed = promotion.maxUsesPerOrder || Infinity;
        applicablePromotions.push({
          promotion,
          timesApplicable: Math.min(timesApplicable, maxAllowed),
        });
      }
    }

    // Sort by priority (higher first)
    return applicablePromotions.sort(
      (a, b) => b.promotion.priority - a.promotion.priority
    );
  }

  /**
   * Apply BOGO promotion and return free items to add
   */
  function applyBOGO(
    promotion: Promotion,
    times: number,
    products: Product[]
  ): {
    freeProducts: { product: Product; quantity: number }[];
    discountAmount: number;
  } {
    const freeProducts: { product: Product; quantity: number }[] = [];
    let discountAmount = 0;

    if (promotion.rewardType === "free_product") {
      // Find reward products
      const rewardProductIds = promotion.rewardProductIds;
      const qty = promotion.rewardQuantity * times;

      for (const productId of rewardProductIds) {
        const product = products.find((p) => p.id === productId);
        if (product) {
          freeProducts.push({ product, quantity: qty });
          discountAmount += product.price * qty;
        }
      }
    } else if (promotion.rewardType === "discount") {
      discountAmount = (promotion.rewardDiscount || 0) * times;
    } else if (promotion.rewardType === "percentage_off") {
      // Percentage would be calculated on the trigger items' total
      // This is handled elsewhere
    }

    return { freeProducts, discountAmount };
  }

  /**
   * Increment usage count for a promotion
   */
  async function incrementUsage(
    promotionId: string,
    count: number = 1
  ): Promise<void> {
    const promotion = getPromotion(promotionId);
    if (!promotion) return;

    await updatePromotion(promotionId, {
      usageCount: promotion.usageCount + count,
    });
  }

  // ============================================
  // 📤 EXPORT
  // ============================================

  return {
    // State
    promotions: readonly(promotions),
    isLoading: readonly(isLoading),
    error: readonly(error),
    isInitialized: readonly(isInitialized),

    // Computed
    activePromotions,
    bogoPromotions,

    // Methods
    init,
    addPromotion,
    updatePromotion,
    deletePromotion,
    getPromotion,
    getPromotionsForProduct,
    getPromotionsForCategory,

    // BOGO Logic
    checkPromotions,
    applyBOGO,
    incrementUsage,
  };
}
