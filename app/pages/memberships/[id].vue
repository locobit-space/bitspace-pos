<template>
    <div class="flex flex-col h-full">
        <!-- Header -->
        <div
            class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div class="flex items-center gap-4">
                <UButton icon="i-heroicons-arrow-left" color="neutral" variant="ghost" to="/memberships" />
                <div>
                    <h1 class="text-xl font-bold text-gray-900 dark:text-white">
                        {{ membership?.customerName || 'Member Details' }}
                    </h1>
                    <div class="flex items-center gap-2 text-sm text-gray-500">
                        <UBadge :color="membership?.status === 'active' ? 'green' : 'red'" variant="subtle">
                            {{ membership?.status?.toUpperCase() }}
                        </UBadge>
                        <span>{{ membership?.planName }}</span>
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <UButton v-if="membership?.status === 'active'" icon="i-heroicons-arrow-path" color="primary"
                    variant="soft" label="Renew" @click="showRenewModal = true" />
                <UButton icon="i-heroicons-credit-card" color="neutral" variant="ghost" label="Assign Card"
                    @click="showAssignCardModal = true" />
                <UButton v-if="!isCheckedIn" icon="i-heroicons-arrow-right-end-on-rectangle" color="green"
                    label="Check In" :disabled="membership?.status !== 'active'" @click="handleCheckIn" />
                <UButton v-else icon="i-heroicons-arrow-right-start-on-rectangle" color="orange" label="Check Out"
                    @click="handleCheckOut" />
            </div>
        </div>

        <div v-if="loading" class="flex-1 flex items-center justify-center">
            <UIcon name="i-heroicons-arrow-path" class="animate-spin text-4xl text-gray-400" />
        </div>

        <div v-else-if="!membership" class="flex-1 flex items-center justify-center text-gray-500">
            Member not found
        </div>

        <div v-else class="flex-1 overflow-auto p-6 space-y-6">

            <!-- ID Card Section -->
            <UCard>
                <div class="flex flex-col md:flex-row gap-6">
                    <div
                        class="w-full md:w-1/3 flex flex-col items-center gap-4 border-r border-gray-100 dark:border-gray-800">
                        <UAvatar :alt="membership.customerName" size="3xl" class="w-32 h-32 text-3xl" />
                        <div class="text-center">
                            <h3 class="text-lg font-bold">{{ membership.customerName }}</h3>
                            <p class="text-gray-500">{{ membership.planName }}</p>
                        </div>
                        <div class="text-center text-sm">
                            <p class="text-gray-500">Member ID</p>
                            <p class="font-mono">{{ membership.id.slice(0, 8).toUpperCase() }}</p>
                        </div>
                        <div class="text-center text-sm">
                            <p class="text-gray-500">Card UID</p>
                            <p class="font-mono">{{ customerRecord?.cardUid || 'Not Assigned' }}</p>
                        </div>
                    </div>
                    <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <p class="text-gray-500 text-sm mb-1">Start Date</p>
                            <p class="font-medium">{{ formatDate(membership.startDate) }}</p>
                        </div>
                        <div>
                            <p class="text-gray-500 text-sm mb-1">End Date</p>
                            <p class="font-medium">{{ formatDate(membership.endDate) }}</p>
                        </div>
                        <div>
                            <p class="text-gray-500 text-sm mb-1">Total Check-ins</p>
                            <p class="font-medium">{{ membership.checkInCount }}</p>
                        </div>
                        <div>
                            <p class="text-gray-500 text-sm mb-1">Remaining Days</p>
                            <p :class="remainingDays < 7 ? 'text-red-500' : 'text-green-500'" class="font-medium">
                                {{ remainingDays }} days
                            </p>
                        </div>
                        <div class="col-span-2">
                            <p class="text-gray-500 text-sm mb-1">Notes</p>
                            <p class="text-gray-900 dark:text-gray-300">{{ membership.notes || 'No notes' }}</p>
                        </div>
                    </div>
                </div>
            </UCard>

            <!-- Check-in History -->
            <div>
                <h2 class="text-lg font-bold mb-4">Check-in History</h2>
                <UCard :ui="{ body: { padding: 'p-0' } }">
                    <!-- Desktop Table -->
                    <div class="hidden md:block overflow-x-auto">
                        <table class="w-full text-sm text-left">
                            <thead class="bg-gray-50 dark:bg-gray-800/50 text-gray-500 font-medium">
                                <tr>
                                    <th class="px-4 py-3">Check In</th>
                                    <th class="px-4 py-3">Check Out</th>
                                    <th class="px-4 py-3">Duration</th>
                                    <th class="px-4 py-3">Notes</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                                <tr v-for="row in memberCheckIns" :key="row.id"
                                    class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td class="px-4 py-3">{{ formatDateTime(row.checkInTime) }}</td>
                                    <td class="px-4 py-3">{{ row.checkOutTime ? formatDateTime(row.checkOutTime) : '-'
                                    }}</td>
                                    <td class="px-4 py-3">
                                        <UBadge v-if="!row.checkOutTime" color="green" variant="subtle" size="xs">Active
                                        </UBadge>
                                        <span v-else>{{ row.duration }} min</span>
                                    </td>
                                    <td class="px-4 py-3 text-gray-500">{{ row.notes || '-' }}</td>
                                </tr>
                                <tr v-if="memberCheckIns.length === 0">
                                    <td colspan="4" class="px-4 py-8 text-center text-gray-400">
                                        No check-in history found
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Mobile List View -->
                    <div class="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                        <div v-for="row in memberCheckIns" :key="row.id" class="p-4 space-y-2">
                            <div class="flex justify-between items-start">
                                <div>
                                    <p class="text-xs text-gray-400 uppercase font-medium">Check In</p>
                                    <p class="font-medium">{{ formatDateTime(row.checkInTime) }}</p>
                                </div>
                                <div class="text-right">
                                    <UBadge v-if="!row.checkOutTime" color="green" variant="subtle" size="xs">Active
                                    </UBadge>
                                    <span v-else class="font-bold text-gray-900 dark:text-gray-100">{{ row.duration }}
                                        min</span>
                                </div>
                            </div>
                            <div class="flex justify-between items-center">
                                <div>
                                    <p class="text-xs text-gray-400 uppercase font-medium">Check Out</p>
                                    <p class="text-sm text-gray-600 dark:text-gray-300">
                                        {{ row.checkOutTime ? formatDateTime(row.checkOutTime) : 'Currently in gym' }}
                                    </p>
                                </div>
                            </div>
                            <div v-if="row.notes" class="text-sm text-gray-500 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                                {{ row.notes }}
                            </div>
                        </div>
                        <div v-if="memberCheckIns.length === 0" class="p-8 text-center text-gray-400">
                            No check-in history found
                        </div>
                    </div>
                </UCard>
            </div>

        </div>

        <!-- Renew Modal -->
        <UModal v-model:open="showRenewModal">
            <template #content>
                <div class="p-6">
                    <h3 class="text-lg font-bold mb-4">Renew Membership</h3>
                    <USelect v-model="selectedPlanId" :items="plans" option-attribute="name" value-attribute="id"
                        label="Select Plan" class="mb-4" placeholder="Select Plan" />
                    <div class="flex justify-end gap-2">
                        <UButton color="neutral" variant="ghost" @click="showRenewModal = false">Cancel</UButton>
                        <UButton color="primary" @click="confirmRenew">Renew</UButton>
                    </div>
                </div>
            </template>
        </UModal>

        <!-- Assign Card Modal -->
        <UModal v-model:open="showAssignCardModal">
            <template #content>
                <div class="p-6">
                    <h3 class="text-lg font-bold mb-4">Assign Chip Card</h3>
                    <p class="mb-4 text-gray-500">Scan card now using the reader...</p>
                    <UInput v-model="cardUidInput" placeholder="Card UID" autofocus class="mb-4"
                        @keydown.enter="confirmAssignCard" />
                    <div class="flex justify-end gap-2">
                        <UButton color="neutral" variant="ghost" @click="showAssignCardModal = false">Cancel</UButton>
                        <UButton color="primary" @click="confirmAssignCard">Assign</UButton>
                    </div>
                </div>
            </template>
        </UModal>

    </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useMemberships } from '~/composables/use-memberships';
