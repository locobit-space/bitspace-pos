// composables/use-receipt-generator.ts
// 🧾 Unified Receipt Generator for POS & Customer Orders
// Creates both private order events (encrypted) and public receipts (for customers)

import type { Order, PaymentMethod, PaymentProof } from "~/types";
import type { EReceipt } from "./use-receipt";
import { EntityId } from "~/utils/id";
import { NOSTR_KINDS } from "~/types/nostr-kinds";

export const useReceiptGenerator = () => {
  const nostrData = useNostrData();
  const relay = useNostrRelay();
  const auth = useAuth();
  const shop = useShop();
  const receiptComposable = useReceipt();
  const receiptSettings = useReceiptSettings();
  const nostrStorage = useNostrStorage();

  /**
   * Get user's Nostr pubkey from auth or localStorage
   */
  const getUserPubkey = (): string | undefined => {
    // First check auth.user (for Hasura users with linked Nostr)
    if (auth.user.value?.nostrPubkey) {
      return auth.user.value.nostrPubkey;
    }

    // Then check localStorage (for users with nsec stored)
    if (import.meta.client) {
      const { userInfo } = nostrStorage.loadCurrentUser();
      if (userInfo?.pubkey) {
        return userInfo.pubkey;
      }

      // Also check nostr-pubkey cookie
      const nostrCookie = useCookie("nostr-pubkey");
      if (nostrCookie.value) {
        return nostrCookie.value;
      }
    }

    return undefined;
  };

  /**
   * Generate public receipt from order
   * Works for both POS sales and customer orders
   * Creates: Private order event (encrypted) + Public receipt event (customer-facing)
   */
  const createReceiptFromOrder = async (
    order: Order,
    payment?: {
      method: PaymentMethod;
      proof?: PaymentProof;
      paidAt: string;
    }
  ): Promise<{
    receipt: EReceipt;
    url: string;
    qrCode: string;
  }> => {
    // 1. Generate receipt ID and verification code
    const { id: receiptId, code: receiptCode } = EntityId.generic("REC");

    // 2. Create public receipt (customer-facing, minimal data)
    const publicReceipt: EReceipt = {
      id: receiptId,
      code: receiptCode,
      orderId: order.id,
      orderCode: order.code || order.id,
      orderNumber: order.orderNumber,
      merchantName:
        shop.shopConfig?.value?.shopName ||
        receiptSettings.settings?.value?.header?.businessName ||
        "bnos.space",
      merchantAddress:
        shop.shopConfig?.value?.address ||
        receiptSettings.settings?.value?.header?.address ||
        undefined,
      merchantPubkey: getUserPubkey() || undefined,

      // Items (no sensitive data)
      items: order.items.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: item.price,
        total: item.total,
        variant: item.selectedVariant?.name,
        modifiers: item.selectedModifiers?.map((m) => m.name),
        notes: item.notes,
      })),

      // Financial summary
      subtotal: order.total - (order.tax || 0) - (order.tip || 0),
      discount: order.discount || 0,
      tax: order.tax || 0,
      tip: order.tip,
      total: order.total,
      totalSats: order.totalSats,
      currency: order.currency,

      // Payment info (truncated for privacy)
      paymentMethod: payment?.method || order.paymentMethod || "cash",
      paymentProof: payment?.proof
        ? {
            ...payment.proof,
            paymentHash: payment.proof.paymentHash?.slice(0, 16), // Truncate for privacy
          }
        : undefined,

      // Timestamps
      createdAt: new Date().toISOString(),
      expiresAt: new Date(
        Date.now() + 90 * 24 * 60 * 60 * 1000
      ).toISOString(), // 90 days
    };

    // 3. Save receipt locally (for offline access)
    receiptComposable.storeEBill(publicReceipt);

    // 4. Publish public receipt to Nostr (NOT encrypted)
    const userPubkey = getUserPubkey();

    if (userPubkey) {
      try {
        // Ensure relay is initialized
        if (!relay.isInitialized?.value) {
          await relay.init();
        }

        const tags = [
          ["d", receiptCode], // Unique identifier
          ["t", "receipt"],
          ["t", "public"],
          ["order", order.code || order.id],
          ["amount", order.total.toString()],
          ["currency", order.currency],
          [
            "expiration",
            Math.floor(Date.now() / 1000 + 90 * 24 * 60 * 60).toString(),
          ],
        ];

        const content = JSON.stringify(publicReceipt); // Plain JSON, NOT encrypted

        // Create and sign the event
        const signedEvent = await nostrData.createEvent(
          NOSTR_KINDS.RECEIPT,
          content,
          tags
        );

        if (signedEvent) {
          // Publish to relays
          const published = await relay.publishEvent(signedEvent);
          if (published) {
            publicReceipt.nostrEventId = signedEvent.id;
          }
        }
      } catch (error) {
        console.warn(
          "[ReceiptGenerator] Failed to publish to Nostr (receipt still saved locally):",
          error
        );
      }
    }

    // 5. Generate receipt URL with verification code
    const baseUrl =
      typeof window !== "undefined" ? window.location.origin : "";
    const receiptUrl = `${baseUrl}/receipt/${receiptId}?code=${receiptCode}`;

    // 6. Generate QR code
    const QRCode = await import("qrcode");
    const qrCode = await QRCode.toDataURL(receiptUrl, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: "M",
    });

    return {
      receipt: publicReceipt,
      url: receiptUrl,
      qrCode,
    };
  };

  /**
   * Fetch public receipt from Nostr by code
   * Used by receipt page to load receipts
   */
  const fetchReceiptByCode = async (
    code: string
  ): Promise<EReceipt | null> => {
    if (!relay.isInitialized?.value) {
      return null;
    }

    try {
      // Query events using relay
      const events = await relay.queryEvents({
        kinds: [NOSTR_KINDS.RECEIPT],
        "#d": [code], // Find by receipt code
        limit: 1,
      });

      if (events.length > 0 && events[0]) {
        const receipt = JSON.parse(events[0].content) as EReceipt;
        receipt.nostrEventId = events[0].id;

        // Save to local storage for future access
        receiptComposable.storeEBill(receipt);

        return receipt;
      }
    } catch (error) {
      console.error("[ReceiptGenerator] Failed to fetch receipt:", error);
    }

    return null;
  };

  /**
   * Fetch public receipt from Nostr by ID
   * Fallback method if code is not available
   */
  const fetchReceiptById = async (id: string): Promise<EReceipt | null> => {
    // Try localStorage first
    const cached = receiptComposable.retrieveEBill(id);
    if (cached) return cached;

    // If not found locally, would need to search Nostr
    // This is less efficient without the code, so we rely on code-based lookup
    console.warn(
      "[ReceiptGenerator] Receipt not found locally, use code for Nostr lookup"
    );
    return null;
  };

  return {
    createReceiptFromOrder,
    fetchReceiptByCode,
    fetchReceiptById,
  };
};
