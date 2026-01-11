/**
 * 🧾 Public Receipt Viewer
 * Pure JavaScript - Fetches and decrypts receipts from Nostr
 */

// ============================================
// Configuration
// ============================================
const CONFIG = {
    relays: [
        'wss://relay.bnos.space',
        'wss://relay.damus.io',
        'wss://nos.lol',
        'wss://relay.nostr.band',
        'wss://nostr.wine'
        'wss://nostr-01.yakihonne.com',
        'wss://yabu.me'
    ],
    receiptKind: 30078, // NOSTR_KINDS.RECEIPT
    timeout: 15000,
    pbkdf2Iterations: 100000
};

// ============================================
// DOM Elements
// ============================================
const elements = {
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    receipt: document.getElementById('receipt'),
    errorMessage: document.getElementById('error-message'),
    merchantLogo: document.getElementById('merchant-logo'),
    merchantName: document.getElementById('merchant-name'),
    merchantAddress: document.getElementById('merchant-address'),
    receiptDate: document.getElementById('receipt-date'),
    receiptCode: document.getElementById('receipt-code'),
    orderCode: document.getElementById('order-code'),
    itemsCount: document.getElementById('items-count'),
    itemsList: document.getElementById('items-list'),
    subtotal: document.getElementById('subtotal'),
    discountRow: document.getElementById('discount-row'),
    discount: document.getElementById('discount'),
    taxRow: document.getElementById('tax-row'),
    tax: document.getElementById('tax'),
    tipRow: document.getElementById('tip-row'),
    tip: document.getElementById('tip'),
    total: document.getElementById('total'),
    satsRow: document.getElementById('sats-row'),
    totalSats: document.getElementById('total-sats'),
    paymentMethod: document.getElementById('payment-method'),
    paymentHash: document.getElementById('payment-hash'),
    qrCode: document.getElementById('qr-code'),
    qrCodeText: document.getElementById('qr-code-text'),
    footerMessage: document.getElementById('footer-message'),
    shareBtn: document.getElementById('share-btn')
};

// ============================================
// Utility Functions
// ============================================

function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

async function deriveKeyFromCode(code, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(code),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: CONFIG.pbkdf2Iterations,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
    );
}

async function decryptReceipt(encrypted, code) {
    try {
        const salt = base64ToArrayBuffer(encrypted.salt);
        const iv = base64ToArrayBuffer(encrypted.iv);
        const ciphertext = base64ToArrayBuffer(encrypted.ciphertext);

        const key = await deriveKeyFromCode(code, salt);

        const plaintext = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            ciphertext
        );

        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(plaintext));
    } catch (err) {
        console.error('Decryption failed:', err);
        return null;
    }
}

function formatCurrency(amount, currencyCode = 'LAK') {
    const currencies = {
        LAK: { symbol: '₭', decimals: 0, position: 'after' },
        THB: { symbol: '฿', decimals: 2, position: 'before' },
        USD: { symbol: '$', decimals: 2, position: 'before' },
        EUR: { symbol: '€', decimals: 2, position: 'after' },
        GBP: { symbol: '£', decimals: 2, position: 'before' },
        JPY: { symbol: '¥', decimals: 0, position: 'before' },
        CNY: { symbol: '¥', decimals: 2, position: 'before' },
        KRW: { symbol: '₩', decimals: 0, position: 'before' },
        VND: { symbol: '₫', decimals: 0, position: 'after' },
        MYR: { symbol: 'RM', decimals: 2, position: 'before' },
        SGD: { symbol: 'S$', decimals: 2, position: 'before' },
        IDR: { symbol: 'Rp', decimals: 0, position: 'before' },
        PHP: { symbol: '₱', decimals: 2, position: 'before' },
        MMK: { symbol: 'K', decimals: 0, position: 'after' },
        KHR: { symbol: '៛', decimals: 0, position: 'after' },
        BTC: { symbol: '₿', decimals: 8, position: 'before' }
    };

    const config = currencies[currencyCode] || { symbol: currencyCode, decimals: 2, position: 'before' };
    const formatted = amount.toLocaleString(undefined, {
        minimumFractionDigits: config.decimals,
        maximumFractionDigits: config.decimals
    });

    return config.position === 'before'
        ? `${config.symbol}${formatted}`
        : `${formatted} ${config.symbol}`;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const dateFormatted = date.toLocaleDateString('en-US', options);
    const timeFormatted = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return `📅 ${dateFormatted} • ${timeFormatted}`;
}