import { useCustomers } from '~/composables/use-customers'; // To get customer details like cardUid
import { db } from '~/db/db'; // Direct generic access if needed, but safe to use simple fetch
import type { MembershipCheckIn } from '~/types';

const route = useRoute();
const {
    memberships,
    checkIns,
    plans,
    checkIn,
    checkOut,
    renewMembership,
    assignCard,
    init
} = useMemberships();

const { getCustomerById } = useCustomers();

const membershipId = route.params.id as string;
const loading = ref(true);
const customerRecord = ref<any>(null); // To store linked customer details

const showRenewModal = ref(false);
const showAssignCardModal = ref(false);
const selectedPlanId = ref('');
const cardUidInput = ref('');

// Computed
const membership = computed(() => memberships.value.find(m => m.id === membershipId));

const memberCheckIns = computed(() => {
    if (!membership.value) return [];
    return checkIns.value
        .filter(c => c.membershipId === membershipId)
        .sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime());
});

const isCheckedIn = computed(() => {
    // Check if the most recent check-in has no check-out time
    const last = memberCheckIns.value[0];
    return last && !last.checkOutTime;
});

const remainingDays = computed(() => {
    if (!membership.value) return 0;
    const end = new Date(membership.value.endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
});



// Methods
function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString();
}

function formatDateTime(iso: string) {
    return new Date(iso).toLocaleString();
}

async function handleCheckIn() {
    if (!membership.value) return;
    await checkIn(membershipId);
}

async function handleCheckOut() {
    const last = memberCheckIns.value[0];
    if (last && !last.checkOutTime) {
        await checkOut(last.id);
    }
}

async function confirmRenew() {
    if (membership.value && selectedPlanId.value) {
        await renewMembership(membershipId, selectedPlanId.value);
        showRenewModal.value = false;
    }
}

async function confirmAssignCard() {
    if (membership.value && cardUidInput.value) {
        const success = await assignCard(membership.value.customerId, cardUidInput.value);
        if (success) {
            // Refresh customer record locally
            customerRecord.value = await db.customers.get(membership.value.customerId);

            const toast = useToast();
            toast.add({ title: 'Card Assigned', color: 'success' });
            showAssignCardModal.value = false;
            cardUidInput.value = '';
        }
    }
}

// Init
onMounted(async () => {
    await init();
    if (membership.value) {
        selectedPlanId.value = membership.value.planId;
        // Load Customer logic - simple fetch from DB to get cardUid
        customerRecord.value = await db.customers.get(membership.value.customerId);
    }
    loading.value = false;
});
</script>
