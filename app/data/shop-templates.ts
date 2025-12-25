// data/shop-templates.ts
// 🏪 Predefined Shop Type Templates for Easy Store Setup

import type { ShopTypeConfig, ShopTypeMeta, ShopType } from '~/types';

// ============================================
// Shop Type Metadata
// ============================================

export const SHOP_TYPE_META: ShopTypeMeta[] = [
  {
    type: 'cafe',
    name: 'Cafe & Coffee Shop',
    nameLao: 'ຮ້ານກາເຟ',
    icon: 'i-heroicons-beaker',
    description: 'Coffee, tea, pastries and light snacks',
    descriptionLao: 'ກາເຟ, ຊາ, ເຂົ້າໜົມປັງ ແລະ ອາຫານຫວ່າງ',
  },
  {
    type: 'restaurant',
    name: 'Restaurant',
    nameLao: 'ຮ້ານອາຫານ',
    icon: 'i-heroicons-cake',
    description: 'Full-service restaurant with dine-in',
    descriptionLao: 'ຮ້ານອາຫານເຕັມຮູບແບບ ທີ່ມີບໍລິການນັ່ງກິນ',
  },
  {
    type: 'retail',
    name: 'Retail Store',
    nameLao: 'ຮ້ານຂາຍຍ່ອຍ',
    icon: 'i-heroicons-shopping-bag',
    description: 'General merchandise and products',
    descriptionLao: 'ສິນຄ້າທົ່ວໄປ ແລະ ຜະລິດຕະພັນ',
  },
  {
    type: 'grocery',
    name: 'Grocery & Mini Mart',
    nameLao: 'ຮ້ານຂາຍເຄື່ອງ',
    icon: 'i-heroicons-shopping-cart',
    description: 'Food, beverages and daily essentials',
    descriptionLao: 'ອາຫານ, ເຄື່ອງດື່ມ ແລະ ເຄື່ອງໃຊ້ປະຈຳວັນ',
  },
  {
    type: 'service',
    name: 'Service Business',
    nameLao: 'ທຸລະກິດບໍລິການ',
    icon: 'i-heroicons-wrench-screwdriver',
    description: 'Services like salon, repair, laundry',
    descriptionLao: 'ບໍລິການເຊັ່ນ ຮ້ານຕັດຜົມ, ສ້ອມແປງ, ຊັກລີດ',
  },
  {
    type: 'pharmacy',
    name: 'Pharmacy & Health',
    nameLao: 'ຮ້ານຂາຍຢາ',
    icon: 'i-heroicons-heart',
    description: 'Medicine, health and wellness products',
    descriptionLao: 'ຢາ, ຜະລິດຕະພັນສຸຂະພາບ',
  },
  {
    type: 'gym',
    name: 'Gym & Fitness',
    nameLao: 'ຢິມຟິດເນັສ',
    icon: 'i-heroicons-trophy',
    description: 'Fitness center with memberships',
    descriptionLao: 'ສູນຝຶກກາຍກາຍະພາບ ພ້ອມສະມາຊິກ',
  },
  {
    type: 'karaoke',
    name: 'Karaoke & Entertainment',
    nameLao: 'ຄາລາໂອເກະ',
    icon: 'i-heroicons-microphone',
    description: 'Karaoke rooms with food and drinks',
    descriptionLao: 'ຫ້ອງຮ້ອງເພງ ພ້ອມອາຫານ ແລະ ເຄື່ອງດື່ມ',
  },
  {
    type: 'garage',
    name: 'Garage & Auto Repair',
    nameLao: 'ອູ່ຊ່ອມລົດ',
    icon: 'i-heroicons-wrench',
    description: 'Auto and motorcycle repair with parts',
    descriptionLao: 'ຊ່ອມແປງລົດຍົນ ແລະ ລົດຈັກ ພ້ອມອະໄຫຼ່',
  },
  {
    type: 'enterprise',
    name: 'Enterprise',
    nameLao: 'ອົງກອນ',
    icon: 'i-heroicons-building-office-2',
    description: 'Full-featured for enterprise businesses',
    descriptionLao: 'ຄຸນສົມບັດຄົບຖ້ວນ ສຳລັບທຸລະກິດອົງກອນ',
  },
  {
    type: 'other',
    name: 'Other',
    nameLao: 'ອື່ນໆ',
    icon: 'i-heroicons-squares-2x2',
    description: 'Custom business type',
    descriptionLao: 'ປະເພດທຸລະກິດແບບກຳນົດເອງ',
  },
];

