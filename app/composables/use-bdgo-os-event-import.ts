import type { Event } from "nostr-tools";
import {
  readCanonicalAuthSnapshot,
  readLegacyBnosSpaceAuthSnapshot,
} from "@bitos/bnos-core/auth";
import { NOSTR_KINDS } from "~/types/nostr-kinds";
import { db } from "~/db/db";
import type {
  Branch,
  Category,
  Order,
  OrderItem,
  Product,
  StoreUser,
  Unit,
} from "~/types";

type ImportScope =
  | "settings"
  | "branches"
  | "catalog"
  | "customers"
  | "orders"
  | "promotions"
  | "inventory"
  | "staff";

export type BdgoOsEventImportResult = {
  queried: number;
  imported: number;
  skipped: number;
  failed: number;
  byScope: Record<ImportScope, number>;
};

type BdgoProtectedEnvelope = {
  encrypted: true;
  v: 1;
  scheme: "bdgoos.local-company-key.v1";
  alg: "AES-256-GCM";
  kid: string;
  scopeId: string;
  nonce: string;
  aad: Record<string, unknown>;
  ciphertext: string;
};

const emptyResult = (): BdgoOsEventImportResult => ({
  queried: 0,
  imported: 0,
  skipped: 0,
  failed: 0,
  byScope: {
    settings: 0,
    branches: 0,
    catalog: 0,
    customers: 0,
    orders: 0,
    promotions: 0,
    inventory: 0,
    staff: 0,
  },
});

const getTagValue = (event: Event, name: string) =>
  event.tags.find((tag) => tag[0] === name)?.[1];

const numberValue = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const stringValue = (value: unknown, fallback = "") =>
  typeof value === "string" && value.trim() ? value : fallback;

const isoFromSeconds = (seconds?: number) =>
  new Date((seconds || Math.floor(Date.now() / 1000)) * 1000).toISOString();

const safeJson = (value: unknown) => JSON.stringify(value ?? null);

const parseJson = <T>(value: string): T | null => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const toBase64 = (value: string) => {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  return normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
};

const fromBase64Url = (value: string) => {
  const binary = atob(toBase64(value));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const isBdgoProtectedEnvelope = (
  value: unknown,
): value is BdgoProtectedEnvelope => {
  const candidate = value as Partial<BdgoProtectedEnvelope>;
  return (
    !!candidate &&
    candidate.encrypted === true &&
    candidate.v === 1 &&
    candidate.scheme === "bdgoos.local-company-key.v1" &&
    candidate.alg === "AES-256-GCM" &&
    typeof candidate.kid === "string" &&
    typeof candidate.scopeId === "string" &&
    typeof candidate.nonce === "string" &&
    typeof candidate.ciphertext === "string"
  );
};

const readBdgoSensitiveDataKey = (keyId: string) => {
  if (!import.meta.client) return null;
  const raw = localStorage.getItem(`bdgoos_sensitive_data_key:${keyId}`);
  return raw ? fromBase64Url(raw) : null;
};

const decryptBdgoProtected = async <T>(
  envelope: BdgoProtectedEnvelope,
): Promise<T | null> => {
  if (!import.meta.client || !window.crypto?.subtle) return null;

  const rawKey =
    readBdgoSensitiveDataKey(envelope.kid) ||
    readBdgoSensitiveDataKey(`${envelope.scopeId}:v1`);
  if (!rawKey) return null;

  try {
    const key = await window.crypto.subtle.importKey(
      "raw",
      rawKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"],
    );
    const plaintext = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: fromBase64Url(envelope.nonce),
        additionalData: new TextEncoder().encode(JSON.stringify(envelope.aad)),
      },
      key,
      fromBase64Url(envelope.ciphertext),
    );
    return JSON.parse(new TextDecoder().decode(plaintext)) as T;
  } catch {
    return null;
  }
};

const mapStatus = (status?: string): "active" | "inactive" =>
  status === "active" || status === "available" ? "active" : "inactive";

const mapOrderType = (type?: string): Order["orderType"] => {
  if (type === "takeaway") return "take_away";
  if (type === "online") return "pickup";
  if (type === "dine_in" || type === "delivery") return type;
  return "take_away";
};

