<template>
    <div class="h-screen">
        <slot />
        <!-- Notification Center - available on all blank layout pages -->
        <NotificationCenter />
    </div>
</template>

<script setup lang="ts">
const { initPosAlerts } = useNotifications();
const company = useCompany();

onMounted(() => {
    // Load company code first (required for POS alerts subscription)
    company.loadCompanyCode();

    // Initialize POS alerts for cross-device notifications
    // Enables: kitchen status updates, waiter calls, bill requests via Nostr
    initPosAlerts();
});
</script>

<style scoped></style>