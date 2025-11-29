<!-- components/pos/CouponInput.vue -->
<!-- 🎫 Coupon Code Input Component -->
<script setup lang="ts">
import type { Coupon, AppliedCoupon, CurrencyCode } from '~/types';

const props = defineProps<{
  subtotal: number;
  currency: CurrencyCode;
  appliedCoupon?: AppliedCoupon | null;
}>();

const emit = defineEmits<{
  apply: [coupon: AppliedCoupon];
  remove: [];
}>();

// Composables
const currencyHelper = useCurrency();
const { t } = useI18n();

// State
const couponCode = ref('');
const isValidating = ref(false);
const error = ref('');
const showInput = ref(false);

// Mock coupons - in production, load from database/API
const availableCoupons: Coupon[] = [
  {
    id: 'welcome10',
    code: 'WELCOME10',
    name: 'Welcome 10% Off',
    description: '10% off for new customers',
    type: 'percentage',
    value: 10,
    minOrderAmount: 50000,
    maxDiscount: 100000,
    validFrom: '2024-01-01',
    validUntil: '2025-12-31',
    usageLimit: 1000,
    usedCount: 150,
    isActive: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'save20k',
    code: 'SAVE20K',
    name: 'Save ₭20,000',
    description: 'Fixed ₭20,000 discount',
    type: 'fixed',
    value: 20000,
    minOrderAmount: 100000,
    validFrom: '2024-01-01',
    validUntil: '2025-12-31',
    usageLimit: 500,
    usedCount: 100,
    isActive: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'lightning',
    code: 'LIGHTNING',
    name: 'Lightning Special',
    description: '15% off when paying with Lightning',
    type: 'percentage',
    value: 15,
    validFrom: '2024-01-01',
    validUntil: '2025-12-31',
    usedCount: 0,
    isActive: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
];

const validateCoupon = async () => {
  if (!couponCode.value.trim()) {
    error.value = t('coupon.errors.empty');
    return;
  }

  isValidating.value = true;
  error.value = '';

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const code = couponCode.value.toUpperCase().trim();
  const coupon = availableCoupons.find(c => c.code === code);

  if (!coupon) {
    error.value = t('coupon.errors.invalid');
    isValidating.value = false;
    return;
  }

  if (!coupon.isActive) {
    error.value = t('coupon.errors.inactive');
    isValidating.value = false;
    return;
  }

  const now = new Date();
  if (new Date(coupon.validFrom) > now) {
    error.value = t('coupon.errors.notStarted');
    isValidating.value = false;
    return;
  }

  if (new Date(coupon.validUntil) < now) {
    error.value = t('coupon.errors.expired');
    isValidating.value = false;
    return;
  }

  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    error.value = t('coupon.errors.limitReached');
    isValidating.value = false;
    return;
  }

  if (coupon.minOrderAmount && props.subtotal < coupon.minOrderAmount) {
    error.value = t('coupon.errors.minOrder', { amount: currencyHelper.format(coupon.minOrderAmount, props.currency) });
    isValidating.value = false;
    return;
  }

  // Calculate discount
  let discountAmount = 0;
  if (coupon.type === 'percentage') {
    discountAmount = Math.round((props.subtotal * coupon.value) / 100);
    if (coupon.maxDiscount) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscount);
    }
  } else if (coupon.type === 'fixed') {
    discountAmount = coupon.value;
  }

  // Emit applied coupon
  emit('apply', {
    coupon,
    discountAmount,
    appliedAt: new Date().toISOString(),
  });

  // Reset
  couponCode.value = '';
  showInput.value = false;
  isValidating.value = false;
};

const removeCoupon = () => {
  emit('remove');
};

const toggleInput = () => {
  showInput.value = !showInput.value;
  error.value = '';
  couponCode.value = '';
};
</script>

<template>
  <div class="space-y-2">
    <!-- Applied Coupon Display -->
    <div
      v-if="appliedCoupon"
      class="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-xl"
    >
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
          <span class="text-xl">🎫</span>
        </div>
        <div class="text-left">
          <p class="font-semibold text-green-700 dark:text-green-400 text-sm">
            {{ appliedCoupon.coupon.code }}
          </p>
          <p class="text-xs text-green-600 dark:text-green-500">
            {{ appliedCoupon.coupon.name }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="font-bold text-green-600 dark:text-green-400">
          -{{ currencyHelper.format(appliedCoupon.discountAmount, currency) }}
        </span>
        <button
          class="w-6 h-6 rounded-full bg-green-500/20 hover:bg-red-500/20 text-green-600 hover:text-red-500 flex items-center justify-center transition-colors"
          @click="removeCoupon"
        >
          <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Add Coupon Button/Input -->
    <div v-else>
      <button
        v-if="!showInput"
        class="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        @click="toggleInput"
      >
        <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <UIcon name="i-heroicons-ticket" class="w-4 h-4" />
          <span>{{ t('coupon.addCoupon') }}</span>
        </div>
        <UIcon name="i-heroicons-plus" class="w-4 h-4 text-gray-400 dark:text-gray-600" />
      </button>

      <!-- Coupon Input -->
      <div v-else class="space-y-2">
        <div class="flex gap-2">
          <UInput
            v-model="couponCode"
            :placeholder="t('coupon.enterCode')"
            class="flex-1 uppercase"
            size="sm"
            :disabled="isValidating"
            @keyup.enter="validateCoupon"
          />
          <UButton
            color="primary"
            size="sm"
            :loading="isValidating"
            :disabled="!couponCode.trim()"
            @click="validateCoupon"
          >
            {{ t('coupon.apply') }}
          </UButton>
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-heroicons-x-mark"
            @click="toggleInput"
          />
        </div>
        
        <!-- Error Message -->
        <p v-if="error" class="text-xs text-red-500 text-left">
          {{ error }}
        </p>
      </div>
    </div>
  </div>
</template>
