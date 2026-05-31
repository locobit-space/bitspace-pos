import { db } from "~/db/db";
import type { Branch } from "~/types";
import {
  BNOS_MIGRATION_FLAGS,
  createBnosSpaceCatalogMigrationDrafts,
  createBnosSpaceCustomerMigrationDrafts,
  createBnosSpaceInventoryMigrationDrafts,
  createBnosSpaceOrderMigrationDrafts,
  createBnosSpacePromotionMigrationDrafts,
  createBnosSpaceSettingsMigrationDrafts,
  createBnosSpaceStaffMigrationDrafts,
  readCanonicalAuthSnapshot,
  readLegacyBnosSpaceAuthSnapshot,
  readMigrationFlag,
  writeMigrationFlag,
  type BnosSpaceMigrationDraft,
  type LegacyBnosSpaceCategory,
  type LegacyBnosSpaceCustomer,
  type LegacyBnosSpaceOrder,
  type LegacyBnosSpacePromotion,
  type LegacyBnosSpacePromotionTier,
  type LegacyBnosSpaceProduct,
  type LegacyBnosSpaceShopConfig,
  type LegacyBnosSpaceStaff,
  type LegacyBnosSpaceStockAdjustment,
  type LegacyBnosSpaceStoreSettings,
  type LegacyBnosSpaceUnit,
} from "@bitos/bnos-core";

export type BnosSpaceMigrationPublishResult = {
  attempted: number;
  published: number;
  failed: number;
  settingsPublished: number;
  branchesPublished: number;
  catalogPublished: number;
  customersPublished: number;
  ordersPublished: number;
  paymentsPublished: number;
  promotionsPublished: number;
  inventoryPublished: number;
  staffPublished: number;
};

export type BnosSpaceMigrationStatus = {
  started: boolean;
  settingsDone: boolean;
  branchesDone: boolean;
  catalogDone: boolean;
  customersDone: boolean;
  ordersDone: boolean;
  promotionsDone: boolean;
  inventoryDone: boolean;
  staffDone: boolean;
  complete: boolean;
};

export type BnosSpaceMigrationVerification = {
  status: BnosSpaceMigrationStatus;
  localCounts: {
    branches: number;
    products: number;
    categories: number;
    units: number;
    customers: number;
    orders: number;
    promotions: number;
    inventory: number;
    staff: number;
  };
};

const emptyPublishResult = (): BnosSpaceMigrationPublishResult => ({
  attempted: 0,
  published: 0,
  failed: 0,
  settingsPublished: 0,
  branchesPublished: 0,
  catalogPublished: 0,
  customersPublished: 0,
  ordersPublished: 0,
  paymentsPublished: 0,
  promotionsPublished: 0,
  inventoryPublished: 0,
  staffPublished: 0,
});

const isMigrationStatusComplete = (status: BnosSpaceMigrationStatus) =>
  status.settingsDone &&
  status.branchesDone &&
  status.catalogDone &&
  status.customersDone &&
  status.ordersDone &&
  status.promotionsDone &&
  status.inventoryDone &&
  status.staffDone;

const publishResultForDrafts = (
  drafts: BnosSpaceMigrationDraft[],
): BnosSpaceMigrationPublishResult => ({
  ...emptyPublishResult(),
  attempted: drafts.length,
});

