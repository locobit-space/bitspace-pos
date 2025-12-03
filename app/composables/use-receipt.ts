// composables/use-receipt.ts
// 🧾 Receipt & E-Bill System
// Supports: Thermal/POS printers (ESC/POS), Browser print, E-Bill via QR

import { ref } from 'vue';
import type { 
  Order, 
  PaymentProof, 
  CurrencyCode,
  PaymentMethod,
} from '~/types';

// ============================================
// Receipt Types
// ============================================
export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  variant?: string;
  modifiers?: string[];
  notes?: string;
}

export interface EReceipt {
  id: string;
  orderId: string;
  merchantPubkey?: string;
  customerPubkey?: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  tip?: number;
  total: number;
  totalSats?: number;
  currency: CurrencyCode;
  paymentMethod?: PaymentMethod;
  paymentProof?: PaymentProof;
  createdAt: string;
  merchantName?: string;
  merchantAddress?: string;
  nostrEventId?: string;
}

// ============================================
// Receipt Settings
// ============================================
export interface ReceiptSettings {
  merchantName: string;
  merchantAddress?: string;
  merchantPhone?: string;
  merchantTaxId?: string;
  logoEmoji: string;
  footerMessage: string;
  showPaymentProof: boolean;
  showQrCode: boolean;
  paperWidth: '58mm' | '80mm';
}

const defaultSettings: ReceiptSettings = {
  merchantName: 'Berkeley Café',
  merchantAddress: 'Vientiane, Laos',
  merchantPhone: '+856 20 1234 5678',
  logoEmoji: '☕',
  footerMessage: 'Thank you for your visit!',
  showPaymentProof: true,
  showQrCode: true,
  paperWidth: '80mm',
};

// E-Bill storage (in-memory for demo, use IndexedDB in production)
const eBillStorage = new Map<string, EReceipt>();