export const useBdgoOsEventImport = () => {
  const relay = useNostrRelay();
  const encryption = useEncryption();

  const getAuth = () => {
    if (!import.meta.client) return null;
    return (
      readCanonicalAuthSnapshot(localStorage) ||
      readLegacyBnosSpaceAuthSnapshot(localStorage)
    );
  };

  const parseEventContent = async <T>(event: Event): Promise<T | null> => {
    const parsed = parseJson<unknown>(event.content);
    if (!parsed) return null;

    if (isBdgoProtectedEnvelope(parsed)) {
      return decryptBdgoProtected<T>(parsed);
    }

    const payload = parsed as { v?: number; ct?: string };
    if ((payload.v === 1 || payload.v === 2) && payload.ct) {
      const auth = getAuth();
      if (!auth?.privateKeyHex) return null;
      const result = await encryption.decrypt<T>(
        {
          ciphertext: payload.ct,
          algorithm: payload.v === 2 ? "nip-44" : "nip-04",
          version: payload.v,
          encryptedAt: "",
        },
        {
          nostrPrivkey: auth.privateKeyHex,
          nostrPubkey: event.pubkey,
        },
      );
      return result.success ? result.data || null : null;
    }

    return parsed as T;
  };

  const importSettings = async (event: Event, data: Record<string, unknown>) => {
    if (!import.meta.client) return false;
    const address = data.address as Record<string, unknown> | undefined;
    const shopConfig = {
      name: stringValue(data.name, "My Shop"),
      address:
        typeof data.address === "string"
          ? data.address
          : [address?.street, address?.city, address?.country]
              .filter(Boolean)
              .join(", "),
      phone: data.phone,
      email: data.email,
      currency: stringValue(data.currency, "LAK"),
      timezone: stringValue(data.timezone, "Asia/Vientiane"),
      language: stringValue(data.locale, "en-US"),
      taxRate: numberValue(data.taxRate),
      receiptFooter: data.receiptFooter,
      defaultBranchId: getTagValue(event, "branch") || undefined,
      platformTag: "bdgo-os",
      syncedFrom: "bdgo-os",
      syncedEventId: event.id,
      updatedAt: isoFromSeconds(event.created_at),
    };
    localStorage.setItem("shopConfig", JSON.stringify(shopConfig));
    return true;
  };

  const importBranch = async (event: Event, data: Record<string, unknown>) => {
    const id = stringValue(data.id, getTagValue(event, "d") || event.id);
    await db.branches.put({
      id,
      name: stringValue(data.name, "Main Branch"),
      code: stringValue(data.code, id.slice(0, 8).toUpperCase()),
      address:
        typeof data.address === "string"
          ? data.address
          : safeJson(data.address || {}),
      nostrPubkey: stringValue(data.managerPubkey, event.pubkey),
      nostrEventId: event.id,
      synced: true,
    });
    return true;
  };

  const importCategory = async (event: Event, data: Record<string, unknown>) => {
    const id = stringValue(data.id, getTagValue(event, "d") || event.id);
    await db.categories.put({
      id,
      name: stringValue(data.name, id),
      description: data.description as string | undefined,
      icon: data.icon as string | undefined,
      sortOrder: numberValue(data.sortOrder),
      nostrEventId: event.id,
      synced: true,
    });
    return true;
  };

  const importUnit = async (event: Event, data: Record<string, unknown>) => {
    const id = stringValue(data.id, getTagValue(event, "d") || event.id);
    await db.units.put({
      id,
      name: stringValue(data.name, id),
      symbol: stringValue(data.symbol, stringValue(data.name, id)),
      nostrEventId: event.id,
      synced: true,
    });
    return true;
  };

  const importProduct = async (event: Event, data: Record<string, unknown>) => {
    const id = stringValue(data.id, getTagValue(event, "d") || event.id);
    const pricing = data.pricing as Record<string, unknown> | undefined;
    const inventory = data.inventory as Record<string, unknown> | undefined;
    const stock = numberValue(data.stock ?? inventory?.stock);
    const product: Product = {
      id,
      name: stringValue(data.name, id),
      sku: stringValue(data.sku, id),
      barcode: data.barcode as string | undefined,
      description: data.description as string | undefined,
      categoryId: stringValue(data.categoryId, "default"),
      unitId: stringValue(data.unitId, "piece"),
      price: numberValue(pricing?.price ?? data.price),
      costPrice: numberValue(pricing?.costPrice, 0),
      stock,
      minStock: numberValue(inventory?.lowStockThreshold ?? data.minStock),
      branchId: stringValue(data.branchId, "main"),
      status: mapStatus(stringValue(data.status, data.available === false ? "inactive" : "active")),
      image: Array.isArray(data.images) ? data.images[0] : undefined,
      images: Array.isArray(data.images) ? (data.images as string[]) : undefined,
      createdAt: isoFromSeconds(event.created_at),
      updatedAt: isoFromSeconds(event.created_at),
      productType: data.type === "service" ? "service" : "good",
      trackStock: data.trackInventory !== false && data.trackStock !== false,
      hasVariants: data.hasVariants as boolean | undefined,
      variants: Array.isArray(data.variants)
        ? (data.variants as Product["variants"])
        : undefined,
      tags: Array.isArray(data.tags) ? (data.tags as string[]) : undefined,
      isPublic: data.isPublic !== false,
      synced: true,
    };
    await db.products.put({
      id,
      data: JSON.stringify(product),
      sku: product.sku,
      barcode: product.barcode,
      name: product.name,
      categoryId: product.categoryId,
      status: product.status,
      price: product.price,
      stock: product.stock,
      updatedAt: Date.now(),
      nostrEventId: event.id,
      synced: true,
    });
    return true;
  };

  const importCustomer = async (event: Event, data: Record<string, unknown>) => {
    const id = stringValue(data.id, getTagValue(event, "d") || event.id);
    const lastVisit = numberValue(data.lastOrderAt ?? data.updatedAt);
    await db.customers.put({
      id,
      nostrPubkey: stringValue(data.pubkey ?? data.npub, id),
      name: data.name as string | undefined,
      phone: data.phone as string | undefined,
      email: data.email as string | undefined,
      address: data.address as string | undefined,
      tags: safeJson(data.tags || []),
      points: numberValue(data.loyaltyPoints),
      tier: stringValue(data.membershipTierId ?? data.segment, "bronze"),
      totalSpent: numberValue(data.totalSpend),
      visitCount: numberValue(data.totalOrders),
      lastVisit: lastVisit || event.created_at,
      joinedAt: numberValue(data.createdAt, event.created_at),
      notes: Array.isArray(data.notes) ? data.notes.join("\n") : undefined,
      nostrEventId: event.id,
      synced: true,
    });
    return true;
  };

  const importOrder = async (event: Event, data: Record<string, unknown>) => {
    const id = stringValue(data.id, getTagValue(event, "d") || event.id);
    const totals = data.totals as Record<string, unknown> | undefined;
    const createdAt = numberValue(data.createdAt, event.created_at);
    const items = Array.isArray(data.items) ? data.items : [];
    const order: Order = {
      id,
      orderNumber: numberValue(data.orderNumber, 0) || undefined,
      customer: stringValue(data.customerName ?? data.customerId, "Walk-in"),
      customerEmail: data.customerEmail as string | undefined,
      customerPubkey: data.customerPubkey as string | undefined,
      branch: stringValue(data.branchId, "main"),
      date: isoFromSeconds(createdAt),
      total: numberValue(totals?.total ?? data.total),
      currency: stringValue(totals?.currency ?? data.currency, "LAK") as Order["currency"],
      status: stringValue(data.status, "pending") as Order["status"],
      paymentMethod: stringValue(data.paymentMethod, "cash") as Order["paymentMethod"],
      notes: data.notes as string | undefined,
      items: items.map((item, index) => {
        const row = item as Record<string, unknown>;
        const quantity = numberValue(row.quantity, 1);
        const price = numberValue(row.unitPrice ?? row.price);
        return {
          id: stringValue(row.id, `${id}-item-${index + 1}`),
          productId: stringValue(row.productId, ""),
          quantity,
          price,
          total: numberValue(row.lineTotal ?? row.total, price * quantity),
          createdAt: isoFromSeconds(createdAt),
          updatedAt: isoFromSeconds(event.created_at),
          product: {
            id: stringValue(row.productId, ""),
            name: stringValue(row.productName, "Item"),
            sku: "",
            categoryId: "",
            unitId: "piece",
            price,
            stock: 0,
            minStock: 0,
            branchId: stringValue(data.branchId, "main"),
            status: "active",
            createdAt: isoFromSeconds(createdAt),
            updatedAt: isoFromSeconds(event.created_at),
          },
          notes: row.notes as string | undefined,
        } satisfies OrderItem;
      }),
      tax: numberValue(totals?.taxAmount),
      discount: numberValue(totals?.discountAmount),
      updatedAt: isoFromSeconds(numberValue(data.updatedAt, event.created_at)),
      orderType: mapOrderType(data.type as string | undefined),
      customerPhone: data.customerPhone as string | undefined,
      tags: Array.isArray(data.tags) ? (data.tags as string[]) : undefined,
    };
    await db.localOrders.put({
      id,
      data: JSON.stringify(order),
      status: order.status,
      paymentMethod: order.paymentMethod || "cash",
      total: order.total,
      totalSats: numberValue(data.totalSats),
      createdAt,
      syncedAt: event.created_at,
      nostrEventId: event.id,
    });
    return true;
  };

  const importPromotion = async (
    event: Event,
    data: Record<string, unknown>,
  ) => {
    const id = stringValue(data.id, getTagValue(event, "d") || event.id);
    const active = data.active !== false;
    await db.promotions.put({
      id,
      name: stringValue(data.name, id),
      description: data.description as string | undefined,
      type: stringValue(data.type, "discount"),
      status: active ? "active" : "inactive",
      scope: Array.isArray(data.categoryIds) ? "category" : "product",
      triggerProductIds: safeJson(data.productIds || []),
      triggerQuantity: numberValue(data.buyQuantity, 1),
      triggerCategoryIds: safeJson(data.categoryIds || []),
      discountType: "percentage",
      discountValue: numberValue(data.value),
      rewardType: "discount",
      rewardProductIds: safeJson([]),
      rewardQuantity: numberValue(data.getQuantity),
      minOrderValue: numberValue(data.minimumSpend),
      startDate: data.validFrom
        ? isoFromSeconds(numberValue(data.validFrom))
        : undefined,
      endDate: data.validUntil
        ? isoFromSeconds(numberValue(data.validUntil))
        : undefined,
      maxUsesTotal: numberValue(data.maxUsage),
      usageCount: numberValue(data.currentUsage),
      priority: 0,
      createdAt: isoFromSeconds(numberValue(data.createdAt, event.created_at)),
      updatedAt: isoFromSeconds(event.created_at),
      nostrEventId: event.id,
      synced: true,
    });
    return true;
  };

  const importStockAdjustment = async (
    event: Event,
    data: Record<string, unknown>,
  ) => {
    const id = stringValue(data.id, getTagValue(event, "d") || event.id);
    await db.stockAdjustments.put({
      id,
      productId: stringValue(data.productId, ""),
      previousStock: numberValue(data.previousQuantity ?? data.previousStock),
      newStock: numberValue(data.newQuantity ?? data.newStock),
      adjustment: numberValue(data.quantityDelta ?? data.adjustment),
      reason: stringValue(data.reason, "adjustment"),
      notes: data.notes as string | undefined,
      staffId: stringValue(data.staffId ?? data.createdBy, event.pubkey),
      createdAt: numberValue(data.createdAt, event.created_at),
      nostrEventId: event.id,
      synced: true,
    });
    return true;
  };

  const importStaff = async (event: Event, data: Record<string, unknown>) => {
    const id = stringValue(data.id, getTagValue(event, "d") || event.id);
    await db.staff.put({
      id,
      name: stringValue(data.displayName ?? data.name, "Staff"),
      email: data.email as string | undefined,
      pin: data.pinHash as string | undefined,
      role: stringValue(data.role, "staff"),
      permissions: safeJson(data.customPermissions || []),
      branchId: Array.isArray(data.branchIds)
        ? (data.branchIds[0] as string | undefined)
        : undefined,
      isActive: data.status !== "inactive" && data.status !== "revoked",
      nostrPubkey: data.pubkey as string | undefined,
      avatar: data.avatar as string | undefined,
      createdAt: numberValue(data.createdAt, event.created_at),
      updatedAt: numberValue(data.updatedAt, event.created_at),
      nostrEventId: event.id,
      synced: true,
    });
    return true;
  };

  const importEvent = async (event: Event) => {
    const data = await parseEventContent<Record<string, unknown>>(event);
    if (!data) return { imported: false, skipped: true };
    if ((data as { deleted?: boolean }).deleted) return { imported: false, skipped: true };

    switch (event.kind) {
      case NOSTR_KINDS.STORE_SETTINGS:
        return { imported: await importSettings(event, data), scope: "settings" as const };
      case NOSTR_KINDS.BRANCH:
        return { imported: await importBranch(event, data), scope: "branches" as const };
      case NOSTR_KINDS.PRODUCT:
        return { imported: await importProduct(event, data), scope: "catalog" as const };
      case NOSTR_KINDS.CATEGORY:
        return { imported: await importCategory(event, data), scope: "catalog" as const };
      case NOSTR_KINDS.UNIT:
        return { imported: await importUnit(event, data), scope: "catalog" as const };
      case NOSTR_KINDS.CUSTOMER:
        return { imported: await importCustomer(event, data), scope: "customers" as const };
      case NOSTR_KINDS.ORDER:
        return { imported: await importOrder(event, data), scope: "orders" as const };
      case NOSTR_KINDS.PROMOTION:
        return { imported: await importPromotion(event, data), scope: "promotions" as const };
      case NOSTR_KINDS.STOCK_ADJUSTMENT:
        return { imported: await importStockAdjustment(event, data), scope: "inventory" as const };
      case NOSTR_KINDS.STAFF_MEMBER:
        return { imported: await importStaff(event, data), scope: "staff" as const };
      default:
        return { imported: false, skipped: true };
    }
  };

  const importCanonicalEventsForCurrentUser = async (
    options: { limit?: number } = {},
  ) => {
    const result = emptyResult();
    const auth = getAuth();
    if (!auth?.pubkey) return result;

    const kinds = [
      NOSTR_KINDS.STORE_SETTINGS,
      NOSTR_KINDS.BRANCH,
      NOSTR_KINDS.PRODUCT,
      NOSTR_KINDS.CATEGORY,
      NOSTR_KINDS.UNIT,
      NOSTR_KINDS.CUSTOMER,
      NOSTR_KINDS.ORDER,
      NOSTR_KINDS.PROMOTION,
      NOSTR_KINDS.STOCK_ADJUSTMENT,
      NOSTR_KINDS.STAFF_MEMBER,
    ];

    const [ownedEvents, staffEvents] = await Promise.all([
      relay.queryEvents({
        kinds,
        authors: [auth.pubkey],
        limit: options.limit || 1500,
      } as Parameters<typeof relay.queryEvents>[0]),
      relay.queryEvents({
        kinds: [NOSTR_KINDS.STAFF_MEMBER],
        "#p": [auth.pubkey],
        limit: 300,
      } as Parameters<typeof relay.queryEvents>[0]),
    ]);

    const uniqueEvents = [
      ...new Map(
        [...ownedEvents, ...staffEvents].map((event) => [event.id, event]),
      ).values(),
    ].sort((a, b) => a.created_at - b.created_at);
    result.queried = uniqueEvents.length;

    for (const event of uniqueEvents) {
      try {
        const eventResult = await importEvent(event);
        if (eventResult.imported && eventResult.scope) {
          result.imported += 1;
          result.byScope[eventResult.scope] += 1;
        } else {
          result.skipped += 1;
        }
      } catch {
        result.failed += 1;
      }
    }

    return result;
  };

  return {
    importCanonicalEventsForCurrentUser,
  };
};
