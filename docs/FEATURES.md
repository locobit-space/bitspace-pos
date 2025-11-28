# 🚀 BitSpace POS - Futuristic Lightning POS

## Overview

นี่คือ POS ยุคใหม่ที่ใช้ **Lightning Network + Nostr** เป็น core technology รองรับการทำงานแบบ decentralized และ offline-first

## ✨ Features ที่สร้างไว้

### 1. ⚡ Lightning Payment System (`use-lightning.ts`)
- รองรับ **BOLT11** (standard invoices)
- รองรับ **BOLT12** (static QR - ล้ำสุด!)
- เชื่อมต่อได้กับ LNbits, Alby, NWC
- Payment verification ด้วย preimage
- Real-time payment watching

### 2. 💰 Multi-Currency System (`use-currency.ts`)
- รองรับ **LAK, THB, USD, BTC, SATS**
- Auto-fetch อัตราแลกเปลี่ยน
- แปลงราคาแบบ real-time
- BTC price tracking จาก mempool.space

### 3. 📴 Offline Payment Mode (`use-offline.ts`)
- เก็บ payment proofs ใน IndexedDB
- Auto-sync เมื่อกลับ online
- ตรวจสอบ preimage ได้แม้ offline
- Export/import backup

### 4. 🛒 POS Cart System (`use-pos.ts`)
- Cart management แบบ full-featured
- Tip system (percentage หรือ fixed)
- Session management สำหรับพนักงาน
- Multi-currency cart

### 5. 🧾 E-Receipt via Nostr (`use-receipt.ts`)
- ส่งใบเสร็จผ่าน Nostr DM (encrypted)
- Print receipt แบบ thermal
- รวม payment proof
- Decentralized - ลูกค้าเก็บเอง!

### 6. 🧠 AI Analytics (`use-ai-analytics.ts`)
- วิเคราะห์ยอดขาย
- แนะนำ upsell
- Peak hours detection
- Low stock alerts
- Staff performance

### 7. 🎟️ Loyalty/Rewards (`use-loyalty.ts`)
- Login ด้วย Nostr (NIP-07)
- Points system
- Tier levels (Bronze → Platinum)
- Zap rewards - ส่ง sats กลับลูกค้า!

## 📁 Files ที่สร้าง

### Types
```
app/types/index.ts - Type definitions ทั้งหมด
```

### Composables
```
app/composables/
├── use-lightning.ts     - Lightning payments
├── use-currency.ts      - Multi-currency
├── use-offline.ts       - Offline mode
├── use-pos.ts           - Cart & session
├── use-receipt.ts       - E-receipts
├── use-ai-analytics.ts  - AI insights
└── use-loyalty.ts       - Rewards system
```

### Pages
```
app/pages/
└── pos/
    └── index.vue        - Main POS terminal
```

### Components
```
app/components/
├── payment/
│   ├── PaymentLightning.vue  - Lightning QR & payment
│   └── PaymentStaticQR.vue   - BOLT12 static QR
├── analytics/
│   └── AnalyticsInsights.vue - AI insights display
└── loyalty/
    └── LoyaltyCard.vue       - Member card
```

### Database
```
app/db/db.ts - IndexedDB schema (upgraded to v2)
```

## 🎯 วิธีใช้

### 1. เปิด POS Terminal
```
http://localhost:3000/pos
```

### 2. เพิ่มสินค้าลง Cart
- คลิกที่สินค้า
- ปรับจำนวนได้
- เปลี่ยน currency ได้

### 3. รับ Lightning Payment
- กด "Pay with Lightning"
- ลูกค้า scan QR
- รอ payment confirm
- ระบบส่ง e-receipt อัตโนมัติ

### 4. Offline Mode
- ระบบจะเก็บ payment proof
- Sync อัตโนมัติเมื่อ online

## 🔧 Configuration

### Lightning Provider
ตั้งค่าใน Settings:
- **LNbits**: ใส่ URL + API Key
- **Alby**: ติดตั้ง extension
- **NWC**: ใส่ connection string

### Nostr Relays
ตั้งค่าใน `use-nostr-relay.ts`:
```ts
const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
];
```

## 🚀 Next Steps

1. **เพิ่ม Hardware Integration**
   - Receipt printer
   - Barcode scanner
   - Cash drawer

2. **Multi-store Sync**
   - ใช้ Nostr relay sync ข้อมูลข้ามสาขา

3. **AI Enhancement**
   - ใช้ LLM วิเคราะห์เชิงลึก
   - Demand forecasting

4. **Mobile App**
   - PWA support
   - NFC payments

---

**Built with ❤️ for the Lightning economy**

⚡ Bitcoin • 📡 Nostr • 🌏 Decentralized
