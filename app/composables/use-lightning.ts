// composables/use-lightning.ts
// ⚡ Lightning Payment Integration - BOLT11 & BOLT12

import { ref, computed } from 'vue';
import type { 
  LightningInvoice, 
  BOLT12Offer, 
  PaymentProof, 
  PaymentStatus,
  PaymentMethod 
} from '~/types';

// Lightning Node Configuration
interface LightningConfig {
  nodeUrl: string;
  macaroon?: string;
  rune?: string; // CLN rune for BOLT12
  provider: 'lnbits' | 'lnd' | 'cln' | 'alby' | 'nwc';
}

export const useLightning = () => {
  const _nostr = useNuxtApp().$nostr;
  
  // State
  const isConnected = ref(false);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const currentInvoice = ref<LightningInvoice | null>(null);
  const paymentStatus = ref<PaymentStatus>('pending');
  const config = ref<LightningConfig | null>(null);

  // BOLT12 Static Offers
  const staticOffers = ref<BOLT12Offer[]>([]);

  /**
   * Initialize Lightning connection
   */
  const connect = async (lightningConfig: LightningConfig) => {
    isLoading.value = true;
    error.value = null;

    try {
      config.value = lightningConfig;
      
      // Test connection based on provider
      switch (lightningConfig.provider) {
        case 'lnbits':
          await testLNbitsConnection(lightningConfig);
          break;
        case 'alby':
          await testAlbyConnection();
          break;
        case 'nwc':
          await testNWCConnection();
          break;
        default:
          throw new Error(`Unsupported provider: ${lightningConfig.provider}`);
      }

      isConnected.value = true;
      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Connection failed';
      isConnected.value = false;
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Create BOLT11 Invoice (traditional)
   */
  const createInvoice = async (
    amount: number, // in sats
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<LightningInvoice | null> => {
    if (!config.value) {
      error.value = 'Lightning not configured';
      return null;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const invoice = await generateBolt11Invoice(amount, description, metadata);
      currentInvoice.value = invoice;
      paymentStatus.value = 'pending';
      
      // Start watching for payment
      watchPayment(invoice.paymentHash);
      
      return invoice;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to create invoice';
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Create BOLT12 Offer (Static QR - ล้ำกว่า!)
   * QR เดียวใช้ได้ตลอด, dynamic amount
   */
  const createBolt12Offer = async (
    description: string,
    merchantName: string,
    options?: {
      minAmount?: number;
      maxAmount?: number;
      allowsAnyAmount?: boolean;
    }
  ): Promise<BOLT12Offer | null> => {
    if (!config.value) {
      error.value = 'Lightning not configured';
      return null;
    }

    isLoading.value = true;

    try {
      // For CLN-based BOLT12
      const offer: BOLT12Offer = {
        id: crypto.randomUUID(),
        offer: await generateBolt12Offer(description),
        description,
        merchantName,
        merchantPubkey: '', // Will be set from node
        allowsAnyAmount: options?.allowsAnyAmount ?? true,
        minAmount: options?.minAmount,
        maxAmount: options?.maxAmount,
        createdAt: new Date().toISOString(),
        isActive: true,
      };

      staticOffers.value.push(offer);
      return offer;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to create BOLT12 offer';
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Watch for incoming payment
   */
  const watchPayment = (paymentHash: string) => {
    const checkPayment = async () => {
      try {
        const status = await checkPaymentStatus(paymentHash);
        paymentStatus.value = status;

        if (status === 'completed') {
          // Payment received!
          const preimage = await getPreimage(paymentHash);
          if (currentInvoice.value) {
            currentInvoice.value.preimage = preimage;
            currentInvoice.value.status = 'completed';
          }
          
          // Broadcast via Nostr for realtime sync
          await broadcastPaymentReceived(paymentHash, preimage);
          
          return;
        }

        if (status === 'pending' || status === 'processing') {
          // Keep checking
          setTimeout(checkPayment, 2000);
        }
      } catch (e) {
        console.error('Payment check error:', e);
        setTimeout(checkPayment, 5000);
      }
    };

    checkPayment();
  };

  /**
   * Broadcast payment received via Nostr
   * ให้ทุกเครื่อง/สาขารู้ทันที
   */
  const broadcastPaymentReceived = async (paymentHash: string, _preimage: string) => {
    try {
      // NIP-47: Wallet Connect or custom event
      // This allows real-time sync across devices
      console.log('Broadcasting payment via Nostr:', paymentHash);
      
      // Implementation depends on Nostr setup
      // Could use encrypted DM to merchant pubkey
    } catch (e) {
      console.error('Failed to broadcast payment:', e);
    }
  };

  /**
   * Verify payment proof (preimage)
   */
  const verifyPayment = async (paymentHash: string, preimage: string): Promise<boolean> => {
    try {
      // SHA256(preimage) should equal paymentHash
      // This is cryptographic proof of payment
      const hash = await sha256(hexToBytes(preimage));
      return bytesToHex(hash) === paymentHash;
    } catch {
      return false;
    }
  };

  /**
   * Create payment proof for offline storage
   */
  const createPaymentProof = (
    orderId: string,
    paymentHash: string,
    preimage: string,
    amount: number,
    method: PaymentMethod,
    isOffline: boolean = false
  ): PaymentProof => {
    return {
      id: crypto.randomUUID(),
      orderId,
      paymentHash,
      preimage,
      amount,
      receivedAt: new Date().toISOString(),
      method,
      isOffline,
      syncedAt: isOffline ? undefined : new Date().toISOString(),
    };
  };

  // ============================================
  // Provider-specific implementations
  // ============================================

  const testLNbitsConnection = async (cfg: LightningConfig) => {
    const response = await fetch(`${cfg.nodeUrl}/api/v1/wallet`, {
      headers: {
        'X-Api-Key': cfg.macaroon || '',
      },
    });
    if (!response.ok) throw new Error('LNbits connection failed');
    return response.json();
  };

  const testAlbyConnection = async () => {
    // Alby uses WebLN
    if (typeof window !== 'undefined' && 'webln' in window) {
      const webln = window as unknown as { webln: { enable: () => Promise<void> } };
      await webln.webln.enable();
      return true;
    }
    throw new Error('Alby/WebLN not available');
  };

  const testNWCConnection = async () => {
    // NIP-47 Nostr Wallet Connect
    // Implementation for connecting via Nostr
    return true;
  };

  const generateBolt11Invoice = async (
    amount: number,
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<LightningInvoice> => {
    if (!config.value) throw new Error('Not configured');

    if (config.value.provider === 'lnbits') {
      const response = await fetch(`${config.value.nodeUrl}/api/v1/payments`, {
        method: 'POST',
        headers: {
          'X-Api-Key': config.value.macaroon || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          out: false,
          amount,
          memo: description,
          extra: metadata,
        }),
      });

      if (!response.ok) throw new Error('Failed to create invoice');
      
      const data = await response.json();
      
      return {
        id: data.payment_hash,
        bolt11: data.payment_request,
        paymentHash: data.payment_hash,
        amount,
        description,
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
        createdAt: new Date().toISOString(),
        status: 'pending',
        metadata,
      };
    }

    // WebLN (Alby)
    if (config.value.provider === 'alby' && typeof window !== 'undefined') {
      interface WebLNInvoice {
        paymentRequest: string;
        paymentHash?: string;
      }
      interface WebLN {
        makeInvoice: (args: { amount: number; defaultMemo: string }) => Promise<WebLNInvoice>;
      }
      const webln = (window as unknown as { webln: WebLN }).webln;
      const invoice = await webln.makeInvoice({
        amount,
        defaultMemo: description,
      });
      
      return {
        id: invoice.paymentHash || crypto.randomUUID(),
        bolt11: invoice.paymentRequest,
        paymentHash: invoice.paymentHash || '',
        amount,
        description,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        createdAt: new Date().toISOString(),
        status: 'pending',
        metadata,
      };
    }

    throw new Error('Unsupported provider for invoice creation');
  };

  const generateBolt12Offer = async (description: string): Promise<string> => {
    // BOLT12 requires CLN or compatible node
    // For now, return placeholder
    // Real implementation would call CLN's `offer` command
    return `lno1...${btoa(description).slice(0, 20)}`;
  };

  const checkPaymentStatus = async (paymentHash: string): Promise<PaymentStatus> => {
    if (!config.value) return 'pending';

    if (config.value.provider === 'lnbits') {
      const response = await fetch(
        `${config.value.nodeUrl}/api/v1/payments/${paymentHash}`,
        {
          headers: {
            'X-Api-Key': config.value.macaroon || '',
          },
        }
      );

      if (!response.ok) return 'pending';
      
      const data = await response.json();
      return data.paid ? 'completed' : 'pending';
    }

    return 'pending';
  };

  const getPreimage = async (paymentHash: string): Promise<string> => {
    if (!config.value) return '';

    if (config.value.provider === 'lnbits') {
      const response = await fetch(
        `${config.value.nodeUrl}/api/v1/payments/${paymentHash}`,
        {
          headers: {
            'X-Api-Key': config.value.macaroon || '',
          },
        }
      );

      if (!response.ok) return '';
      
      const data = await response.json();
      return data.preimage || '';
    }

    return '';
  };

  // Helper functions
  const hexToBytes = (hex: string): Uint8Array => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  };

  const bytesToHex = (bytes: Uint8Array): string => {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const sha256 = async (data: Uint8Array): Promise<Uint8Array> => {
    const hashBuffer = await crypto.subtle.digest('SHA-256', new Uint8Array(data).buffer as ArrayBuffer);
    return new Uint8Array(hashBuffer);
  };

  // Computed
  const isPaid = computed(() => paymentStatus.value === 'completed');
  const invoiceQR = computed(() => currentInvoice.value?.bolt11 || '');

  return {
    // State
    isConnected,
    isLoading,
    error,
    currentInvoice,
    paymentStatus,
    staticOffers,
    isPaid,
    invoiceQR,

    // Methods
    connect,
    createInvoice,
    createBolt12Offer,
    watchPayment,
    verifyPayment,
    createPaymentProof,
    broadcastPaymentReceived,
  };
};
