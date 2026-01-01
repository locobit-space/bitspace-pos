// composables/use-memberships.ts
// 💳 Membership Management - Plans, Subscriptions, Check-ins

import type { Membership, MembershipPlan, MembershipCheckIn, MembershipStatus } from '~/types';

// Database keys
const MEMBERSHIPS_KEY = 'memberships';
const MEMBERSHIP_PLANS_KEY = 'membership_plans';
const CHECKINS_KEY = 'membership_checkins';

export function useMemberships() {
  const { t } = useI18n();
  const toast = useToast();

  // State
  const memberships = ref<Membership[]>([]);
  const plans = ref<MembershipPlan[]>([]);
  const checkIns = ref<MembershipCheckIn[]>([]);
  const isLoading = ref(false);
  const isInitialized = ref(false);

  // Stats
  const activeMemberships = computed(() =>
    memberships.value.filter((m) => m.status === 'active')
  );

  const expiringSoon = computed(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return memberships.value.filter((m) => {
      if (m.status !== 'active') return false;
      const endDate = new Date(m.endDate);
      return endDate <= thirtyDaysFromNow && endDate > now;
    });
  });

  const expiredMemberships = computed(() =>
    memberships.value.filter((m) => m.status === 'expired')
  );

  // ============================================
  // Initialize
  // ============================================

  async function init() {
    if (isInitialized.value) return;
    isLoading.value = true;

    try {
      // Load from localStorage (will migrate to Dexie/Nostr later)
      const storedMemberships = localStorage.getItem(MEMBERSHIPS_KEY);
      const storedPlans = localStorage.getItem(MEMBERSHIP_PLANS_KEY);
      const storedCheckIns = localStorage.getItem(CHECKINS_KEY);

      if (storedMemberships) {
        memberships.value = JSON.parse(storedMemberships);
      }
      if (storedPlans) {
        plans.value = JSON.parse(storedPlans);
      } else {
        // Initialize with default plans
        plans.value = getDefaultPlans();
        savePlans();
      }
      if (storedCheckIns) {
        checkIns.value = JSON.parse(storedCheckIns);
      }

      // Check for expired memberships
      await checkExpirations();

      isInitialized.value = true;
    } catch (error) {
      console.error('Failed to initialize memberships:', error);
    } finally {
      isLoading.value = false;
    }
  }

  // ============================================
  // Default Plans
  // ============================================

  function getDefaultPlans(): MembershipPlan[] {
    return [
      {
        id: 'plan-day',
        name: 'Day Pass',
        nameLao: 'ບັດມື້',
        description: 'Single day access',
        duration: 1,
        price: 50000,
        benefits: ['Full gym access', 'Locker usage'],
        benefitsLao: ['ເຂົ້າຢິມເຕັມ', 'ໃຊ້ຕູ້ເກັບເຄື່ອງ'],
        isActive: true,
        sortOrder: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'plan-monthly',
        name: 'Monthly',
        nameLao: 'ລາຍເດືອນ',
        description: '30 days of unlimited access',
        duration: 30,
        price: 300000,
        benefits: ['Full gym access', 'Group classes', 'Locker'],
        benefitsLao: ['ເຂົ້າຢິມເຕັມ', 'ຫ້ອງຮຽນກຸ່ມ', 'ຕູ້ເກັບເຄື່ອງ'],
        isActive: true,
        sortOrder: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'plan-3month',
        name: '3 Months',
        nameLao: '3 ເດືອນ',
        description: '90 days - Save 15%',
        duration: 90,
        price: 750000,
        benefits: ['Full gym access', 'Group classes', 'Personal locker', '1 PT session'],
        benefitsLao: ['ເຂົ້າຢິມເຕັມ', 'ຫ້ອງຮຽນກຸ່ມ', 'ຕູ້ສ່ວນຕົວ', 'ຝຶກສ່ວນຕົວ 1 ຄັ້ງ'],
        isActive: true,
        sortOrder: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'plan-yearly',
        name: 'Yearly',
        nameLao: 'ລາຍປີ',
        description: '365 days - Best value',
        duration: 365,
        price: 2500000,
        benefits: ['Full gym access', 'All classes', 'Personal locker', '5 PT sessions', 'Guest passes'],
        benefitsLao: ['ເຂົ້າຢິມເຕັມ', 'ທຸກຫ້ອງຮຽນ', 'ຕູ້ສ່ວນຕົວ', 'ຝຶກສ່ວນຕົວ 5 ຄັ້ງ', 'ບັດເຊີນແຂກ'],
        isActive: true,
        sortOrder: 4,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  // ============================================
  // Persistence
  // ============================================

  function saveMemberships() {
    localStorage.setItem(MEMBERSHIPS_KEY, JSON.stringify(memberships.value));
  }

  function savePlans() {
    localStorage.setItem(MEMBERSHIP_PLANS_KEY, JSON.stringify(plans.value));
  }

  function saveCheckIns() {
    localStorage.setItem(CHECKINS_KEY, JSON.stringify(checkIns.value));
  }

  // ============================================
  // Membership CRUD
  // ============================================

  async function addMembership(data: Omit<Membership, 'id' | 'createdAt' | 'updatedAt' | 'checkInCount'>): Promise<Membership> {
    const now = new Date().toISOString();
    const membership: Membership = {
      ...data,
      id: `mem-${Date.now().toString(36)}`,
      checkInCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    memberships.value.push(membership);
    saveMemberships();

    toast.add({
      title: t('memberships.added') || 'Membership Added',
      icon: 'i-heroicons-check-circle',
      color: 'success',
    });

    return membership;
  }

  async function updateMembership(id: string, data: Partial<Membership>): Promise<Membership | null> {
    const index = memberships.value.findIndex((m) => m.id === id);
    if (index === -1) return null;

    memberships.value[index] = {
      ...memberships.value[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    saveMemberships();
    return memberships.value[index];
  }

  async function deleteMembership(id: string): Promise<boolean> {
    const index = memberships.value.findIndex((m) => m.id === id);
    if (index === -1) return false;

    memberships.value.splice(index, 1);
    saveMemberships();
    return true;
  }

  async function getMembershipByCustomer(customerId: string): Promise<Membership | null> {
    return memberships.value.find((m) => m.customerId === customerId && m.status === 'active') || null;
  }

  // ============================================
  // Check-in
  // ============================================

  async function checkIn(membershipId: string, notes?: string): Promise<MembershipCheckIn | null> {
    const membership = memberships.value.find((m) => m.id === membershipId);
    if (!membership) return null;

    if (membership.status !== 'active') {
      toast.add({
        title: t('memberships.notActive') || 'Membership Not Active',
        description: t('memberships.cannotCheckIn') || 'This membership is not active',
        icon: 'i-heroicons-exclamation-circle',
        color: 'warning',
      });
      return null;
    }

    // Check if max check-ins reached
    const plan = plans.value.find((p) => p.id === membership.planId);
    if (plan?.maxCheckIns && membership.checkInCount >= plan.maxCheckIns) {
      toast.add({
        title: t('memberships.maxReached') || 'Check-in Limit Reached',
        icon: 'i-heroicons-exclamation-triangle',
        color: 'error',
      });
      return null;
    }

    const now = new Date().toISOString();
    const checkIn: MembershipCheckIn = {
      id: `checkin-${Date.now().toString(36)}`,
      membershipId,
      customerId: membership.customerId,
      checkInTime: now,
      notes,
    };

    checkIns.value.push(checkIn);
    saveCheckIns();

    // Update membership
    membership.checkInCount++;
    membership.lastCheckIn = now;
    membership.updatedAt = now;
    saveMemberships();

    toast.add({
      title: t('memberships.checkedIn') || 'Checked In! ✅',
      description: membership.customerName || undefined,
      icon: 'i-heroicons-check-circle',
      color: 'success',
    });

    return checkIn;
  }

  // ============================================
  // Renewal
  // ============================================

  async function renewMembership(id: string, planId?: string): Promise<Membership | null> {
    const membership = memberships.value.find((m) => m.id === id);
    if (!membership) return null;

    const newPlanId = planId || membership.planId;
    const plan = plans.value.find((p) => p.id === newPlanId);
    if (!plan) return null;

    const now = new Date();
    const currentEnd = new Date(membership.endDate);
    const startDate = currentEnd > now ? currentEnd : now;
    const endDate = new Date(startDate.getTime() + plan.duration * 24 * 60 * 60 * 1000);

    membership.planId = newPlanId;
    membership.planName = plan.name;
    membership.startDate = startDate.toISOString();
    membership.endDate = endDate.toISOString();
    membership.status = 'active';
    membership.updatedAt = new Date().toISOString();

    saveMemberships();

    toast.add({
      title: t('memberships.renewed') || 'Membership Renewed',
      icon: 'i-heroicons-arrow-path',
      color: 'success',
    });

    return membership;
  }

  // ============================================
  // Expiration Check
  // ============================================

  async function checkExpirations(): Promise<void> {
    const now = new Date();
    let updated = false;

    for (const membership of memberships.value) {
      if (membership.status === 'active') {
        const endDate = new Date(membership.endDate);
        if (endDate < now) {
          membership.status = 'expired';
          membership.updatedAt = now.toISOString();
          updated = true;
        }
      }
    }

    if (updated) {
      saveMemberships();
    }
  }

  // ============================================
  // Plan CRUD
  // ============================================

  async function addPlan(data: Omit<MembershipPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<MembershipPlan> {
    const now = new Date().toISOString();
    const plan: MembershipPlan = {
      ...data,
      id: `plan-${Date.now().toString(36)}`,
      createdAt: now,
      updatedAt: now,
    };

    plans.value.push(plan);
    savePlans();
    return plan;
  }

  async function updatePlan(id: string, data: Partial<MembershipPlan>): Promise<MembershipPlan | null> {
    const index = plans.value.findIndex((p) => p.id === id);
    if (index === -1) return null;

    plans.value[index] = {
      ...plans.value[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    savePlans();
    return plans.value[index];
  }

  async function deletePlan(id: string): Promise<boolean> {
    // Don't delete if memberships use this plan
    const usedBy = memberships.value.filter((m) => m.planId === id);
    if (usedBy.length > 0) {
      toast.add({
        title: t('memberships.planInUse') || 'Plan In Use',
        description: t('memberships.cannotDeletePlan') || 'This plan has active memberships',
        icon: 'i-heroicons-exclamation-triangle',
        color: 'warning',
      });
      return false;
    }

    const index = plans.value.findIndex((p) => p.id === id);
    if (index === -1) return false;

    plans.value.splice(index, 1);
    savePlans();
    return true;
  }

  // ============================================
  // Search
  // ============================================

  function searchMemberships(query: string): Membership[] {
    const q = query.toLowerCase();
    return memberships.value.filter((m) =>
      m.customerName?.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q)
    );
  }

  // ============================================
  // Return
  // ============================================

  return {
    // State
    memberships: readonly(memberships),
    plans: readonly(plans),
    checkIns: readonly(checkIns),
    isLoading: readonly(isLoading),

    // Stats
    activeMemberships,
    expiringSoon,
    expiredMemberships,

    // Methods
    init,
    addMembership,
    updateMembership,
    deleteMembership,
    getMembershipByCustomer,
    checkIn,
    renewMembership,
    checkExpirations,
    addPlan,
    updatePlan,
    deletePlan,
    searchMemberships,
  };
}
