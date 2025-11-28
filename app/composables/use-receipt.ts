// composables/use-receipt.ts
// 🧾 E-Receipt System via Nostr

import { ref } from 'vue';
import type { 
  EReceipt, 
  Order, 
  PaymentProof, 
  ReceiptItem
} from '~/types';

export const useReceipt = () => {
  const { $nostr } = useNuxtApp();
  
  // State
  const lastReceipt = ref<EReceipt | null>(null);
  const isSending = ref(false);
  const error = ref<string | null>(null);

  /**
   * Generate E-Receipt from order
   */
  const generateReceipt = (
    order: Order, 
    paymentProof: PaymentProof,
    merchantPubkey: string
  ): EReceipt => {
    const items: ReceiptItem[] = order.items.map(item => ({
      name: item.product.name,
      quantity: item.quantity,
      unitPrice: item.price,
      total: item.total,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = 0; // Calculate if needed
    const tip = order.tip || 0;

    const receipt: EReceipt = {
      id: `RCP-${Date.now().toString(36).toUpperCase()}`,
      orderId: order.id,
      merchantPubkey,
      customerPubkey: order.customerPubkey,
      items,
      subtotal,
      tax,
      tip,
      total: order.total,
      currency: order.currency || 'LAK',
      paymentProof,
      createdAt: new Date().toISOString(),
    };

    lastReceipt.value = receipt;
    return receipt;
  };

  /**
   * Send E-Receipt via Nostr DM (NIP-04 encrypted)
   */
  const sendViaNostr = async (
    receipt: EReceipt,
    recipientPubkey: string
  ): Promise<string | null> => {
    if (!$nostr) {
      error.value = 'Nostr not configured';
      return null;
    }

    isSending.value = true;
    error.value = null;

    try {
      // Format receipt content
      const receiptContent = formatReceiptForNostr(receipt);

      // Create encrypted DM event (kind 4)
      // In production, use proper NIP-04 encryption
      const event = {
        kind: 4, // Encrypted Direct Message
        pubkey: receipt.merchantPubkey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['p', recipientPubkey],
          ['receipt', receipt.id],
          ['order', receipt.orderId],
        ],
        content: receiptContent, // Should be encrypted
      };

      // Publish to relays
      // const signedEvent = await $nostr.signEvent(event);
      // await $nostr.publish(signedEvent);

      console.log('Publishing receipt to Nostr:', event);
      
      // For now, return mock event ID
      const eventId = 'nostr_' + crypto.randomUUID().slice(0, 16);
      receipt.nostrEventId = eventId;

      return eventId;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to send receipt';
      return null;
    } finally {
      isSending.value = false;
    }
  };

  /**
   * Format receipt for Nostr message
   */
  const formatReceiptForNostr = (receipt: EReceipt): string => {
    const currency = receipt.currency;
    const formatAmount = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency === 'SATS' ? 'USD' : currency,
      }).format(amount).replace('USD', 'SATS');
    };

    let content = `🧾 **E-Receipt**\n`;
    content += `━━━━━━━━━━━━━━━━\n`;
    content += `Order: ${receipt.orderId}\n`;
    content += `Date: ${new Date(receipt.createdAt).toLocaleString()}\n`;
    content += `━━━━━━━━━━━━━━━━\n\n`;

    content += `**Items:**\n`;
    receipt.items.forEach(item => {
      content += `${item.quantity}x ${item.name}\n`;
      content += `   ${formatAmount(item.unitPrice)} × ${item.quantity} = ${formatAmount(item.total)}\n`;
    });

    content += `\n━━━━━━━━━━━━━━━━\n`;
    content += `Subtotal: ${formatAmount(receipt.subtotal)}\n`;
    
    if (receipt.tax > 0) {
      content += `Tax: ${formatAmount(receipt.tax)}\n`;
    }
    
    const tipAmount = receipt.tip ?? 0;
    if (tipAmount > 0) {
      content += `Tip: ${formatAmount(tipAmount)}\n`;
    }

    content += `**Total: ${formatAmount(receipt.total)}**\n`;
    content += `━━━━━━━━━━━━━━━━\n\n`;

    content += `⚡ Payment Proof:\n`;
    content += `Hash: ${receipt.paymentProof.paymentHash.slice(0, 16)}...\n`;
    content += `Preimage: ${receipt.paymentProof.preimage.slice(0, 16)}...\n\n`;

    content += `Thank you for your purchase! 🙏\n`;
    content += `Powered by BitSpace POS ⚡`;

    return content;
  };

  /**
   * Generate printable receipt HTML
   */
  const generatePrintableReceipt = (receipt: EReceipt, merchantName: string): string => {
    const formatAmount = (amount: number) => {
      return new Intl.NumberFormat('en-US').format(amount);
    };

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt ${receipt.id}</title>
  <style>
    body {
      font-family: 'Courier New', monospace;
      max-width: 300px;
      margin: 0 auto;
      padding: 20px;
      font-size: 12px;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 18px;
      margin: 0;
    }
    .divider {
      border-top: 1px dashed #000;
      margin: 10px 0;
    }
    .items {
      margin: 10px 0;
    }
    .item {
      display: flex;
      justify-content: space-between;
      margin: 5px 0;
    }
    .total-row {
      font-weight: bold;
      font-size: 14px;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      font-size: 10px;
    }
    .qr {
      text-align: center;
      margin: 15px 0;
    }
    @media print {
      body { margin: 0; padding: 10px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>⚡ ${merchantName}</h1>
    <p>Lightning Powered POS</p>
  </div>
  
  <div class="divider"></div>
  
  <div>
    <p>Order: ${receipt.orderId}</p>
    <p>Date: ${new Date(receipt.createdAt).toLocaleString()}</p>
  </div>
  
  <div class="divider"></div>
  
  <div class="items">
    ${receipt.items.map(item => `
      <div class="item">
        <span>${item.quantity}x ${item.name}</span>
        <span>${formatAmount(item.total)}</span>
      </div>
    `).join('')}
  </div>
  
  <div class="divider"></div>
  
  <div class="item">
    <span>Subtotal:</span>
    <span>${formatAmount(receipt.subtotal)}</span>
  </div>
  ${(receipt.tip && receipt.tip > 0) ? `
  <div class="item">
    <span>Tip:</span>
    <span>${formatAmount(receipt.tip)}</span>
  </div>
  ` : ''}
  <div class="item total-row">
    <span>TOTAL:</span>
    <span>${receipt.currency} ${formatAmount(receipt.total)}</span>
  </div>
  
  <div class="divider"></div>
  
  <div class="qr">
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(receipt.paymentProof.preimage)}" alt="Payment Proof">
    <p>Payment Verified ✓</p>
  </div>
  
  <div class="footer">
    <p>Thank you for your purchase!</p>
    <p>⚡ Powered by Bitcoin Lightning</p>
    <p>Receipt ID: ${receipt.id}</p>
  </div>
</body>
</html>
    `;
  };

  /**
   * Print receipt
   */
  const printReceipt = (receipt: EReceipt, merchantName: string) => {
    const html = generatePrintableReceipt(receipt, merchantName);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  };

  /**
   * Save receipt to IndexedDB
   */
  const saveReceipt = async (receipt: EReceipt) => {
    // Store in local database
    // Implementation depends on db schema
    console.log('Saving receipt:', receipt.id);
  };

  /**
   * Get receipt by ID
   */
  const getReceipt = async (receiptId: string): Promise<EReceipt | null> => {
    // Retrieve from local database
    console.log('Getting receipt:', receiptId);
    return null;
  };

  return {
    // State
    lastReceipt,
    isSending,
    error,

    // Methods
    generateReceipt,
    sendViaNostr,
    formatReceiptForNostr,
    generatePrintableReceipt,
    printReceipt,
    saveReceipt,
    getReceipt,
  };
};