const parseJson = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const useBnosSpaceMigration = () => {
  const nostrData = useNostrData();

  const getAuthPubkey = () => {
    if (!import.meta.client) return null;
    const snapshot =
      readCanonicalAuthSnapshot(localStorage) ??
      readLegacyBnosSpaceAuthSnapshot(localStorage);
    return snapshot?.pubkey ?? null;
  };

  const collectSettingsMigrationDrafts = async (): Promise<
    BnosSpaceMigrationDraft[]
  > => {
    if (!import.meta.client) return [];

    const pubkey = getAuthPubkey();
    if (!pubkey) return [];

    const shopConfig = parseJson<LegacyBnosSpaceShopConfig>(
      localStorage.getItem("shopConfig"),
    );
    const currentBranchId = localStorage.getItem("currentBranchId");

    let settings: LegacyBnosSpaceStoreSettings | null = null;
    try {
      settings =
        (await nostrData.getSettings()) as unknown as LegacyBnosSpaceStoreSettings;
    } catch {
      settings = null;
    }

    const branches = (await db.branches.toArray()).map(
      (branch): Branch => ({
        id: branch.id,
        name: branch.name,
        code: branch.code,
        address: branch.address,
        nostrPubkey: branch.nostrPubkey,
        bolt12Offer: branch.bolt12Offer,
        status: "active",
      }),
    );

    return createBnosSpaceSettingsMigrationDrafts({
      pubkey,
      settings,
      shopConfig,
      branches,
      currentBranchId,
    });
  };

  const collectCatalogMigrationDrafts = async (): Promise<
    BnosSpaceMigrationDraft[]
  > => {
    if (!import.meta.client) return [];

    const pubkey = getAuthPubkey();
    if (!pubkey) return [];

    const shopConfig = parseJson<LegacyBnosSpaceShopConfig>(
      localStorage.getItem("shopConfig"),
    );

    let settings: LegacyBnosSpaceStoreSettings | null = null;
    try {
      settings =
        (await nostrData.getSettings()) as unknown as LegacyBnosSpaceStoreSettings;
    } catch {
      settings = null;
    }

    const products = (await db.products.toArray())
      .map((record): LegacyBnosSpaceProduct | null => {
        const data =
          typeof record.data === "string"
            ? parseJson<LegacyBnosSpaceProduct>(record.data)
            : null;
        return data
          ? {
              ...data,
              id: data.id || record.id,
              sku: data.sku || record.sku,
              barcode: data.barcode || record.barcode,
              name: data.name || record.name,
              categoryId: data.categoryId || record.categoryId,
              status: data.status || record.status,
              price: data.price ?? record.price,
              stock: data.stock ?? record.stock,
            }
          : null;
      })
      .filter((product): product is LegacyBnosSpaceProduct => !!product);

    const categories = (await db.categories.toArray()).map(
      (record): LegacyBnosSpaceCategory => ({
        id: record.id,
        name: record.name,
        description: record.description,
        icon: record.icon,
        sortOrder: record.sortOrder,
      }),
    );

    const units = (await db.units.toArray()).map(
      (record): LegacyBnosSpaceUnit => ({
        id: record.id,
        name: record.name,
        symbol: record.symbol,
      }),
    );

    return createBnosSpaceCatalogMigrationDrafts({
      pubkey,
      settings,
      shopConfig,
      products,
      categories,
      units,
    });
  };

  const collectCustomerMigrationDrafts = async (): Promise<
    BnosSpaceMigrationDraft[]
  > => {
    if (!import.meta.client) return [];

    const pubkey = getAuthPubkey();
    if (!pubkey) return [];

    const shopConfig = parseJson<LegacyBnosSpaceShopConfig>(
      localStorage.getItem("shopConfig"),
    );

    let settings: LegacyBnosSpaceStoreSettings | null = null;
    try {
      settings =
        (await nostrData.getSettings()) as unknown as LegacyBnosSpaceStoreSettings;
    } catch {
      settings = null;
    }

    const customers = (await db.customers.toArray()).map(
      (record): LegacyBnosSpaceCustomer => ({
        id: record.id,
        nostrPubkey: record.nostrPubkey,
        name: record.name,
        phone: record.phone,
        email: record.email,
        address: record.address,
        lud16: record.lud16,
        tags: record.tags ? parseJson<string[]>(record.tags) || [] : [],
        points: record.points,
        tier: record.tier,
        totalSpent: record.totalSpent,
        visitCount: record.visitCount,
        lastVisit: new Date(record.lastVisit).toISOString(),
        joinedAt: new Date(record.joinedAt).toISOString(),
        notes: record.notes,
        cardUid: record.cardUid,
        zapRewards: [],
      }),
    );

    return createBnosSpaceCustomerMigrationDrafts({
      pubkey,
      settings,
      shopConfig,
      customers,
    });
  };

  const collectOrderMigrationDrafts = async (): Promise<
    BnosSpaceMigrationDraft[]
  > => {
    if (!import.meta.client) return [];

    const pubkey = getAuthPubkey();
    if (!pubkey) return [];

    const shopConfig = parseJson<LegacyBnosSpaceShopConfig>(
      localStorage.getItem("shopConfig"),
    );
    const currentBranchId = localStorage.getItem("currentBranchId");

    let settings: LegacyBnosSpaceStoreSettings | null = null;
    try {
      settings =
        (await nostrData.getSettings()) as unknown as LegacyBnosSpaceStoreSettings;
    } catch {
      settings = null;
    }

    const orders = (await db.localOrders.toArray())
      .map((record): LegacyBnosSpaceOrder | null => {
        const data = parseJson<LegacyBnosSpaceOrder>(record.data);
        return data
          ? {
              ...data,
              id: data.id || record.id,
              status: data.status || record.status,
              paymentMethod: data.paymentMethod || record.paymentMethod,
              total: data.total ?? record.total,
              totalSats: data.totalSats ?? record.totalSats,
              date: data.date || new Date(record.createdAt).toISOString(),
            }
          : null;
      })
      .filter((order): order is LegacyBnosSpaceOrder => !!order);

    return createBnosSpaceOrderMigrationDrafts({
      pubkey,
      settings,
      shopConfig,
      orders,
      currentBranchId,
    });
  };

  const collectPromotionMigrationDrafts = async (): Promise<
    BnosSpaceMigrationDraft[]
  > => {
    if (!import.meta.client) return [];

    const pubkey = getAuthPubkey();
    if (!pubkey) return [];

    const shopConfig = parseJson<LegacyBnosSpaceShopConfig>(
      localStorage.getItem("shopConfig"),
    );

    let settings: LegacyBnosSpaceStoreSettings | null = null;
    try {
      settings =
        (await nostrData.getSettings()) as unknown as LegacyBnosSpaceStoreSettings;
    } catch {
      settings = null;
    }

    const promotions = (await db.promotions.toArray()).map(
      (record): LegacyBnosSpacePromotion => ({
        id: record.id,
        name: record.name,
        description: record.description,
        type: record.type,
        status: record.status,
        scope: record.scope,
        triggerProductIds: parseJson<string[]>(record.triggerProductIds) || [],
        triggerQuantity: record.triggerQuantity,
        triggerCategoryIds: record.triggerCategoryIds
          ? parseJson<string[]>(record.triggerCategoryIds) || []
          : [],
        discountType: record.discountType,
        discountValue: record.discountValue,
        tiers: record.tiers
          ? parseJson<LegacyBnosSpacePromotionTier[]>(record.tiers) || []
          : [],
        rewardType: record.rewardType,
        rewardProductIds: parseJson<string[]>(record.rewardProductIds) || [],
        rewardQuantity: record.rewardQuantity,
        rewardDiscount: record.rewardDiscount,
        rewardPercentage: record.rewardPercentage,
        minOrderValue: record.minOrderValue,
        minQuantity: record.minQuantity,
        customerTiers: record.customerTiers
          ? parseJson<string[]>(record.customerTiers) || []
          : [],
        firstOrderOnly: record.firstOrderOnly,
        maxItemsAffected: record.maxItemsAffected,
        startDate: record.startDate,
        endDate: record.endDate,
        daysOfWeek: record.daysOfWeek
          ? parseJson<number[]>(record.daysOfWeek) || []
          : [],
        startTime: record.startTime,
        endTime: record.endTime,
        maxUsesPerOrder: record.maxUsesPerOrder,
        maxUsesPerCustomer: record.maxUsesPerCustomer,
        maxUsesTotal: record.maxUsesTotal,
        usageCount: record.usageCount,
        stackable: record.stackable,
        excludePromotionIds: record.excludePromotionIds
          ? parseJson<string[]>(record.excludePromotionIds) || []
          : [],
        priority: record.priority,
        badgeText: record.badgeText,
        badgeColor: record.badgeColor,
        highlightOnPOS: record.highlightOnPOS,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        createdBy: record.createdBy,
      }),
    );

    return createBnosSpacePromotionMigrationDrafts({
      pubkey,
      settings,
      shopConfig,
      promotions,
    });
  };

  const collectInventoryMigrationDrafts = async (): Promise<
    BnosSpaceMigrationDraft[]
  > => {
    if (!import.meta.client) return [];

    const pubkey = getAuthPubkey();
    if (!pubkey) return [];

    const shopConfig = parseJson<LegacyBnosSpaceShopConfig>(
      localStorage.getItem("shopConfig"),
    );
    const currentBranchId = localStorage.getItem("currentBranchId");

    let settings: LegacyBnosSpaceStoreSettings | null = null;
    try {
      settings =
        (await nostrData.getSettings()) as unknown as LegacyBnosSpaceStoreSettings;
    } catch {
      settings = null;
    }

    const stockAdjustments = (await db.stockAdjustments.toArray()).map(
      (record): LegacyBnosSpaceStockAdjustment => ({
        id: record.id,
        productId: record.productId,
        branchId: (record as typeof record & { branchId?: string }).branchId,
        previousStock: record.previousStock,
        newStock: record.newStock,
        adjustment: record.adjustment,
        reason: record.reason,
        notes: record.notes,
        staffId: record.staffId,
        createdAt: record.createdAt,
        nostrEventId: record.nostrEventId,
        synced: record.synced,
      }),
    );

    return createBnosSpaceInventoryMigrationDrafts({
      pubkey,
      settings,
      shopConfig,
      stockAdjustments,
      currentBranchId,
    });
  };

  const collectStaffMigrationDrafts = async (): Promise<
    BnosSpaceMigrationDraft[]
  > => {
    if (!import.meta.client) return [];

    const pubkey = getAuthPubkey();
    if (!pubkey) return [];

    const shopConfig = parseJson<LegacyBnosSpaceShopConfig>(
      localStorage.getItem("shopConfig"),
    );

    let settings: LegacyBnosSpaceStoreSettings | null = null;
    try {
      settings =
        (await nostrData.getSettings()) as unknown as LegacyBnosSpaceStoreSettings;
    } catch {
      settings = null;
    }

    const localStorageUsers =
      parseJson<LegacyBnosSpaceStaff[]>(localStorage.getItem("bitspace_users")) ||
      [];
    const dbStaff = (await db.staff.toArray()).map(
      (record): LegacyBnosSpaceStaff => ({
        id: record.id,
        name: record.name,
        email: record.email,
        pin: record.pin,
        role: record.role,
        permissions: parseJson<Record<string, unknown>>(record.permissions),
        branchId: record.branchId,
        isActive: record.isActive,
        avatar: record.avatar,
        pubkeyHex: record.nostrPubkey,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        nostrEventId: record.nostrEventId,
        synced: record.synced,
      }),
    );
    const staffById = new Map<string, LegacyBnosSpaceStaff>();
    for (const staff of [...localStorageUsers, ...dbStaff]) {
      if (!staff.id) continue;
      staffById.set(staff.id, { ...staffById.get(staff.id), ...staff });
    }

    return createBnosSpaceStaffMigrationDrafts({
      pubkey,
      settings,
      shopConfig,
      staff: [...staffById.values()],
    });
  };

  const getSettingsMigrationStatus = (): BnosSpaceMigrationStatus => {
    if (!import.meta.client) {
      return {
        started: false,
        settingsDone: false,
        branchesDone: false,
        catalogDone: false,
        customersDone: false,
        ordersDone: false,
        promotionsDone: false,
        inventoryDone: false,
        staffDone: false,
        complete: false,
      };
    }

    const status = {
      started: readMigrationFlag(
        localStorage,
        BNOS_MIGRATION_FLAGS.BNOS_SPACE_V1_STARTED,
      ),
      settingsDone: readMigrationFlag(
        localStorage,
        BNOS_MIGRATION_FLAGS.BNOS_SPACE_V1_SETTINGS_DONE,
      ),
      branchesDone: readMigrationFlag(
        localStorage,
        BNOS_MIGRATION_FLAGS.BNOS_SPACE_V1_BRANCHES_DONE,
      ),
      catalogDone: readMigrationFlag(
        localStorage,
        BNOS_MIGRATION_FLAGS.BNOS_SPACE_V1_CATALOG_DONE,
      ),
      customersDone: readMigrationFlag(
        localStorage,
        BNOS_MIGRATION_FLAGS.BNOS_SPACE_V1_CUSTOMERS_DONE,
      ),
      ordersDone: readMigrationFlag(
        localStorage,
        BNOS_MIGRATION_FLAGS.BNOS_SPACE_V1_ORDERS_DONE,
      ),
      promotionsDone: readMigrationFlag(
        localStorage,
        BNOS_MIGRATION_FLAGS.BNOS_SPACE_V1_PROMOTIONS_DONE,
      ),
      inventoryDone: readMigrationFlag(
        localStorage,
        BNOS_MIGRATION_FLAGS.BNOS_SPACE_V1_INVENTORY_DONE,
      ),
      staffDone: readMigrationFlag(
        localStorage,
        BNOS_MIGRATION_FLAGS.BNOS_SPACE_V1_STAFF_DONE,
      ),
      complete: readMigrationFlag(
        localStorage,
        BNOS_MIGRATION_FLAGS.BNOS_SPACE_V1_COMPLETE,
      ),
    };

    return {
      ...status,
      complete: status.complete && isMigrationStatusComplete(status),
    };
  };

  const markCompleteIfAllDomainsDone = () => {
    if (!import.meta.client) return;
    const status = getSettingsMigrationStatus();
    writeMigrationFlag(
      localStorage,
      BNOS_MIGRATION_FLAGS.BNOS_SPACE_V1_COMPLETE,
      isMigrationStatusComplete(status),
    );
  };

  const markSettingsMigrationStarted = () => {
    if (!import.meta.client) return;
    writeMigrationFlag(
      localStorage,
      BNOS_MIGRATION_FLAGS.BNOS_SPACE_V1_STARTED,
    );
  };

  const publishSettingsMigrationDrafts =
    async (): Promise<BnosSpaceMigrationPublishResult> => {
      const drafts = await collectSettingsMigrationDrafts();
      const result = publishResultForDrafts(drafts);

      if (!import.meta.client) return result;
      if (drafts.length === 0) {
        writeMigrationFlag(
          localStorage,
          BNOS_MIGRATION_FLAGS.BNOS_SPACE_V1_SETTINGS_DONE,
        );
        writeMigrationFlag(
          localStorage,
          BNOS_MIGRATION_FLAGS.BNOS_SPACE_V1_BRANCHES_DONE,
        );
        markCompleteIfAllDomainsDone();
        return result;
      }

      markSettingsMigrationStarted();

      for (const draft of drafts) {
        const extraTags = draft.event.tags.filter(
          (tag) => tag[0] !== "d" && tag[0] !== "encrypted",
        );
        const event = await nostrData.publishReplaceableEvent(
          draft.event.kind,
          draft.data,
          draft.dTag,
          extraTags,
          draft.requiresEncryption,
        );

        if (!event) {
          result.failed += 1;
          continue;
        }

        result.published += 1;
        if (draft.table === "storeSettings") result.settingsPublished += 1;
        if (draft.table === "branches") result.branchesPublished += 1;
        if (
          draft.table === "products" ||
          draft.table === "categories" ||
          draft.table === "units"
        ) {
          result.catalogPublished += 1;
        }
      }

      const expectedSettings = drafts.filter(
        (draft) => draft.table === "storeSettings",
      ).length;
      const expectedBranches = drafts.filter(
        (draft) => draft.table === "branches",
      ).length;

      if (result.settingsPublished === expectedSettings) {
        writeMigrationFlag(
          localStorage,
          BNOS_MIGRATION_FLAGS.BNOS_SPACE_V1_SETTINGS_DONE,
        );
      }

      if (result.branchesPublished === expectedBranches) {
        writeMigrationFlag(
          localStorage,
          BNOS_MIGRATION_FLAGS.BNOS_SPACE_V1_BRANCHES_DONE,
        );
      }

      markCompleteIfAllDomainsDone();

      return result;
    };

  const publishCatalogMigrationDrafts =
    async (): Promise<BnosSpaceMigrationPublishResult> => {
      const drafts = await collectCatalogMigrationDrafts();
      const result = publishResultForDrafts(drafts);

      if (!import.meta.client) return result;
      if (drafts.length === 0) {
        writeMigrationFlag(
          localStorage,
          BNOS_MIGRATION_FLAGS.BNOS_SPACE_V1_CATALOG_DONE,
        );
        markCompleteIfAllDomainsDone();
        return result;
      }

      markSettingsMigrationStarted();

      for (const draft of drafts) {
        const extraTags = draft.event.tags.filter(
          (tag) => tag[0] !== "d" && tag[0] !== "encrypted",
        );
        const event = await nostrData.publishReplaceableEvent(
          draft.event.kind,
          draft.data,
          draft.dTag,
          extraTags,
          draft.requiresEncryption,
        );

        if (!event) {
          result.failed += 1;
          continue;
        }

        result.published += 1;
        result.catalogPublished += 1;
      }

      if (result.failed === 0) {
        writeMigrationFlag(
          localStorage,
          BNOS_MIGRATION_FLAGS.BNOS_SPACE_V1_CATALOG_DONE,
        );
      }

      markCompleteIfAllDomainsDone();

      return result;
    };

  const publishCustomerMigrationDrafts =
    async (): Promise<BnosSpaceMigrationPublishResult> => {
      const drafts = await collectCustomerMigrationDrafts();
      const result = publishResultForDrafts(drafts);

      if (!import.meta.client) return result;
      if (drafts.length === 0) {
        writeMigrationFlag(
          localStorage,
          BNOS_MIGRATION_FLAGS.BNOS_SPACE_V1_CUSTOMERS_DONE,
        );
        markCompleteIfAllDomainsDone();
        return result;
      }

      markSettingsMigrationStarted();

      for (const draft of drafts) {
        const extraTags = draft.event.tags.filter(
          (tag) => tag[0] !== "d" && tag[0] !== "encrypted",
        );
        const event = await nostrData.publishReplaceableEvent(
          draft.event.kind,
          draft.data,
          draft.dTag,
          extraTags,
          draft.requiresEncryption,
        );

        if (!event) {
          result.failed += 1;
          continue;
        }

        result.published += 1;
        result.customersPublished += 1;
      }

      if (result.failed === 0) {
        writeMigrationFlag(
          localStorage,
          BNOS_MIGRATION_FLAGS.BNOS_SPACE_V1_CUSTOMERS_DONE,
        );
      }

      markCompleteIfAllDomainsDone();

      return result;
    };

  const publishOrderMigrationDrafts =
    async (): Promise<BnosSpaceMigrationPublishResult> => {
      const drafts = await collectOrderMigrationDrafts();
      const result = publishResultForDrafts(drafts);

      if (!import.meta.client) return result;
      if (drafts.length === 0) {
        writeMigrationFlag(
          localStorage,
          BNOS_MIGRATION_FLAGS.BNOS_SPACE_V1_ORDERS_DONE,
        );
        markCompleteIfAllDomainsDone();
        return result;
      }

      markSettingsMigrationStarted();

      for (const draft of drafts) {
        const extraTags = draft.event.tags.filter(
          (tag) => tag[0] !== "d" && tag[0] !== "encrypted",
        );
        const event = await nostrData.publishReplaceableEvent(
          draft.event.kind,
          draft.data,
          draft.dTag,
          extraTags,
          draft.requiresEncryption,
        );

        if (!event) {
          result.failed += 1;
          continue;
        }

        result.published += 1;
        if (draft.table === "orders") result.ordersPublished += 1;
        if (draft.table === "payments") result.paymentsPublished += 1;
      }

      if (result.failed === 0) {
        writeMigrationFlag(
          localStorage,
          BNOS_MIGRATION_FLAGS.BNOS_SPACE_V1_ORDERS_DONE,
        );
      }

      markCompleteIfAllDomainsDone();

      return result;
    };

  const publishPromotionMigrationDrafts =
    async (): Promise<BnosSpaceMigrationPublishResult> => {
      const drafts = await collectPromotionMigrationDrafts();
      const result = publishResultForDrafts(drafts);

      if (!import.meta.client) return result;
      if (drafts.length === 0) {
        writeMigrationFlag(
          localStorage,
          BNOS_MIGRATION_FLAGS.BNOS_SPACE_V1_PROMOTIONS_DONE,
        );
        markCompleteIfAllDomainsDone();
        return result;
      }

      markSettingsMigrationStarted();

      for (const draft of drafts) {
        const extraTags = draft.event.tags.filter(
          (tag) => tag[0] !== "d" && tag[0] !== "encrypted",
        );
        const event = await nostrData.publishReplaceableEvent(
          draft.event.kind,
          draft.data,
          draft.dTag,
          extraTags,
          draft.requiresEncryption,
        );

        if (!event) {
          result.failed += 1;
          continue;
        }

        result.published += 1;
        result.promotionsPublished += 1;
      }

      if (result.failed === 0) {
        writeMigrationFlag(
          localStorage,
          BNOS_MIGRATION_FLAGS.BNOS_SPACE_V1_PROMOTIONS_DONE,
        );
      }

      markCompleteIfAllDomainsDone();

      return result;
    };

  const publishInventoryMigrationDrafts =
    async (): Promise<BnosSpaceMigrationPublishResult> => {
      const drafts = await collectInventoryMigrationDrafts();
      const result = publishResultForDrafts(drafts);

      if (!import.meta.client) return result;
      if (drafts.length === 0) {
        writeMigrationFlag(
          localStorage,
          BNOS_MIGRATION_FLAGS.BNOS_SPACE_V1_INVENTORY_DONE,
        );
        markCompleteIfAllDomainsDone();
        return result;
      }

      markSettingsMigrationStarted();

      for (const draft of drafts) {
        const extraTags = draft.event.tags.filter(
          (tag) => tag[0] !== "d" && tag[0] !== "encrypted",
        );
        const event = await nostrData.publishReplaceableEvent(
          draft.event.kind,
          draft.data,
          draft.dTag,
          extraTags,
          draft.requiresEncryption,
        );

        if (!event) {
          result.failed += 1;
          continue;
        }

        result.published += 1;
        result.inventoryPublished += 1;
      }

      if (result.failed === 0) {
        writeMigrationFlag(
          localStorage,
          BNOS_MIGRATION_FLAGS.BNOS_SPACE_V1_INVENTORY_DONE,
        );
      }

      markCompleteIfAllDomainsDone();

      return result;
    };

  const publishStaffMigrationDrafts =
    async (): Promise<BnosSpaceMigrationPublishResult> => {
      const drafts = await collectStaffMigrationDrafts();
      const result = publishResultForDrafts(drafts);

      if (!import.meta.client) return result;
      if (drafts.length === 0) {
        writeMigrationFlag(
          localStorage,
          BNOS_MIGRATION_FLAGS.BNOS_SPACE_V1_STAFF_DONE,
        );
        markCompleteIfAllDomainsDone();
        return result;
      }

      markSettingsMigrationStarted();

      for (const draft of drafts) {
        const extraTags = draft.event.tags.filter(
          (tag) => tag[0] !== "d" && tag[0] !== "encrypted",
        );
        const event = await nostrData.publishReplaceableEvent(
          draft.event.kind,
          draft.data,
          draft.dTag,
          extraTags,
          draft.requiresEncryption,
        );

        if (!event) {
          result.failed += 1;
          continue;
        }

        result.published += 1;
        result.staffPublished += 1;
      }

      if (result.failed === 0) {
        writeMigrationFlag(
          localStorage,
          BNOS_MIGRATION_FLAGS.BNOS_SPACE_V1_STAFF_DONE,
        );
      }

      markCompleteIfAllDomainsDone();

      return result;
    };

  const getMigrationVerification =
    async (): Promise<BnosSpaceMigrationVerification> => {
      if (!import.meta.client) {
        return {
          status: getSettingsMigrationStatus(),
          localCounts: {
            branches: 0,
            products: 0,
            categories: 0,
            units: 0,
            customers: 0,
            orders: 0,
            promotions: 0,
            inventory: 0,
            staff: 0,
          },
        };
      }

      const localStorageUsers =
        parseJson<LegacyBnosSpaceStaff[]>(localStorage.getItem("bitspace_users")) ||
        [];
      const [
        branches,
        products,
        categories,
        units,
        customers,
        orders,
        promotions,
        inventory,
        dbStaff,
      ] = await Promise.all([
        db.branches.count(),
        db.products.count(),
        db.categories.count(),
        db.units.count(),
        db.customers.count(),
        db.localOrders.count(),
        db.promotions.count(),
        db.stockAdjustments.count(),
        db.staff.toArray(),
      ]);

      return {
        status: getSettingsMigrationStatus(),
        localCounts: {
          branches,
          products,
          categories,
          units,
          customers,
          orders,
          promotions,
          inventory,
          staff: new Set([
            ...localStorageUsers.map((staff) => staff.id).filter(Boolean),
            ...dbStaff.map((staff) => staff.id).filter(Boolean),
          ]).size,
        },
      };
    };

  return {
    collectCatalogMigrationDrafts,
    collectCustomerMigrationDrafts,
    collectInventoryMigrationDrafts,
    collectOrderMigrationDrafts,
    collectPromotionMigrationDrafts,
    collectSettingsMigrationDrafts,
    collectStaffMigrationDrafts,
    getSettingsMigrationStatus,
    getMigrationVerification,
    markSettingsMigrationStarted,
    publishCatalogMigrationDrafts,
    publishCustomerMigrationDrafts,
    publishInventoryMigrationDrafts,
    publishOrderMigrationDrafts,
    publishPromotionMigrationDrafts,
    publishSettingsMigrationDrafts,
    publishStaffMigrationDrafts,
  };
};