// ============================================
// Shop Type Templates with Categories & Products
// ============================================

export const SHOP_TYPE_TEMPLATES: ShopTypeConfig[] = [
  // ========== CAFE ==========
  {
    type: 'cafe',
    meta: SHOP_TYPE_META.find((m) => m.type === 'cafe')!,
    categories: [
      { id: 'cat-hot-drinks', name: 'Hot Drinks', nameLao: 'ເຄື່ອງດື່ມຮ້ອນ', icon: '☕', sortOrder: 1 },
      { id: 'cat-cold-drinks', name: 'Cold Drinks', nameLao: 'ເຄື່ອງດື່ມເຢັນ', icon: '🧊', sortOrder: 2 },
      { id: 'cat-pastries', name: 'Pastries', nameLao: 'ເຂົ້າໜົມປັງ', icon: '🥐', sortOrder: 3 },
      { id: 'cat-snacks', name: 'Snacks', nameLao: 'ອາຫານຫວ່າງ', icon: '🍪', sortOrder: 4 },
    ],
    products: [
      { id: 'prod-espresso', name: 'Espresso', nameLao: 'ເອັສເປຣສໂຊ', categoryId: 'cat-hot-drinks', price: 15000 },
      { id: 'prod-americano', name: 'Americano', nameLao: 'ອາເມຣິກາໂນ', categoryId: 'cat-hot-drinks', price: 18000 },
      { id: 'prod-latte', name: 'Latte', nameLao: 'ລາເຕ້', categoryId: 'cat-hot-drinks', price: 25000 },
      { id: 'prod-cappuccino', name: 'Cappuccino', nameLao: 'ຄາປູຊິໂນ', categoryId: 'cat-hot-drinks', price: 25000 },
      { id: 'prod-hot-chocolate', name: 'Hot Chocolate', nameLao: 'ໂກໂກ້ຮ້ອນ', categoryId: 'cat-hot-drinks', price: 22000 },
      { id: 'prod-iced-latte', name: 'Iced Latte', nameLao: 'ລາເຕ້ເຢັນ', categoryId: 'cat-cold-drinks', price: 28000 },
      { id: 'prod-iced-mocha', name: 'Iced Mocha', nameLao: 'ໂມຄາເຢັນ', categoryId: 'cat-cold-drinks', price: 30000 },
      { id: 'prod-iced-tea', name: 'Iced Tea', nameLao: 'ຊາເຢັນ', categoryId: 'cat-cold-drinks', price: 15000 },
      { id: 'prod-smoothie', name: 'Fruit Smoothie', nameLao: 'ສະມູດຕີ້', categoryId: 'cat-cold-drinks', price: 25000 },
      { id: 'prod-croissant', name: 'Croissant', nameLao: 'ຄົວຊອງ', categoryId: 'cat-pastries', price: 20000 },
      { id: 'prod-muffin', name: 'Muffin', nameLao: 'ມັບຟິນ', categoryId: 'cat-pastries', price: 18000 },
      { id: 'prod-sandwich', name: 'Sandwich', nameLao: 'ແຊນວິດ', categoryId: 'cat-snacks', price: 35000 },
    ],
  },

  // ========== RESTAURANT ==========
  {
    type: 'restaurant',
    meta: SHOP_TYPE_META.find((m) => m.type === 'restaurant')!,
    categories: [
      { id: 'cat-appetizers', name: 'Appetizers', nameLao: 'ອາຫານເລີ່ມຕົ້ນ', icon: '🥗', sortOrder: 1 },
      { id: 'cat-main', name: 'Main Course', nameLao: 'ອາຫານຫຼັກ', icon: '🍛', sortOrder: 2 },
      { id: 'cat-rice-noodles', name: 'Rice & Noodles', nameLao: 'ເຂົ້າ ແລະ ເຝີ', icon: '🍜', sortOrder: 3 },
      { id: 'cat-drinks', name: 'Drinks', nameLao: 'ເຄື່ອງດື່ມ', icon: '🥤', sortOrder: 4 },
      { id: 'cat-desserts', name: 'Desserts', nameLao: 'ຂອງຫວານ', icon: '🍨', sortOrder: 5 },
    ],
    products: [
      { id: 'prod-spring-rolls', name: 'Spring Rolls', nameLao: 'ປໍເປ້ຍສົດ', categoryId: 'cat-appetizers', price: 25000 },
      { id: 'prod-soup', name: 'Soup of the Day', nameLao: 'ແກງວັນນີ້', categoryId: 'cat-appetizers', price: 20000 },
      { id: 'prod-laap', name: 'Laap (Minced Meat Salad)', nameLao: 'ລາບ', categoryId: 'cat-main', price: 40000 },
      { id: 'prod-ping-kai', name: 'Grilled Chicken', nameLao: 'ປີ້ງໄກ່', categoryId: 'cat-main', price: 45000 },
      { id: 'prod-fried-rice', name: 'Fried Rice', nameLao: 'ເຂົ້າຂຽວ', categoryId: 'cat-rice-noodles', price: 35000 },
      { id: 'prod-pho', name: 'Pho Noodle Soup', nameLao: 'ເຝີ', categoryId: 'cat-rice-noodles', price: 35000 },
      { id: 'prod-khao-piak', name: 'Khao Piak Sen', nameLao: 'ເຂົ້າປຽກເສັ້ນ', categoryId: 'cat-rice-noodles', price: 30000 },
      { id: 'prod-water', name: 'Bottled Water', nameLao: 'ນ້ຳດື່ມ', categoryId: 'cat-drinks', price: 5000 },
      { id: 'prod-beer-lao', name: 'Beer Lao', nameLao: 'ເບຍລາວ', categoryId: 'cat-drinks', price: 15000 },
      { id: 'prod-sticky-rice-mango', name: 'Mango Sticky Rice', nameLao: 'ເຂົ້າໜຽວໝາກມ່ວງ', categoryId: 'cat-desserts', price: 25000 },
    ],
  },

  // ========== RETAIL ==========
  {
    type: 'retail',
    meta: SHOP_TYPE_META.find((m) => m.type === 'retail')!,
    categories: [
      { id: 'cat-electronics', name: 'Electronics', nameLao: 'ເຄື່ອງໃຊ້ໄຟຟ້າ', icon: '📱', sortOrder: 1 },
      { id: 'cat-clothing', name: 'Clothing', nameLao: 'ເຄື່ອງນຸ່ງ', icon: '👕', sortOrder: 2 },
      { id: 'cat-accessories', name: 'Accessories', nameLao: 'ເຄື່ອງປະດັບ', icon: '👜', sortOrder: 3 },
      { id: 'cat-home', name: 'Home & Living', nameLao: 'ເຄື່ອງໃຊ້ໃນເຮືອນ', icon: '🏠', sortOrder: 4 },
    ],
    products: [], // Retail typically has custom products
  },

  // ========== GROCERY ==========
  {
    type: 'grocery',
    meta: SHOP_TYPE_META.find((m) => m.type === 'grocery')!,
    categories: [
      { id: 'cat-fresh', name: 'Fresh Produce', nameLao: 'ຜັກ ແລະ ໝາກໄມ້', icon: '🥬', sortOrder: 1 },
      { id: 'cat-beverages', name: 'Beverages', nameLao: 'ເຄື່ອງດື່ມ', icon: '🥤', sortOrder: 2 },
      { id: 'cat-snacks-grocery', name: 'Snacks', nameLao: 'ອາຫານຂະບວນ', icon: '🍿', sortOrder: 3 },
      { id: 'cat-daily', name: 'Daily Essentials', nameLao: 'ເຄື່ອງໃຊ້ປະຈຳວັນ', icon: '🧴', sortOrder: 4 },
      { id: 'cat-frozen', name: 'Frozen Foods', nameLao: 'ອາຫານແຊ່ແຂງ', icon: '🧊', sortOrder: 5 },
    ],
    products: [
      { id: 'prod-water-bottle', name: 'Water 1.5L', nameLao: 'ນ້ຳດື່ມ 1.5L', categoryId: 'cat-beverages', price: 5000 },
      { id: 'prod-coke', name: 'Coca-Cola 330ml', nameLao: 'ໂຄຄາ-ໂຄລາ 330ml', categoryId: 'cat-beverages', price: 8000 },
      { id: 'prod-chips', name: 'Potato Chips', nameLao: 'ມັນຕົ້ນທອດ', categoryId: 'cat-snacks-grocery', price: 10000 },
      { id: 'prod-instant-noodles', name: 'Instant Noodles', nameLao: 'ເຝີກ້ອນ', categoryId: 'cat-snacks-grocery', price: 5000 },
      { id: 'prod-rice-5kg', name: 'Rice 5kg', nameLao: 'ເຂົ້າສານ 5kg', categoryId: 'cat-daily', price: 50000 },
      { id: 'prod-cooking-oil', name: 'Cooking Oil 1L', nameLao: 'ນ້ຳມັນພືດ 1L', categoryId: 'cat-daily', price: 25000 },
    ],
  },

  // ========== SERVICE ==========
  {
    type: 'service',
    meta: SHOP_TYPE_META.find((m) => m.type === 'service')!,
    categories: [
      { id: 'cat-services', name: 'Services', nameLao: 'ບໍລິການ', icon: '✂️', sortOrder: 1 },
      { id: 'cat-packages', name: 'Packages', nameLao: 'ແພັກເກັດ', icon: '📦', sortOrder: 2 },
      { id: 'cat-products-service', name: 'Products', nameLao: 'ຜະລິດຕະພັນ', icon: '🧴', sortOrder: 3 },
    ],
    products: [
      { id: 'prod-haircut', name: 'Haircut', nameLao: 'ຕັດຜົມ', categoryId: 'cat-services', price: 30000 },
      { id: 'prod-wash-cut', name: 'Wash & Cut', nameLao: 'ສະຜົມ ແລະ ຕັດ', categoryId: 'cat-services', price: 40000 },
      { id: 'prod-coloring', name: 'Hair Coloring', nameLao: 'ຍ້ອມຜົມ', categoryId: 'cat-services', price: 150000 },
    ],
  },

  // ========== PHARMACY ==========
  {
    type: 'pharmacy',
    meta: SHOP_TYPE_META.find((m) => m.type === 'pharmacy')!,
    categories: [
      { id: 'cat-medicine', name: 'Medicine', nameLao: 'ຢາ', icon: '💊', sortOrder: 1 },
      { id: 'cat-vitamins', name: 'Vitamins & Supplements', nameLao: 'ວິຕາມິນ', icon: '🍊', sortOrder: 2 },
      { id: 'cat-personal-care', name: 'Personal Care', nameLao: 'ເຄື່ອງໃຊ້ສ່ວນຕົວ', icon: '🧴', sortOrder: 3 },
      { id: 'cat-medical-devices', name: 'Medical Devices', nameLao: 'ອຸປະກອນການແພດ', icon: '🩺', sortOrder: 4 },
    ],
    products: [
      { id: 'prod-paracetamol', name: 'Paracetamol 500mg', nameLao: 'ພາຣາເຊຕາມອນ', categoryId: 'cat-medicine', price: 10000 },
      { id: 'prod-vitamin-c', name: 'Vitamin C', nameLao: 'ວິຕາມິນ C', categoryId: 'cat-vitamins', price: 50000 },
      { id: 'prod-mask', name: 'Face Mask (10pcs)', nameLao: 'ໜ້າກາກ (10ອັນ)', categoryId: 'cat-personal-care', price: 20000 },
    ],
  },

  // ========== OTHER ==========
  {
    type: 'other',
    meta: SHOP_TYPE_META.find((m) => m.type === 'other')!,
    categories: [
      { id: 'cat-general', name: 'General', nameLao: 'ທົ່ວໄປ', icon: '📦', sortOrder: 1 },
    ],
    products: [],
  },

  // ========== ENTERPRISE ==========
  {
    type: 'enterprise',
    meta: SHOP_TYPE_META.find((m) => m.type === 'enterprise')!,
    categories: [
      { id: 'cat-products', name: 'Products', nameLao: 'ສິນຄ້າ', icon: '📦', sortOrder: 1 },
      { id: 'cat-services', name: 'Services', nameLao: 'ບໍລິການ', icon: '🛠️', sortOrder: 2 },
      { id: 'cat-subscriptions', name: 'Subscriptions', nameLao: 'ສະມາຊິກ', icon: '💳', sortOrder: 3 },
    ],
    products: [],
  },

  // ========== GYM & FITNESS ==========
  {
    type: 'gym',
    meta: SHOP_TYPE_META.find((m) => m.type === 'gym')!,
    categories: [
      { id: 'cat-memberships', name: 'Memberships', nameLao: 'ສະມາຊິກ', icon: '💳', sortOrder: 1 },
      { id: 'cat-classes', name: 'Classes', nameLao: 'ຫ້ອງຮຽນ', icon: '🧘', sortOrder: 2 },
      { id: 'cat-drinks-gym', name: 'Drinks & Supplements', nameLao: 'ເຄື່ອງດື່ມ', icon: '🥤', sortOrder: 3 },
      { id: 'cat-merchandise', name: 'Merchandise', nameLao: 'ສິນຄ້າ', icon: '👕', sortOrder: 4 },
      { id: 'cat-personal-training', name: 'Personal Training', nameLao: 'ຝຶກສ່ວນຕົວ', icon: '🏋️', sortOrder: 5 },
    ],
    products: [
      { id: 'prod-day-pass', name: 'Day Pass', nameLao: 'ບັດມື້', categoryId: 'cat-memberships', price: 50000 },
      { id: 'prod-monthly', name: 'Monthly Membership', nameLao: 'ສະມາຊິກລາຍເດືອນ', categoryId: 'cat-memberships', price: 300000 },
      { id: 'prod-3month', name: '3 Month Membership', nameLao: 'ສະມາຊິກ 3 ເດືອນ', categoryId: 'cat-memberships', price: 750000 },
      { id: 'prod-yearly', name: 'Yearly Membership', nameLao: 'ສະມາຊິກລາຍປີ', categoryId: 'cat-memberships', price: 2500000 },
      { id: 'prod-yoga-class', name: 'Yoga Class', nameLao: 'ຫ້ອງໂຢກະ', categoryId: 'cat-classes', price: 60000 },
      { id: 'prod-boxing-class', name: 'Boxing Class', nameLao: 'ຫ້ອງມວຍ', categoryId: 'cat-classes', price: 80000 },
      { id: 'prod-spinning', name: 'Spinning Class', nameLao: 'ຫ້ອງປັ່ນລົດ', categoryId: 'cat-classes', price: 50000 },
      { id: 'prod-protein-shake', name: 'Protein Shake', nameLao: 'ເຄື່ອງດື່ມໂປຣຕີນ', categoryId: 'cat-drinks-gym', price: 35000 },
      { id: 'prod-water-gym', name: 'Water', nameLao: 'ນ້ຳດື່ມ', categoryId: 'cat-drinks-gym', price: 10000 },
      { id: 'prod-energy-drink', name: 'Energy Drink', nameLao: 'ເຄື່ອງດື່ມຊູກຳລັງ', categoryId: 'cat-drinks-gym', price: 25000 },
      { id: 'prod-gym-tshirt', name: 'Gym T-Shirt', nameLao: 'ເສື້ອຢືດ', categoryId: 'cat-merchandise', price: 150000 },
      { id: 'prod-towel', name: 'Gym Towel', nameLao: 'ຜ້າເຊັດໜ້າ', categoryId: 'cat-merchandise', price: 50000 },
      { id: 'prod-pt-session', name: 'PT Session (1hr)', nameLao: 'ຝຶກສ່ວນຕົວ (1ຊົ່ວໂມງ)', categoryId: 'cat-personal-training', price: 200000 },
      { id: 'prod-pt-10pack', name: 'PT 10 Sessions', nameLao: 'ຝຶກສ່ວນຕົວ 10 ຄັ້ງ', categoryId: 'cat-personal-training', price: 1800000 },
    ],
  },

  // ========== KARAOKE ==========
  {
    type: 'karaoke',
    meta: SHOP_TYPE_META.find((m) => m.type === 'karaoke')!,
    categories: [
      { id: 'cat-rooms', name: 'Rooms', nameLao: 'ຫ້ອງຮ້ອງເພງ', icon: '🚪', sortOrder: 1 },
      { id: 'cat-drinks-ktv', name: 'Drinks', nameLao: 'ເຄື່ອງດື່ມ', icon: '🍻', sortOrder: 2 },
      { id: 'cat-food-ktv', name: 'Food', nameLao: 'ອາຫານ', icon: '🍜', sortOrder: 3 },
      { id: 'cat-packages-ktv', name: 'Packages', nameLao: 'ແພັກເກັດ', icon: '🎁', sortOrder: 4 },
    ],
    products: [
      { id: 'prod-room-small', name: 'Small Room (per hour)', nameLao: 'ຫ້ອງນ້ອຍ (ຕໍ່ຊົ່ວໂມງ)', categoryId: 'cat-rooms', price: 80000 },
      { id: 'prod-room-medium', name: 'Medium Room (per hour)', nameLao: 'ຫ້ອງກາງ (ຕໍ່ຊົ່ວໂມງ)', categoryId: 'cat-rooms', price: 120000 },
      { id: 'prod-room-large', name: 'Large Room (per hour)', nameLao: 'ຫ້ອງໃຫຍ່ (ຕໍ່ຊົ່ວໂມງ)', categoryId: 'cat-rooms', price: 180000 },
      { id: 'prod-room-vip', name: 'VIP Room (per hour)', nameLao: 'ຫ້ອງ VIP (ຕໍ່ຊົ່ວໂມງ)', categoryId: 'cat-rooms', price: 300000 },
      { id: 'prod-beer-lao-ktv', name: 'Beer Lao', nameLao: 'ເບຍລາວ', categoryId: 'cat-drinks-ktv', price: 15000 },
      { id: 'prod-beer-tiger', name: 'Tiger Beer', nameLao: 'ເບຍໄທເກີ', categoryId: 'cat-drinks-ktv', price: 20000 },
      { id: 'prod-whisky-bottle', name: 'Whisky Bottle', nameLao: 'ວິສກີແກ້ວ', categoryId: 'cat-drinks-ktv', price: 350000 },
      { id: 'prod-soft-drink', name: 'Soft Drink', nameLao: 'ນ້ຳອັດລົມ', categoryId: 'cat-drinks-ktv', price: 10000 },
      { id: 'prod-mixer', name: 'Mixer Set', nameLao: 'ຊຸດມິກເຊີ', categoryId: 'cat-drinks-ktv', price: 30000 },
      { id: 'prod-snack-platter', name: 'Snack Platter', nameLao: 'ຈານຂອງກິນຫຼິ້ນ', categoryId: 'cat-food-ktv', price: 60000 },
      { id: 'prod-fried-chicken', name: 'Fried Chicken', nameLao: 'ໄກ່ທອດ', categoryId: 'cat-food-ktv', price: 50000 },
      { id: 'prod-fruit-platter', name: 'Fruit Platter', nameLao: 'ຈານຫມາກໄມ້', categoryId: 'cat-food-ktv', price: 80000 },
      { id: 'prod-happy-hour', name: 'Happy Hour Package (3hr)', nameLao: 'ແພັກເກັດ Happy Hour (3ຊມ)', categoryId: 'cat-packages-ktv', price: 200000 },
      { id: 'prod-vip-package', name: 'VIP Party Package', nameLao: 'ແພັກເກັດ VIP', categoryId: 'cat-packages-ktv', price: 800000 },
    ],
  },

  // ========== GARAGE & AUTO REPAIR ==========
  {
    type: 'garage',
    meta: SHOP_TYPE_META.find((m) => m.type === 'garage')!,
    categories: [
      { id: 'cat-repair-service', name: 'Repair Services', nameLao: 'ບໍລິການສ້ອມແປງ', icon: '🔧', sortOrder: 1 },
      { id: 'cat-parts', name: 'Parts & Accessories', nameLao: 'ອະໄຫຼ່', icon: '⚙️', sortOrder: 2 },
      { id: 'cat-maintenance', name: 'Maintenance', nameLao: 'ບຳລຸງຮັກສາ', icon: '🛢️', sortOrder: 3 },
      { id: 'cat-labor', name: 'Labor', nameLao: 'ຄ່າແຮງ', icon: '👨‍🔧', sortOrder: 4 },
      { id: 'cat-packages-garage', name: 'Discount Packages', nameLao: 'ແພັກເກັດສ່ວນຫຼຸດ', icon: '🏷️', sortOrder: 5 },
    ],
    products: [
      // Repair Services
      { id: 'prod-engine-repair', name: 'Engine Repair', nameLao: 'ສ້ອມເຄື່ອງຈັກ', categoryId: 'cat-repair-service', price: 500000 },
      { id: 'prod-brake-repair', name: 'Brake Repair', nameLao: 'ສ້ອມເບກ', categoryId: 'cat-repair-service', price: 200000 },
      { id: 'prod-suspension', name: 'Suspension Repair', nameLao: 'ສ້ອມຊ໊ອກອັບ', categoryId: 'cat-repair-service', price: 350000 },
      { id: 'prod-electrical', name: 'Electrical Repair', nameLao: 'ສ້ອມໄຟຟ້າ', categoryId: 'cat-repair-service', price: 150000 },
      { id: 'prod-tire-repair', name: 'Tire Repair', nameLao: 'ປະຢາງ', categoryId: 'cat-repair-service', price: 30000 },
      // Parts
      { id: 'prod-oil-filter', name: 'Oil Filter', nameLao: 'ກອງນ້ຳມັນ', categoryId: 'cat-parts', price: 50000 },
      { id: 'prod-brake-pad', name: 'Brake Pads', nameLao: 'ຜ້າເບກ', categoryId: 'cat-parts', price: 150000 },
      { id: 'prod-spark-plug', name: 'Spark Plug', nameLao: 'ຫົວກຽນ', categoryId: 'cat-parts', price: 25000 },
      { id: 'prod-battery', name: 'Battery', nameLao: 'ແບັດເຕີຣີ', categoryId: 'cat-parts', price: 800000 },
      { id: 'prod-tire', name: 'Tire', nameLao: 'ຢາງລົດ', categoryId: 'cat-parts', price: 600000 },
      // Maintenance
      { id: 'prod-oil-change', name: 'Oil Change', nameLao: 'ປ່ຽນນ້ຳມັນເຄື່ອງ', categoryId: 'cat-maintenance', price: 100000 },
      { id: 'prod-full-service', name: 'Full Service', nameLao: 'ບໍລິການເຕັມ', categoryId: 'cat-maintenance', price: 250000 },
      { id: 'prod-wash', name: 'Car Wash', nameLao: 'ລ້າງລົດ', categoryId: 'cat-maintenance', price: 30000 },
      { id: 'prod-inspection', name: 'Vehicle Inspection', nameLao: 'ກວດສອບລົດ', categoryId: 'cat-maintenance', price: 50000 },
      // Labor
      { id: 'prod-labor-hour', name: 'Labor (per hour)', nameLao: 'ຄ່າແຮງ (ຕໍ່ຊົ່ວໂມງ)', categoryId: 'cat-labor', price: 80000 },
      { id: 'prod-labor-half', name: 'Labor (30 min)', nameLao: 'ຄ່າແຮງ (30 ນາທີ)', categoryId: 'cat-labor', price: 40000 },
      // Discount Packages
      { id: 'prod-pkg-basic', name: 'Basic Service Package (10% off)', nameLao: 'ແພັກເກັດພື້ນຖານ (ຫຼຸດ 10%)', categoryId: 'cat-packages-garage', price: 225000 },
      { id: 'prod-pkg-premium', name: 'Premium Service (15% off)', nameLao: 'ແພັກເກັດພິເສດ (ຫຼຸດ 15%)', categoryId: 'cat-packages-garage', price: 400000 },
      { id: 'prod-pkg-loyalty', name: 'Loyalty Card (5 services)', nameLao: 'ບັດສະມາຊິກ (5 ຄັ້ງ)', categoryId: 'cat-packages-garage', price: 450000 },
    ],
  },
];

// ============================================
// Helper Functions
// ============================================

/**
 * Get shop type configuration by type
 */
export function getShopTypeConfig(type: ShopType): ShopTypeConfig | undefined {
  return SHOP_TYPE_TEMPLATES.find((t) => t.type === type);
}

/**
 * Get shop type metadata by type
 */
export function getShopTypeMeta(type: ShopType): ShopTypeMeta | undefined {
  return SHOP_TYPE_META.find((m) => m.type === type);
}

/**
 * Get all shop type metadata for selection UI
 */
export function getAllShopTypes(): ShopTypeMeta[] {
  return SHOP_TYPE_META;
}
