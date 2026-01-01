// ============================================
// 📋 CONTRACTS COMPOSABLE
// Contract Management & Asset Rentals
// ============================================

import type {
  Contract,
  ContractType,
  ContractStatus,
  RentalAsset,
  AssetType,
  RentalBooking,
  CurrencyCode,
} from '~/types';

// Singleton state
const contracts = ref<Contract[]>([]);
const assets = ref<RentalAsset[]>([]);
const bookings = ref<RentalBooking[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

// Counter for contract numbers
let contractCounter = 1;
let bookingCounter = 1;

export function useContracts() {
  // ============================================
  // Computed
  // ============================================

  const activeContracts = computed(() =>
    contracts.value.filter(c => c.status === 'active')
  );

  const draftContracts = computed(() =>
    contracts.value.filter(c => c.status === 'draft')
  );

  const expiredContracts = computed(() =>
    contracts.value.filter(c => c.status === 'expired')
  );

  const expiringContracts = computed(() => {
    const inOneWeek = new Date();
    inOneWeek.setDate(inOneWeek.getDate() + 7);
    return contracts.value.filter(c => {
      if (c.status !== 'active') return false;
      return new Date(c.endDate) <= inOneWeek;
    });
  });

  const availableAssets = computed(() =>
    assets.value.filter(a => a.isAvailable && a.isActive)
  );

  const todayBookings = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return bookings.value.filter(b => b.startTime.startsWith(today));
  });

  // Stats
  const stats = computed(() => ({
    totalContracts: contracts.value.length,
    activeCount: activeContracts.value.length,
    draftCount: draftContracts.value.length,
    expiringCount: expiringContracts.value.length,
    totalAssets: assets.value.filter(a => a.isActive).length,
    availableAssets: availableAssets.value.length,
    todayBookings: todayBookings.value.length,
    pendingDeposits: contracts.value.filter(c => c.depositStatus === 'pending').length,
    monthlyRevenue: activeContracts.value
      .filter(c => c.paymentSchedule === 'monthly')
      .reduce((sum, c) => sum + c.amount, 0),
  }));

  // ============================================
  // Initialize
  // ============================================

  async function init() {
    isLoading.value = true;
    error.value = null;
    try {
      const storedContracts = localStorage.getItem('bitspace_contracts');
      const storedAssets = localStorage.getItem('bitspace_rental_assets');
      const storedBookings = localStorage.getItem('bitspace_rental_bookings');
      const storedCounters = localStorage.getItem('bitspace_contract_counters');

      if (storedContracts) contracts.value = JSON.parse(storedContracts);
      if (storedAssets) assets.value = JSON.parse(storedAssets);
      if (storedBookings) bookings.value = JSON.parse(storedBookings);
      if (storedCounters) {
        const counters = JSON.parse(storedCounters);
        contractCounter = counters.contract || 1;
        bookingCounter = counters.booking || 1;
      }

      // Check for expired contracts
      await checkExpirations();
    } catch (e) {
      console.error('Error loading contracts:', e);
      error.value = String(e);
    } finally {
      isLoading.value = false;
    }
  }

  // ============================================
  // Persistence
  // ============================================

  function saveToStorage() {
    localStorage.setItem('bitspace_contracts', JSON.stringify(contracts.value));
    localStorage.setItem('bitspace_rental_assets', JSON.stringify(assets.value));
    localStorage.setItem('bitspace_rental_bookings', JSON.stringify(bookings.value));
    localStorage.setItem('bitspace_contract_counters', JSON.stringify({
      contract: contractCounter,
      booking: bookingCounter,
    }));
  }

  // ============================================
  // Contract CRUD
  // ============================================

  function generateContractId(): string {
    return `con_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  function generateContractNumber(): string {
    const year = new Date().getFullYear();
    const number = String(contractCounter++).padStart(5, '0');
    return `CTR-${year}-${number}`;
  }

  async function createContract(data: {
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    customerAddress?: string;
    customerId?: string;
    type: ContractType;
    assetId?: string;
    startDate: string;
    endDate: string;
    amount: number;
    paymentSchedule: Contract['paymentSchedule'];
    depositAmount?: number;
    autoRenew?: boolean;
    description?: string;
    notes?: string;
    terms?: string;
    currency?: CurrencyCode;
  }): Promise<Contract> {
    const now = new Date().toISOString();
    const asset = data.assetId ? assets.value.find(a => a.id === data.assetId) : undefined;

    const contract: Contract = {
      id: generateContractId(),
      contractNumber: generateContractNumber(),
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail,
      customerAddress: data.customerAddress,
      type: data.type,
      status: 'draft',
      assetId: data.assetId,
      asset,
      startDate: data.startDate,
      endDate: data.endDate,
      amount: data.amount,
      paymentSchedule: data.paymentSchedule,
      currency: data.currency || 'LAK',
      depositAmount: data.depositAmount,
      depositStatus: data.depositAmount ? 'pending' : undefined,
      autoRenew: data.autoRenew || false,
      description: data.description,
      notes: data.notes,
      terms: data.terms,
      createdAt: now,
      updatedAt: now,
    };

    contracts.value.unshift(contract);
    saveToStorage();
    return contract;
  }

  async function updateContract(id: string, updates: Partial<Contract>): Promise<Contract | null> {
    const index = contracts.value.findIndex(c => c.id === id);
    if (index === -1) return null;

    contracts.value[index] = {
      ...contracts.value[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    saveToStorage();
    return contracts.value[index];
  }

  async function activateContract(id: string): Promise<Contract | null> {
    return updateContract(id, {
      status: 'active',
      activatedAt: new Date().toISOString(),
    });
  }

  async function terminateContract(id: string, reason?: string): Promise<Contract | null> {
    const contract = getContract(id);
    if (!contract) return null;

    // Release asset if attached
    if (contract.assetId) {
      await updateAssetAvailability(contract.assetId, true);
    }

    return updateContract(id, {
      status: 'terminated',
      terminatedAt: new Date().toISOString(),
      terminationReason: reason,
    });
  }

  async function renewContract(id: string, newEndDate?: string): Promise<Contract | null> {
    const contract = getContract(id);
    if (!contract) return null;

    // Calculate new end date based on payment schedule
    let endDate = newEndDate;
    if (!endDate) {
      const current = new Date(contract.endDate);
      switch (contract.paymentSchedule) {
        case 'daily':
          current.setDate(current.getDate() + 1);
          break;
        case 'weekly':
          current.setDate(current.getDate() + 7);
          break;
        case 'monthly':
          current.setMonth(current.getMonth() + 1);
          break;
        case 'yearly':
          current.setFullYear(current.getFullYear() + 1);
          break;
        default:
          current.setMonth(current.getMonth() + 1);
      }
      endDate = current.toISOString();
    }

    return updateContract(id, {
      endDate,
      status: 'active',
    });
  }

  async function collectDeposit(id: string): Promise<Contract | null> {
    return updateContract(id, {
      depositStatus: 'collected',
      depositPaidAt: new Date().toISOString(),
    });
  }

  async function returnDeposit(id: string): Promise<Contract | null> {
    return updateContract(id, {
      depositStatus: 'returned',
      depositReturnedAt: new Date().toISOString(),
    });
  }

  async function deleteContract(id: string): Promise<boolean> {
    const index = contracts.value.findIndex(c => c.id === id);
    if (index === -1) return false;

    contracts.value.splice(index, 1);
    saveToStorage();
    return true;
  }

  function getContract(id: string): Contract | undefined {
    return contracts.value.find(c => c.id === id);
  }

  async function checkExpirations(): Promise<void> {
    const now = new Date();
    contracts.value.forEach((contract, index) => {
      if (contract.status === 'active' && new Date(contract.endDate) < now) {
        if (contract.autoRenew) {
          renewContract(contract.id);
        } else {
          contracts.value[index].status = 'expired';
        }
      }
    });
    saveToStorage();
  }

  // ============================================
  // Asset CRUD
  // ============================================

  function generateAssetId(): string {
    return `ast_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  async function addAsset(data: Omit<RentalAsset, 'id' | 'createdAt' | 'updatedAt' | 'isAvailable' | 'isActive'>): Promise<RentalAsset> {
    const now = new Date().toISOString();
    const asset: RentalAsset = {
      ...data,
      id: generateAssetId(),
      isAvailable: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    assets.value.push(asset);
    saveToStorage();
    return asset;
  }

  async function updateAsset(id: string, updates: Partial<RentalAsset>): Promise<RentalAsset | null> {
    const index = assets.value.findIndex(a => a.id === id);
    if (index === -1) return null;

    assets.value[index] = {
      ...assets.value[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    saveToStorage();
    return assets.value[index];
  }

  async function updateAssetAvailability(id: string, isAvailable: boolean): Promise<void> {
    await updateAsset(id, { isAvailable });
  }

  async function deleteAsset(id: string): Promise<boolean> {
    const index = assets.value.findIndex(a => a.id === id);
    if (index === -1) return false;

    // Soft delete
    assets.value[index].isActive = false;
    saveToStorage();
    return true;
  }

  function getAsset(id: string): RentalAsset | undefined {
    return assets.value.find(a => a.id === id);
  }

  function getAssetsByType(type: AssetType): RentalAsset[] {
    return assets.value.filter(a => a.type === type && a.isActive);
  }

  function getAvailableAssets(startTime?: string, endTime?: string): RentalAsset[] {
    if (!startTime || !endTime) return availableAssets.value;

    // Check for booking conflicts
    const conflictingAssetIds = bookings.value
      .filter(b => {
        if (b.status === 'cancelled' || b.status === 'returned') return false;
        const bStart = new Date(b.startTime).getTime();
        const bEnd = new Date(b.endTime).getTime();
        const start = new Date(startTime).getTime();
        const end = new Date(endTime).getTime();
        return (start < bEnd && end > bStart);
      })
      .map(b => b.assetId);

    return assets.value.filter(a =>
      a.isActive && a.isAvailable && !conflictingAssetIds.includes(a.id)
    );
  }

  // ============================================
  // Booking CRUD
  // ============================================

  function generateBookingId(): string {
    return `bkg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  function generateBookingNumber(): string {
    const date = new Date();
    const dateStr = `${date.getMonth() + 1}${date.getDate()}`;
    const number = String(bookingCounter++).padStart(4, '0');
    return `BK${dateStr}-${number}`;
  }

  async function createBooking(data: {
    assetId: string;
    customerName: string;
    customerPhone?: string;
    customerId?: string;
    contractId?: string;
    startTime: string;
    endTime: string;
    totalAmount: number;
    depositAmount?: number;
    notes?: string;
  }): Promise<RentalBooking> {
    const asset = getAsset(data.assetId);

    const booking: RentalBooking = {
      id: generateBookingId(),
      bookingNumber: generateBookingNumber(),
      assetId: data.assetId,
      asset,
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      contractId: data.contractId,
      startTime: data.startTime,
      endTime: data.endTime,
      status: 'reserved',
      totalAmount: data.totalAmount,
      depositAmount: data.depositAmount,
      notes: data.notes,
      createdAt: new Date().toISOString(),
    };

    bookings.value.unshift(booking);
    saveToStorage();
    return booking;
  }

  async function checkOutBooking(id: string): Promise<RentalBooking | null> {
    const index = bookings.value.findIndex(b => b.id === id);
    if (index === -1) return null;

    const now = new Date().toISOString();
    bookings.value[index] = {
      ...bookings.value[index],
      status: 'checked_out',
      checkedOutAt: now,
      actualStartTime: now,
      updatedAt: now,
    };

    // Mark asset as unavailable
    await updateAssetAvailability(bookings.value[index].assetId, false);

    saveToStorage();
    return bookings.value[index];
  }

  async function returnBooking(id: string, condition?: string): Promise<RentalBooking | null> {
    const index = bookings.value.findIndex(b => b.id === id);
    if (index === -1) return null;

    const now = new Date().toISOString();
    const booking = bookings.value[index];

    // Calculate late fee if applicable
    let lateFee = 0;
    if (booking.actualStartTime && new Date(now) > new Date(booking.endTime)) {
      const asset = getAsset(booking.assetId);
      if (asset?.hourlyRate) {
        const hoursLate = Math.ceil(
          (new Date(now).getTime() - new Date(booking.endTime).getTime()) / (1000 * 60 * 60)
        );
        lateFee = hoursLate * asset.hourlyRate;
      }
    }

    bookings.value[index] = {
      ...booking,
      status: 'returned',
      returnedAt: now,
      actualEndTime: now,
      returnCondition: condition,
      lateFee,
      updatedAt: now,
    };

    // Mark asset as available
    await updateAssetAvailability(booking.assetId, true);

    saveToStorage();
    return bookings.value[index];
  }

  async function cancelBooking(id: string): Promise<RentalBooking | null> {
    const index = bookings.value.findIndex(b => b.id === id);
    if (index === -1) return null;

    bookings.value[index] = {
      ...bookings.value[index],
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    };

    saveToStorage();
    return bookings.value[index];
  }

  function getBooking(id: string): RentalBooking | undefined {
    return bookings.value.find(b => b.id === id);
  }

  function getBookingsByDate(date: Date): RentalBooking[] {
    const dateStr = date.toISOString().split('T')[0];
    return bookings.value.filter(b =>
      b.startTime.startsWith(dateStr) || b.endTime.startsWith(dateStr)
    );
  }

  function getBookingsByAsset(assetId: string): RentalBooking[] {
    return bookings.value.filter(b => b.assetId === assetId);
  }

  // ============================================
  // Search & Filter
  // ============================================

  function searchContracts(query: string): Contract[] {
    const q = query.toLowerCase();
    return contracts.value.filter(c =>
      c.contractNumber.toLowerCase().includes(q) ||
      c.customerName.toLowerCase().includes(q) ||
      c.customerPhone?.includes(q) ||
      c.asset?.name.toLowerCase().includes(q)
    );
  }

  function getContractsByStatus(status: ContractStatus): Contract[] {
    return contracts.value.filter(c => c.status === status);
  }

  function getContractsByCustomer(customerId: string): Contract[] {
    return contracts.value.filter(c => c.customerId === customerId);
  }

  // ============================================
  // Return
  // ============================================

  return {
    // State
    contracts,
    assets,
    bookings,
    isLoading,
    error,
    // Computed
    activeContracts,
    draftContracts,
    expiredContracts,
    expiringContracts,
    availableAssets,
    todayBookings,
    stats,
    // Methods
    init,
    // Contract
    createContract,
    updateContract,
    activateContract,
    terminateContract,
    renewContract,
    collectDeposit,
    returnDeposit,
    deleteContract,
    getContract,
    searchContracts,
    getContractsByStatus,
    getContractsByCustomer,
    checkExpirations,
    // Asset
    addAsset,
    updateAsset,
    deleteAsset,
    getAsset,
    getAssetsByType,
    getAvailableAssets,
    // Booking
    createBooking,
    checkOutBooking,
    returnBooking,
    cancelBooking,
    getBooking,
    getBookingsByDate,
    getBookingsByAsset,
  };
}