function getPaymentMethodLabel(method) {
    const labels = {
        cash: '💵 Cash',
        card: '💳 Card',
        lightning: '⚡ Lightning',
        bitcoin: '₿ Bitcoin',
        usdt: '💲 USDT',
        qr: '📱 QR Payment',
        transfer: '🏦 Bank Transfer',
        credit: '🌟 Store Credit'
    };
    return labels[method] || method;
}

function showState(state) {
    elements.loading.classList.add('hidden');
    elements.error.classList.add('hidden');
    elements.receipt.classList.add('hidden');

    if (state === 'loading') elements.loading.classList.remove('hidden');
    if (state === 'error') elements.error.classList.remove('hidden');
    if (state === 'receipt') elements.receipt.classList.remove('hidden');
}

function showError(message) {
    elements.errorMessage.textContent = message;
    showState('error');
}

// ============================================
// Nostr Functions
// ============================================

function connectToRelay(url) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(url);
        const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('Connection timeout'));
        }, 5000);

        ws.onopen = () => {
            clearTimeout(timeout);
            resolve(ws);
        };

        ws.onerror = (err) => {
            clearTimeout(timeout);
            reject(err);
        };
    });
}

function queryRelay(ws, receiptId) {
    return new Promise((resolve, reject) => {
        const subId = 'receipt_' + Math.random().toString(36).substr(2, 9);
        const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('Query timeout'));
        }, CONFIG.timeout);

        const events = [];

        ws.onmessage = (msg) => {
            try {
                const data = JSON.parse(msg.data);
                if (data[0] === 'EVENT' && data[1] === subId) {
                    events.push(data[2]);
                } else if (data[0] === 'EOSE' && data[1] === subId) {
                    clearTimeout(timeout);
                    ws.close();
                    resolve(events);
                }
            } catch (err) {
                console.error('Parse error:', err);
            }
        };

        // Send subscription
        const filter = {
            kinds: [CONFIG.receiptKind],
            '#d': [receiptId],
            limit: 1
        };

        ws.send(JSON.stringify(['REQ', subId, filter]));
    });
}

async function fetchReceiptFromNostr(receiptId) {
    for (const relayUrl of CONFIG.relays) {
        try {
            console.log(`Trying relay: ${relayUrl}`);
            const ws = await connectToRelay(relayUrl);
            const events = await queryRelay(ws, receiptId);

            if (events.length > 0) {
                console.log('Found receipt event');
                return events[0];
            }
        } catch (err) {
            console.warn(`Relay ${relayUrl} failed:`, err.message);
        }
    }

    return null;
}

// ============================================
// Render Functions
// ============================================

