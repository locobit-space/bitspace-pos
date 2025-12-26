import { NOSTR_KINDS } from "~/types/nostr-kinds";

/**
 * 💸 Expense Management Composable
 * Handles expense CRUD with Nostr sync and accounting integration
 */

export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  vendor?: string;
  paymentMethod: string;
  reference?: string;
  notes?: string;
  receipt?: string;
  accountCode?: string;  // For double-entry accounting
  createdAt: string;
  updatedAt: string;
  synced: boolean;
}

export interface ExpenseFilter {
  category?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

const EXPENSE_CATEGORIES = [
  { value: 'rent', label: 'Rent', icon: 'i-heroicons-home', color: '#ef4444' },
  { value: 'utilities', label: 'Utilities', icon: 'i-heroicons-bolt', color: '#f97316' },
  { value: 'supplies', label: 'Supplies', icon: 'i-heroicons-cube', color: '#eab308' },
  { value: 'inventory', label: 'Inventory', icon: 'i-heroicons-archive-box', color: '#22c55e' },
  { value: 'marketing', label: 'Marketing', icon: 'i-heroicons-megaphone', color: '#3b82f6' },
  { value: 'salaries', label: 'Salaries', icon: 'i-heroicons-users', color: '#8b5cf6' },
  { value: 'equipment', label: 'Equipment', icon: 'i-heroicons-wrench', color: '#ec4899' },
  { value: 'maintenance', label: 'Maintenance', icon: 'i-heroicons-cog', color: '#06b6d4' },
  { value: 'insurance', label: 'Insurance', icon: 'i-heroicons-shield-check', color: '#64748b' },
  { value: 'transportation', label: 'Transportation', icon: 'i-heroicons-truck', color: '#84cc16' },
  { value: 'professional', label: 'Professional Services', icon: 'i-heroicons-briefcase', color: '#6366f1' },
  { value: 'other', label: 'Other', icon: 'i-heroicons-document', color: '#9ca3af' },
] as const;

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'lightning', label: 'Lightning' },
  { value: 'check', label: 'Check' },
] as const;