export const useReceipt = () => {
  const currency = useCurrency();
  
  // State
  const lastReceipt = ref<EReceipt | null>(null);
  const isSending = ref(false);
  const isPrinting = ref(false);
  const error = ref<string | null>(null);
  const settings = ref<ReceiptSettings>({ ...defaultSettings });

  // ============================================
  // Generate Receipt from Order
  // ============================================
  const generateReceipt = (
    order: Order, 
    paymentProof?: PaymentProof,
    merchantPubkey?: string
  ): EReceipt => {
    const items: ReceiptItem[] = order.items.map(item => ({
      name: item.product.name,
      quantity: item.quantity,
      unitPrice: item.price,
      total: item.total,
      variant: item.selectedVariant?.name,
      modifiers: item.selectedModifiers?.map(m => m.name),
      notes: item.notes,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = 0;
    const tip = order.tip || 0;

    // Generate unique receipt ID
    const receiptId = `RCP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const receipt: EReceipt = {
      id: receiptId,
      orderId: order.id,
      merchantPubkey: merchantPubkey || '',
      customerPubkey: order.customerPubkey,
      items,
      subtotal,
      tax,
      tip,
      total: order.total,
      totalSats: order.totalSats,
      currency: order.currency || 'LAK',
      paymentMethod: order.paymentMethod,
      paymentProof: paymentProof || {
        id: `proof_${Date.now()}`,
        orderId: order.id,
        paymentHash: '',
        preimage: '',
        amount: order.totalSats || 0,
        receivedAt: new Date().toISOString(),
        method: order.paymentMethod || 'cash',
        isOffline: false,
      },
      createdAt: new Date().toISOString(),
      merchantName: settings.value.merchantName,
      merchantAddress: settings.value.merchantAddress,
    };

    lastReceipt.value = receipt;
    
    // Store for e-bill access
    eBillStorage.set(receiptId, receipt);
    
    return receipt;
  };

  // ============================================
  // Format Currency
  // ============================================
  const formatAmount = (amount: number, currencyCode: CurrencyCode = 'LAK'): string => {
    return currency.format(amount, currencyCode);
  };

  // ============================================
  // Generate E-Bill URL
  // ============================================
  const generateEBillUrl = (receiptId: string): string => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/receipt/${receiptId}`;
  };

  const generateEBillQrData = (receiptId: string): string => {
    return generateEBillUrl(receiptId);
  };

  // ============================================
  // Get E-Bill by ID (for public page)
  // ============================================
  const getEBill = (receiptId: string): EReceipt | null => {
    return eBillStorage.get(receiptId) || null;
  };

  // Store E-Bill (for sharing between pages)
  const storeEBill = (receipt: EReceipt): void => {
    eBillStorage.set(receipt.id, receipt);
    // Also store in sessionStorage for page refresh
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(`ebill_${receipt.id}`, JSON.stringify(receipt));
      } catch {
        // Storage full or unavailable
      }
    }
  };

  // Retrieve E-Bill from storage
  const retrieveEBill = (receiptId: string): EReceipt | null => {
    // Try memory first
    const memReceipt = eBillStorage.get(receiptId);
    if (memReceipt) return memReceipt;

    // Try sessionStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(`ebill_${receiptId}`);
        if (stored) {
          const receipt = JSON.parse(stored) as EReceipt;
          eBillStorage.set(receiptId, receipt);
          return receipt;
        }
      } catch {
        // Parse error
      }
    }

    return null;
  };

  // ============================================
  // Payment Method Label Helper
  // ============================================
  const getPaymentMethodLabel = (method?: PaymentMethod | string): string => {
    const labels: Record<string, string> = {
      lightning: '⚡ Lightning',
      bolt12: '⚡ BOLT12',
      lnurl: '⚡ LNURL',
      cash: '💵 Cash',
      bank_transfer: '🏦 Bank Transfer',
      external: '📱 External',
      qr_static: '📱 QR Code',
    };
    return labels[method || ''] || method || 'Other';
  };

  // ============================================
  // Generate HTML Receipt for Browser Print
  // ============================================
  const generateHtmlReceipt = (receipt: EReceipt): string => {
    const paperWidth = settings.value.paperWidth === '58mm' ? '58mm' : '80mm';
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt ${receipt.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    @page {
      size: ${paperWidth} auto;
      margin: 0;
    }
    
    body {
      font-family: 'Courier New', 'Monaco', monospace;
      width: ${paperWidth};
      max-width: ${paperWidth};
      margin: 0 auto;
      padding: 8px;
      font-size: 11px;
      line-height: 1.4;
      background: white;
      color: #000;
    }
    
    .header {
      text-align: center;
      padding-bottom: 8px;
      border-bottom: 1px dashed #000;
      margin-bottom: 8px;
    }
    
    .logo { font-size: 28px; margin-bottom: 4px; }
    .merchant-name { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
    .merchant-info { font-size: 10px; color: #333; }
    
    .order-info {
      padding: 8px 0;
      border-bottom: 1px dashed #000;
      font-size: 10px;
    }
    
    .items { padding: 8px 0; }
    .item { margin-bottom: 8px; }
    .item-line { display: flex; justify-content: space-between; align-items: flex-start; }
    .item-name { flex: 1; font-weight: 500; }
    .item-price { text-align: right; white-space: nowrap; }
    .item-details { font-size: 9px; color: #666; padding-left: 12px; }
    .item-notes { font-size: 9px; color: #0066cc; font-style: italic; padding-left: 12px; }
    
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    
    .totals { padding: 8px 0; }
    .total-line { display: flex; justify-content: space-between; margin-bottom: 4px; }
    
    .grand-total {
      font-size: 14px;
      font-weight: bold;
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
      padding: 6px 0;
      margin: 8px 0;
    }
    
    .sats-total { color: #f59e0b; font-size: 12px; }
    .payment-method { text-align: center; padding: 8px 0; font-size: 11px; }
    
    .payment-verified {
      text-align: center;
      padding: 8px;
      background: #f0f0f0;
      border-radius: 4px;
      margin: 8px 0;
    }
    
    .qr-section { text-align: center; padding: 12px 0; }
    .qr-section img { width: 100px; height: 100px; }
    .qr-label { font-size: 10px; color: #666; margin-top: 4px; }
    
    .footer {
      text-align: center;
      padding-top: 12px;
      border-top: 1px dashed #000;
      font-size: 10px;
      color: #666;
    }
    
    .footer-message { font-size: 12px; color: #000; margin-bottom: 4px; }
    
    @media print {
      body { width: ${paperWidth}; padding: 4px; }
      .no-print { display: none !important; }
    }
    
    @media screen {
      body {
        padding: 20px;
        max-width: 320px;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
        margin: 20px auto;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">${settings.value.logoEmoji}</div>
    <div class="merchant-name">${settings.value.merchantName}</div>
    ${settings.value.merchantAddress ? `<div class="merchant-info">${settings.value.merchantAddress}</div>` : ''}
    ${settings.value.merchantPhone ? `<div class="merchant-info">${settings.value.merchantPhone}</div>` : ''}
  </div>
  
  <div class="order-info">
    <div>Order: <strong>${receipt.orderId}</strong></div>
    <div>Date: ${new Date(receipt.createdAt).toLocaleString()}</div>
    <div>Receipt: ${receipt.id}</div>
  </div>
  
  <div class="items">
    ${receipt.items.map(item => `
      <div class="item">
        <div class="item-line">
          <span class="item-name">${item.quantity}× ${item.name}</span>
          <span class="item-price">${formatAmount(item.total, receipt.currency)}</span>
        </div>
        ${item.variant ? `<div class="item-details">└ ${item.variant}</div>` : ''}
        ${item.modifiers?.length ? `<div class="item-details">+ ${item.modifiers.join(', ')}</div>` : ''}
        ${item.notes ? `<div class="item-notes">📝 "${item.notes}"</div>` : ''}
      </div>
    `).join('')}
  </div>
  
  <div class="divider"></div>
  
  <div class="totals">
    <div class="total-line">
      <span>Subtotal</span>
      <span>${formatAmount(receipt.subtotal, receipt.currency)}</span>
    </div>
    ${receipt.tax > 0 ? `
      <div class="total-line">
        <span>Tax</span>
        <span>${formatAmount(receipt.tax, receipt.currency)}</span>
      </div>
    ` : ''}
    ${receipt.tip && receipt.tip > 0 ? `
      <div class="total-line">
        <span>Tip</span>
        <span>${formatAmount(receipt.tip, receipt.currency)}</span>
      </div>
    ` : ''}
  </div>
  
  <div class="grand-total">
    <div class="total-line">
      <span>TOTAL</span>
      <span>${formatAmount(receipt.total, receipt.currency)}</span>
    </div>
    ${receipt.totalSats ? `
      <div class="total-line sats-total">
        <span>≈ Sats</span>
        <span>⚡ ${receipt.totalSats.toLocaleString()}</span>
      </div>
    ` : ''}
  </div>
  
  <div class="payment-method">
    Paid via: ${getPaymentMethodLabel(receipt.paymentMethod)}
  </div>
  
  ${receipt.paymentProof?.preimage && settings.value.showPaymentProof ? `
    <div class="payment-verified">
      ⚡ Payment Verified<br>
      <small>Hash: ${receipt.paymentProof.paymentHash?.slice(0, 20) || 'N/A'}...</small>
    </div>
  ` : ''}
  
  ${settings.value.showQrCode ? `
    <div class="qr-section">
      <div class="qr-label">📱 E-Bill</div>
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(generateEBillUrl(receipt.id))}" alt="E-Bill QR">
      <div class="qr-label">Scan for digital receipt</div>
    </div>
  ` : ''}
  
  <div class="footer">
    <div class="footer-message">${settings.value.footerMessage}</div>
    <div>Powered by BitSpace POS ⚡</div>
  </div>
</body>
</html>`;
  };

  // ============================================
  // Print Receipt (Browser)
  // ============================================
  const printReceipt = (receipt: EReceipt): void => {
    isPrinting.value = true;
    
    const html = generateHtmlReceipt(receipt);
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      
      // Wait for images to load then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          isPrinting.value = false;
        }, 500);
      };
    } else {
      error.value = 'Could not open print window. Please allow popups.';
      isPrinting.value = false;
    }
  };

  // ============================================
  // Generate Thermal Printer Receipt (ESC/POS text)
  // ============================================
  const generateThermalReceipt = (receipt: EReceipt): string => {
    const width = settings.value.paperWidth === '58mm' ? 32 : 48;
    const divider = '─'.repeat(width);
    const doubleDivider = '═'.repeat(width);
    
    const center = (text: string) => {
      const padding = Math.max(0, Math.floor((width - text.length) / 2));
      return ' '.repeat(padding) + text;
    };

    const rightAlign = (left: string, right: string) => {
      const space = Math.max(1, width - left.length - right.length);
      return left + ' '.repeat(space) + right;
    };

    const lines: string[] = [];

    // Header
    lines.push('');
    lines.push(center(settings.value.logoEmoji + ' ' + settings.value.merchantName));
    if (settings.value.merchantAddress) {
      lines.push(center(settings.value.merchantAddress));
    }
    if (settings.value.merchantPhone) {
      lines.push(center(settings.value.merchantPhone));
    }
    lines.push('');
    lines.push(doubleDivider);

    // Order Info
    lines.push(`Order: ${receipt.orderId}`);
    lines.push(`Date: ${new Date(receipt.createdAt).toLocaleString()}`);
    lines.push(`Receipt: ${receipt.id}`);
    lines.push(divider);

    // Items
    receipt.items.forEach(item => {
      const itemTotal = formatAmount(item.total, receipt.currency);
      lines.push(`${item.quantity}x ${item.name}`);
      if (item.variant) lines.push(`   └ ${item.variant}`);
      if (item.modifiers?.length) lines.push(`   + ${item.modifiers.join(', ')}`);
      if (item.notes) lines.push(`   📝 ${item.notes}`);
      lines.push(rightAlign('', itemTotal));
    });

    lines.push(divider);

    // Totals
    lines.push(rightAlign('Subtotal:', formatAmount(receipt.subtotal, receipt.currency)));
    if (receipt.tax > 0) {
      lines.push(rightAlign('Tax:', formatAmount(receipt.tax, receipt.currency)));
    }
    if (receipt.tip && receipt.tip > 0) {
      lines.push(rightAlign('Tip:', formatAmount(receipt.tip, receipt.currency)));
    }

    lines.push(doubleDivider);
    lines.push(rightAlign('TOTAL:', formatAmount(receipt.total, receipt.currency)));
    
    if (receipt.totalSats && receipt.totalSats > 0) {
      lines.push(rightAlign('≈ Sats:', `⚡ ${receipt.totalSats.toLocaleString()}`));
    }
    lines.push(doubleDivider);

    // Payment Method
    lines.push(center(`Paid via: ${getPaymentMethodLabel(receipt.paymentMethod)}`));
    lines.push('');

    // Footer
    lines.push(divider);
    lines.push(center(settings.value.footerMessage));
    lines.push(center('Powered by BitSpace POS ⚡'));
    lines.push('');
    lines.push('');

    return lines.join('\n');
  };

  // ============================================
  // Print to Thermal Printer (via WebUSB/Serial)
  // ============================================
  const printToThermalPrinter = async (receipt: EReceipt): Promise<boolean> => {
    isPrinting.value = true;
    error.value = null;

    try {
      // Check for Web Serial API support
      if (!('serial' in navigator)) {
        console.log('Web Serial not supported, using browser print');
        printReceipt(receipt);
        return true;
      }

      // @ts-expect-error - Web Serial API
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });

      const writer = port.writable?.getWriter();
      if (!writer) throw new Error('Could not get writer');

      const encoder = new TextEncoder();
      const text = generateThermalReceipt(receipt);
      
      // ESC/POS Commands
      const ESC = 0x1B;
      const GS = 0x1D;
      
      // Initialize printer
      await writer.write(new Uint8Array([ESC, 0x40]));
      await writer.write(new Uint8Array([ESC, 0x74, 0x10])); // UTF-8
      await writer.write(encoder.encode(text));
      await writer.write(new Uint8Array([GS, 0x56, 0x00])); // Cut paper
      
      writer.releaseLock();
      await port.close();
      
      return true;
    } catch (e) {
      console.error('Thermal print error:', e);
      printReceipt(receipt);
      return true;
    } finally {
      isPrinting.value = false;
    }
  };

  // ============================================
  // Update Settings
  // ============================================
  const updateSettings = (newSettings: Partial<ReceiptSettings>) => {
    settings.value = { ...settings.value, ...newSettings };
  };

  return {
    // State
    lastReceipt,
    isSending,
    isPrinting,
    error,
    settings,

    // Methods
    generateReceipt,
    generateEBillUrl,
    generateEBillQrData,
    getEBill,
    storeEBill,
    retrieveEBill,
    generateThermalReceipt,
    generateHtmlReceipt,
    printReceipt,
    printToThermalPrinter,
    updateSettings,
    formatAmount,
    getPaymentMethodLabel,
  };
};