function renderReceipt(receipt) {
    // Header
    elements.merchantLogo.textContent = '☕'; // Could be dynamic
    elements.merchantName.textContent = receipt.merchantName || 'bnos.space';
    elements.merchantAddress.textContent = receipt.merchantAddress || '';
    elements.receiptDate.textContent = formatDate(receipt.createdAt);

    // Receipt number
    elements.receiptCode.textContent = receipt.code || receipt.id.slice(0, 12).toUpperCase();
    elements.qrCodeText.textContent = receipt.code || receipt.id.slice(0, 12).toUpperCase();

    // Order info
    elements.orderCode.textContent = '#' + (receipt.orderCode || receipt.orderNumber || receipt.orderId);
    elements.itemsCount.textContent = receipt.items.length;

    // Items
    elements.itemsList.innerHTML = receipt.items.map(item => `
    <div class="item-row">
      <div class="item-info">
        <div class="item-main">
          <span class="item-qty">${item.quantity}×</span>
          <span class="item-name">${item.name}</span>
        </div>
        ${item.variant ? `<div class="item-variant">🏷️ ${item.variant}</div>` : ''}
        ${item.modifiers?.length ? `<div class="item-modifiers">+ ${item.modifiers.join(', ')}</div>` : ''}
        ${item.notes ? `<div class="item-notes">💬 ${item.notes}</div>` : ''}
      </div>
      <span class="item-total">${formatCurrency(item.total, receipt.currency)}</span>
    </div>
  `).join('');

    // Totals
    elements.subtotal.textContent = formatCurrency(receipt.subtotal, receipt.currency);

    if (receipt.discount && receipt.discount > 0) {
        elements.discountRow.classList.remove('hidden');
        elements.discount.textContent = '-' + formatCurrency(receipt.discount, receipt.currency);
    }

    if (receipt.tax > 0) {
        elements.taxRow.classList.remove('hidden');
        elements.tax.textContent = formatCurrency(receipt.tax, receipt.currency);
    }

    if (receipt.tip && receipt.tip > 0) {
        elements.tipRow.classList.remove('hidden');
        elements.tip.textContent = formatCurrency(receipt.tip, receipt.currency);
    }

    // Grand total
    elements.total.textContent = formatCurrency(receipt.total, receipt.currency);

    if (receipt.totalSats) {
        elements.satsRow.classList.remove('hidden');
        elements.totalSats.textContent = receipt.totalSats.toLocaleString() + ' sats';
    }

    // Payment
    elements.paymentMethod.textContent = getPaymentMethodLabel(receipt.paymentMethod);

    if (receipt.paymentProof?.paymentHash) {
        elements.paymentHash.classList.remove('hidden');
        elements.paymentHash.textContent = 'TX: ' + receipt.paymentProof.paymentHash.slice(0, 16) + '...';
    }

    // Footer message
    if (receipt.footerMessage) {
        elements.footerMessage.textContent = receipt.footerMessage;
    } else {
        elements.footerMessage.textContent = '🥰 Thank you for your order! 🙏';
    }

    // Generate QR code
    if (typeof QRCode !== 'undefined') {
        QRCode.toCanvas(elements.qrCode, window.location.href, {
            width: 128,
            margin: 2,
            color: {
                dark: '#1f2937',
                light: '#ffffff'
            }
        });
    }

    // Hide share button if not supported
    if (!navigator.share) {
        elements.shareBtn.style.display = 'none';
    }

    showState('receipt');
}

// ============================================
// Share Function
// ============================================

window.shareReceipt = async function () {
    const receipt = window.currentReceipt;
    if (!receipt || !navigator.share) return;

    try {
        await navigator.share({
            title: `Receipt from ${receipt.merchantName}`,
            text: `Order ${receipt.orderId} - ${formatCurrency(receipt.total, receipt.currency)}`,
            url: window.location.href
        });
    } catch (err) {
        console.log('Share cancelled or failed');
    }
};

// ============================================
// Main
// ============================================

async function init() {
    // Parse URL params
    const params = new URLSearchParams(window.location.search);
    const receiptId = params.get('id');
    const receiptCode = params.get('code');

    if (!receiptId) {
        showError('Receipt ID not provided');
        return;
    }

    if (!receiptCode) {
        showError('Receipt code required to view this receipt');
        return;
    }

    try {
        // Fetch from Nostr
        const event = await fetchReceiptFromNostr(receiptId);

        if (!event) {
            showError('Receipt not found or expired');
            return;
        }

        // Parse content
        const content = JSON.parse(event.content);

        // Check if encrypted
        let receipt;
        if (content.ciphertext && content.iv && content.salt) {
            // Decrypt
            receipt = await decryptReceipt(content, receiptCode);

            if (!receipt) {
                showError('Invalid receipt code - decryption failed');
                return;
            }
        } else {
            // Legacy unencrypted
            receipt = content;
        }

        // Verify code matches
        if (receipt.code && receipt.code !== receiptCode) {
            showError('Invalid receipt code');
            return;
        }

        // Check expiration
        if (receipt.expiresAt && new Date(receipt.expiresAt) < new Date()) {
            showError('Receipt expired (90 days retention)');
            return;
        }

        // Store for share function
        window.currentReceipt = receipt;

        // Render!
        renderReceipt(receipt);

    } catch (err) {
        console.error('Error loading receipt:', err);
        showError('Failed to load receipt: ' + err.message);
    }
}

// Start
init();