// Global state
const expenses = ref<Expense[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const syncPending = ref(0);

export function useExpenses() {
  const accounting = useAccounting();
  const offline = useOffline();

  // ============================================
  // 📊 COMPUTED
  // ============================================

  const stats = computed(() => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const total = expenses.value.reduce((sum, e) => sum + e.amount, 0);
    const thisMonth = expenses.value
      .filter(e => new Date(e.date) >= thisMonthStart)
      .reduce((sum, e) => sum + e.amount, 0);
    const lastMonth = expenses.value
      .filter(e => new Date(e.date) >= lastMonthStart && new Date(e.date) < thisMonthStart)
      .reduce((sum, e) => sum + e.amount, 0);

    const categories = new Set(expenses.value.map(e => e.category));

    return {
      totalExpenses: total,
      thisMonth,
      lastMonth,
      monthlyChange: lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0,
      expenseCount: expenses.value.length,
      categoryCount: categories.size,
    };
  });

  const expensesByCategory = computed(() => {
    const categoryTotals = new Map<string, number>();

    expenses.value.forEach(e => {
      const current = categoryTotals.get(e.category) || 0;
      categoryTotals.set(e.category, current + e.amount);
    });

    return Array.from(categoryTotals.entries())
      .map(([name, value]) => ({
        name,
        value,
        color: EXPENSE_CATEGORIES.find(c => c.value === name)?.color || '#9ca3af',
      }))
      .sort((a, b) => b.value - a.value);
  });

  // ============================================
  // 🔄 NOSTR SYNC
  // ============================================

  async function loadFromNostr(): Promise<void> {
    // TODO: Implement Nostr sync when nostrData.fetchEvents is available
    console.log('[Expenses] Nostr sync not yet implemented, using localStorage');
    loadFromLocal();
  }

  function loadFromLocal(): void {
    try {
      const saved = localStorage.getItem('pos_expenses');
      if (saved) {
        expenses.value = JSON.parse(saved);
      }
    } catch (e) {
      console.error('[Expenses] Failed to load from localStorage:', e);
    }
  }

  function saveToLocal(): void {
    try {
      localStorage.setItem('pos_expenses', JSON.stringify(expenses.value));
    } catch (e) {
      console.error('[Expenses] Failed to save to localStorage:', e);
    }
  }

  async function syncToNostr(_expense: Expense): Promise<boolean> {
    // TODO: Implement Nostr publish when available
    console.log('[Expenses] Nostr sync pending implementation');
    return false;
  }

  // ============================================
  // 📝 CRUD OPERATIONS
  // ============================================

  async function createExpense(data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'synced'>): Promise<Expense | null> {
    try {
      isLoading.value = true;
      error.value = null;

      const now = new Date().toISOString();
      const expense: Expense = {
        ...data,
        id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: now,
        updatedAt: now,
        synced: false,
      };

      expenses.value.push(expense);
      saveToLocal();

      // Sync to Nostr
      if (offline.isOnline.value) {
        const synced = await syncToNostr(expense);
        if (synced) {
          expense.synced = true;
          saveToLocal();
        } else {
          syncPending.value++;
        }
      } else {
        syncPending.value++;
      }

      // Create accounting journal entry
      try {
        // Use operating expenses account code based on standard
        const defaultAccountCode = accounting.currentStandard.value === 'lao' ? '5100' : '60100';
        await accounting.createExpenseEntry(
          expense.description,
          expense.amount,
          data.accountCode || defaultAccountCode,
          expense.paymentMethod,
          expense.id
        );
      } catch (e) {
        console.warn('[Expenses] Failed to create accounting entry:', e);
      }

      return expense;
    } catch (e) {
      console.error('[Expenses] Failed to create expense:', e);
      error.value = 'Failed to create expense';
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateExpense(id: string, updates: Partial<Expense>): Promise<Expense | null> {
    try {
      const index = expenses.value.findIndex(e => e.id === id);
      if (index === -1) {
        error.value = 'Expense not found';
        return null;
      }

      const updated: Expense = {
        ...expenses.value[index]!,
        ...updates,
        updatedAt: new Date().toISOString(),
        synced: false,
      };

      expenses.value[index] = updated;
      saveToLocal();

      // Sync to Nostr
      if (offline.isOnline.value) {
        const synced = await syncToNostr(updated);
        if (synced) {
          updated.synced = true;
          saveToLocal();
        }
      }

      return updated;
    } catch (e) {
      console.error('[Expenses] Failed to update expense:', e);
      error.value = 'Failed to update expense';
      return null;
    }
  }

  async function deleteExpense(id: string): Promise<boolean> {
    try {
      const index = expenses.value.findIndex(e => e.id === id);
      if (index === -1) return false;

      expenses.value.splice(index, 1);
      saveToLocal();

      // TODO: Publish deletion event to Nostr

      return true;
    } catch (e) {
      console.error('[Expenses] Failed to delete expense:', e);
      error.value = 'Failed to delete expense';
      return false;
    }
  }

  // ============================================
  // 🔍 FILTER & SEARCH
  // ============================================

  function filterExpenses(filter: ExpenseFilter): Expense[] {
    let result = [...expenses.value];

    if (filter.category) {
      result = result.filter(e => e.category === filter.category);
    }

    if (filter.startDate) {
      result = result.filter(e => e.date >= filter.startDate!);
    }

    if (filter.endDate) {
      result = result.filter(e => e.date <= filter.endDate!);
    }

    if (filter.search) {
      const query = filter.search.toLowerCase();
      result = result.filter(e =>
        e.description.toLowerCase().includes(query) ||
        e.vendor?.toLowerCase().includes(query) ||
        e.category.toLowerCase().includes(query)
      );
    }

    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // ============================================
  // 📤 EXPORT
  // ============================================

  function exportToCSV(filter?: ExpenseFilter): string {
    const data = filter ? filterExpenses(filter) : expenses.value;

    const headers = ['Date', 'Category', 'Description', 'Amount', 'Vendor', 'Payment Method', 'Reference'];
    const rows = data.map(e => [
      e.date,
      e.category,
      `"${e.description}"`,
      e.amount,
      e.vendor || '',
      e.paymentMethod,
      e.reference || '',
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  // ============================================
  // 🔧 HELPERS
  // ============================================

  function getCategoryInfo(category: string) {
    return EXPENSE_CATEGORIES.find(c => c.value === category) || EXPENSE_CATEGORIES.find(c => c.value === 'other')!;
  }

  // ============================================
  // 🚀 INIT
  // ============================================

  async function init(): Promise<void> {
    if (expenses.value.length === 0) {
      loadFromLocal();
    }

    if (offline.isOnline.value) {
      await loadFromNostr();
    }
  }

  return {
    // State
    expenses: readonly(expenses),
    isLoading: readonly(isLoading),
    error: readonly(error),
    syncPending: readonly(syncPending),

    // Computed
    stats,
    expensesByCategory,

    // CRUD
    createExpense,
    updateExpense,
    deleteExpense,

    // Filter & Search
    filterExpenses,

    // Export
    exportToCSV,

    // Helpers
    getCategoryInfo,
    EXPENSE_CATEGORIES,
    PAYMENT_METHODS,

    // Init
    init,
    loadFromNostr,
  };
}
