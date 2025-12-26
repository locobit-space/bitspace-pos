// ============================================
// 💰 ACCOUNTING COMPOSABLE
// Auto Double-Entry Accounting Engine
// Supports Global (IFRS) and Lao Standards
// ============================================

import { ref, computed } from 'vue';
import { db } from '~/db/db';
import type { Order } from '~/types';
import type {
  Account,
  JournalEntry,
  JournalEntryLine,
  JournalEntryStatus,
  AccountingSettings,
  AccountingStandard,
  AccountCodeMapping,
} from '~/types/accounting';
import {
  LAO_CHART_OF_ACCOUNTS,
  GLOBAL_CHART_OF_ACCOUNTS,
  getAccountMapping,
  getDefaultChartOfAccounts,
} from '~/types/accounting';
import { NOSTR_KINDS } from '~/types/nostr-kinds';

// ============================================
// SINGLETON STATE
// ============================================

const accounts = ref<Account[]>([]);
const journalEntries = ref<JournalEntry[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

// Default settings
const settings = ref<AccountingSettings>({
  standard: 'lao',
  fiscalYearStart: '01-01',
  defaultCurrency: 'LAK',
  vatRate: 0.10, // 10% VAT
  vatAccountCode: '2200',
  retainedEarningsCode: '3200',
  autoPostJournals: true,
  requireApproval: false,
});

// ============================================
// COMPOSABLE
// ============================================

export function useAccounting() {
  const nostrData = useNostrData();

  // ============================================
  // COMPUTED
  // ============================================

  const currentStandard = computed(() => settings.value.standard);
  const accountMapping = computed(() => getAccountMapping(settings.value.standard));
  
  const activeAccounts = computed(() => 
    accounts.value.filter(a => a.isActive)
  );

  const accountsByType = computed(() => {
    const grouped: Record<string, Account[]> = {
      asset: [],
      liability: [],
      equity: [],
      revenue: [],
      expense: [],
    };
    activeAccounts.value.forEach(account => {
      grouped[account.type]?.push(account);
    });
    return grouped;
  });

  const postedEntries = computed(() =>
    journalEntries.value.filter(e => e.status === 'posted')
  );

  // ============================================
  // INITIALIZATION
  // ============================================

  async function init(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      // Load settings from localStorage
      if (import.meta.client) {
        const stored = localStorage.getItem('accountingSettings');
        if (stored) {
          settings.value = { ...settings.value, ...JSON.parse(stored) };
        }
      }

      // Load accounts from Dexie (if table exists) or use defaults
      await loadAccounts();
      await loadJournalEntries();

      // If no accounts, initialize with defaults
      if (accounts.value.length === 0) {
        await initializeDefaultAccounts();
      }
    } catch (e) {
      error.value = `Failed to initialize accounting: ${e}`;
      console.error(error.value);
    } finally {
      isLoading.value = false;
    }
  }

  async function loadAccounts(): Promise<void> {
    // For now, load from localStorage (can migrate to Dexie/Nostr later)
    if (import.meta.client) {
      const stored = localStorage.getItem('chartOfAccounts');
      if (stored) {
        accounts.value = JSON.parse(stored);
      }
    }
  }

  async function loadJournalEntries(): Promise<void> {
    if (import.meta.client) {
      const stored = localStorage.getItem('journalEntries');
      if (stored) {
        journalEntries.value = JSON.parse(stored);
      }
    }
  }

  async function initializeDefaultAccounts(): Promise<void> {
    const defaults = getDefaultChartOfAccounts(settings.value.standard);
    const now = new Date().toISOString();
    
    accounts.value = defaults.map(acc => ({
      ...acc,
      createdAt: now,
      updatedAt: now,
    }));

    await saveAccounts();
  }

  async function saveAccounts(): Promise<void> {
    if (import.meta.client) {
      localStorage.setItem('chartOfAccounts', JSON.stringify(accounts.value));
    }
  }

  async function saveJournalEntries(): Promise<void> {
    if (import.meta.client) {
      localStorage.setItem('journalEntries', JSON.stringify(journalEntries.value));
    }
  }

  // ============================================
  // SETTINGS MANAGEMENT
  // ============================================

  async function updateSettings(newSettings: Partial<AccountingSettings>): Promise<void> {
    const oldStandard = settings.value.standard;
    settings.value = { ...settings.value, ...newSettings };

    if (import.meta.client) {
      localStorage.setItem('accountingSettings', JSON.stringify(settings.value));
    }

    // If standard changed, reload default accounts
    if (newSettings.standard && newSettings.standard !== oldStandard) {
      await initializeDefaultAccounts();
    }
  }

  function switchStandard(standard: AccountingStandard): Promise<void> {
    return updateSettings({ 
      standard,
      vatAccountCode: standard === 'lao' ? '2200' : '21000',
      retainedEarningsCode: standard === 'lao' ? '3200' : '32000',
    });
  }

  // ============================================
  // ACCOUNT MANAGEMENT
  // ============================================

  function getAccount(code: string): Account | undefined {
    return accounts.value.find(a => a.code === code);
  }

  async function addAccount(account: Omit<Account, 'createdAt' | 'updatedAt'>): Promise<Account> {
    const now = new Date().toISOString();
    const newAccount: Account = {
      ...account,
      createdAt: now,
      updatedAt: now,
    };
    
    accounts.value.push(newAccount);
    await saveAccounts();
    return newAccount;
  }

  async function updateAccount(code: string, updates: Partial<Account>): Promise<Account | null> {
    const index = accounts.value.findIndex(a => a.code === code);
    if (index === -1) return null;

    accounts.value[index] = {
      ...accounts.value[index]!,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await saveAccounts();
    return accounts.value[index]!;
  }

  // ============================================
  // JOURNAL ENTRY CREATION
  // ============================================

  function generateEntryNumber(): string {
    const year = new Date().getFullYear();
    const count = journalEntries.value.filter(e => 
      e.entryNumber.includes(`JE-${year}`)
    ).length + 1;
    return `JE-${year}-${count.toString().padStart(4, '0')}`;
  }

  async function createJournalEntry(
    description: string,
    lines: Omit<JournalEntryLine, 'id'>[],
    options?: {
      sourceType?: JournalEntry['sourceType'];
      sourceId?: string;
      date?: string;
      autoPost?: boolean;
    }
  ): Promise<JournalEntry | null> {
    // Validate: total debit must equal total credit
    const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    if (!isBalanced) {
      console.error('Journal entry not balanced:', { totalDebit, totalCredit });
      return null;
    }

    const now = new Date().toISOString();
    const shouldPost = options?.autoPost ?? settings.value.autoPostJournals;

    const entry: JournalEntry = {
      id: `je_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      entryNumber: generateEntryNumber(),
      date: options?.date || now.split('T')[0]!,
      description,
      lines: lines.map((l, i) => ({
        ...l,
        id: `line_${i + 1}`,
      })),
      status: shouldPost ? 'posted' : 'draft',
      sourceType: options?.sourceType,
      sourceId: options?.sourceId,
      createdAt: now,
      postedAt: shouldPost ? now : undefined,
      totalDebit,
      totalCredit,
      isBalanced,
    };

    journalEntries.value.unshift(entry);
    await saveJournalEntries();

    // Sync to Nostr
    try {
      await nostrData.publishReplaceableEvent(
        NOSTR_KINDS.JOURNAL_ENTRY,
        entry,
        entry.id
      );
    } catch (e) {
      console.warn('Failed to sync journal entry to Nostr:', e);
    }

    return entry;
  }

  // ============================================
  // AUTO JOURNAL ENTRY GENERATORS
  // ============================================

  /**
   * Create journal entry for a completed POS sale
   */
  async function createSalesJournalEntry(order: Order): Promise<JournalEntry | null> {
    const mapping = accountMapping.value;
    const vatRate = settings.value.vatRate;
    const currency = order.currency || settings.value.defaultCurrency;

    // Calculate amounts
    const totalWithVat = order.total;
    const netAmount = Math.round(totalWithVat / (1 + vatRate));
    const vatAmount = totalWithVat - netAmount;

    // Determine cash account based on payment method
    let cashAccount = mapping.cashLak;
    if (order.paymentMethod === 'lightning' || order.paymentMethod === 'bolt12') {
      cashAccount = mapping.lightning;
    } else if (order.paymentMethod === 'bank_transfer') {
      cashAccount = mapping.bankBcel; // Default to BCEL for bank transfers
    }

    const cashAccountInfo = getAccount(cashAccount);
    const salesAccountInfo = getAccount(mapping.salesRevenue);
    const vatAccountInfo = getAccount(mapping.vatPayable);

    const lines: Omit<JournalEntryLine, 'id'>[] = [
      // Debit: Cash/Lightning
      {
        accountCode: cashAccount,
        accountName: cashAccountInfo?.name || 'Cash',
        description: `Payment received - ${order.paymentMethod}`,
        debit: totalWithVat,
        credit: 0,
        currencyCode: currency,
      },
      // Credit: Sales Revenue (net of VAT)
      {
        accountCode: mapping.salesRevenue,
        accountName: salesAccountInfo?.name || 'Sales Revenue',
        description: `Sale #${order.id}`,
        debit: 0,
        credit: netAmount,
        currencyCode: currency,
      },
    ];

    // Credit: VAT Payable (if VAT applies)
    if (vatAmount > 0) {
      lines.push({
        accountCode: mapping.vatPayable,
        accountName: vatAccountInfo?.name || 'VAT Payable',
        description: `VAT @ ${vatRate * 100}%`,
        debit: 0,
        credit: vatAmount,
        currencyCode: currency,
      });
    }

    return createJournalEntry(
      `POS Sale #${order.id} - ${order.customer}`,
      lines,
      {
        sourceType: 'order',
        sourceId: order.id,
        date: order.date.split('T')[0],
      }
    );
  }

  /**
   * Create journal entry for stock adjustment
   */
  async function createStockAdjustmentEntry(
    productName: string,
    quantity: number,
    costPerUnit: number,
    adjustmentType: 'loss' | 'gain' | 'write_off',
    adjustmentId: string
  ): Promise<JournalEntry | null> {
    const mapping = accountMapping.value;
    const totalCost = Math.abs(quantity * costPerUnit);
    const currency = settings.value.defaultCurrency;

    const inventoryAccount = getAccount(mapping.inventory);
    const lossAccount = getAccount(mapping.inventoryLoss);

    let lines: Omit<JournalEntryLine, 'id'>[] = [];

    if (adjustmentType === 'loss' || adjustmentType === 'write_off') {
      // Inventory decreased (loss)
      lines = [
        {
          accountCode: mapping.inventoryLoss,
          accountName: lossAccount?.name || 'Inventory Loss',
          description: `${productName} - ${adjustmentType} (${quantity} units)`,
          debit: totalCost,
          credit: 0,
          currencyCode: currency,
        },
        {
          accountCode: mapping.inventory,
          accountName: inventoryAccount?.name || 'Inventory',
          description: `${productName} adjustment`,
          debit: 0,
          credit: totalCost,
          currencyCode: currency,
        },
      ];
    } else if (adjustmentType === 'gain') {
      // Inventory increased (found items)
      lines = [
        {
          accountCode: mapping.inventory,
          accountName: inventoryAccount?.name || 'Inventory',
          description: `${productName} - found (${quantity} units)`,
          debit: totalCost,
          credit: 0,
          currencyCode: currency,
        },
        {
          accountCode: mapping.inventoryLoss,
          accountName: lossAccount?.name || 'Inventory Loss',
          description: `${productName} reversal`,
          debit: 0,
          credit: totalCost,
          currencyCode: currency,
        },
      ];
    }

    return createJournalEntry(
      `Stock Adjustment: ${productName}`,
      lines,
      {
        sourceType: 'stock_adjustment',
        sourceId: adjustmentId,
      }
    );
  }

  /**
   * Create journal entry for membership payment
   */
  async function createMembershipEntry(
    memberName: string,
    amount: number,
    membershipMonths: number,
    membershipId: string,
    paymentMethod: string = 'cash'
  ): Promise<JournalEntry | null> {
    const mapping = accountMapping.value;
    const currency = settings.value.defaultCurrency;

    // Determine cash account
    let cashAccount = mapping.cashLak;
    if (paymentMethod === 'lightning') {
      cashAccount = mapping.lightning;
    } else if (paymentMethod === 'bank_transfer') {
      cashAccount = mapping.bankBcel;
    }

    const cashAccountInfo = getAccount(cashAccount);
    const deferredAccount = getAccount(mapping.deferredRevenue);

    // Membership payments go to deferred revenue first
    // Then recognized monthly (requires separate recognition entries)
    const lines: Omit<JournalEntryLine, 'id'>[] = [
      {
        accountCode: cashAccount,
        accountName: cashAccountInfo?.name || 'Cash',
        description: `Membership payment - ${memberName}`,
        debit: amount,
        credit: 0,
        currencyCode: currency,
      },
      {
        accountCode: mapping.deferredRevenue,
        accountName: deferredAccount?.name || 'Deferred Revenue',
        description: `${membershipMonths} month membership - ${memberName}`,
        debit: 0,
        credit: amount,
        currencyCode: currency,
      },
    ];

    return createJournalEntry(
      `Membership: ${memberName} (${membershipMonths} months)`,
      lines,
      {
        sourceType: 'membership',
        sourceId: membershipId,
      }
    );
  }

  /**
   * Create monthly membership revenue recognition entry
   */
  async function recognizeMembershipRevenue(
    memberName: string,
    monthlyAmount: number,
    membershipId: string
  ): Promise<JournalEntry | null> {
    const mapping = accountMapping.value;
    const currency = settings.value.defaultCurrency;

    const deferredAccount = getAccount(mapping.deferredRevenue);
    const revenueAccount = getAccount(mapping.membershipRevenue);

    const lines: Omit<JournalEntryLine, 'id'>[] = [
      {
        accountCode: mapping.deferredRevenue,
        accountName: deferredAccount?.name || 'Deferred Revenue',
        description: `Monthly recognition - ${memberName}`,
        debit: monthlyAmount,
        credit: 0,
        currencyCode: currency,
      },
      {
        accountCode: mapping.membershipRevenue,
        accountName: revenueAccount?.name || 'Membership Revenue',
        description: `${memberName} monthly fee`,
        debit: 0,
        credit: monthlyAmount,
        currencyCode: currency,
      },
    ];

    return createJournalEntry(
      `Membership Recognition: ${memberName}`,
      lines,
      {
        sourceType: 'membership',
        sourceId: membershipId,
      }
    );
  }

  /**
   * Create journal entry for expense
   */
  async function createExpenseEntry(
    description: string,
    amount: number,
    expenseAccountCode: string,
    paymentMethod: string = 'cash',
    expenseId?: string
  ): Promise<JournalEntry | null> {
    const mapping = accountMapping.value;
    const currency = settings.value.defaultCurrency;

    let cashAccount = mapping.cashLak;
    if (paymentMethod === 'bank_transfer') {
      cashAccount = mapping.bankBcel;
    }

    const cashAccountInfo = getAccount(cashAccount);
    const expenseAccount = getAccount(expenseAccountCode);

    const lines: Omit<JournalEntryLine, 'id'>[] = [
      {
        accountCode: expenseAccountCode,
        accountName: expenseAccount?.name || 'Expense',
        description,
        debit: amount,
        credit: 0,
        currencyCode: currency,
      },
      {
        accountCode: cashAccount,
        accountName: cashAccountInfo?.name || 'Cash',
        description: `Payment for: ${description}`,
        debit: 0,
        credit: amount,
        currencyCode: currency,
      },
    ];

    return createJournalEntry(
      description,
      lines,
      {
        sourceType: 'expense',
        sourceId: expenseId,
      }
    );
  }

  // ============================================
  // FINANCIAL REPORTS
  // ============================================

  /**
   * Calculate account balance from posted entries
   */
  function getAccountBalance(accountCode: string): number {
    const account = getAccount(accountCode);
    if (!account) return 0;

    let balance = 0;
    for (const entry of postedEntries.value) {
      for (const line of entry.lines) {
        if (line.accountCode === accountCode) {
          if (account.normalBalance === 'debit') {
            balance += line.debit - line.credit;
          } else {
            balance += line.credit - line.debit;
          }
        }
      }
    }
    return balance;
  }

  /**
   * Get trial balance
   */
  function getTrialBalance(): Array<{
    code: string;
    name: string;
    nameLao?: string;
    type: string;
    debit: number;
    credit: number;
  }> {
    return activeAccounts.value.map(account => {
      const balance = getAccountBalance(account.code);
      return {
        code: account.code,
        name: account.name,
        nameLao: account.nameLao,
        type: account.type,
        debit: account.normalBalance === 'debit' ? balance : 0,
        credit: account.normalBalance === 'credit' ? balance : 0,
      };
    }).filter(row => row.debit !== 0 || row.credit !== 0);
  }

  /**
   * Get balance sheet data
   */
  function getBalanceSheet(): {
    assets: Array<{ code: string; name: string; balance: number }>;
    liabilities: Array<{ code: string; name: string; balance: number }>;
    equity: Array<{ code: string; name: string; balance: number }>;
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    isBalanced: boolean;
  } {
    const assetAccounts = accountsByType.value.asset || [];
    const liabilityAccounts = accountsByType.value.liability || [];
    const equityAccounts = accountsByType.value.equity || [];

    const assets = assetAccounts.map(a => ({
      code: a.code,
      name: a.name,
      balance: getAccountBalance(a.code),
    })).filter(a => a.balance !== 0);

    const liabilities = liabilityAccounts.map(a => ({
      code: a.code,
      name: a.name,
      balance: getAccountBalance(a.code),
    })).filter(a => a.balance !== 0);

    const equity = equityAccounts.map(a => ({
      code: a.code,
      name: a.name,
      balance: getAccountBalance(a.code),
    })).filter(a => a.balance !== 0);

    const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, a) => sum + a.balance, 0);
    const totalEquity = equity.reduce((sum, a) => sum + a.balance, 0);

    return {
      assets,
      liabilities,
      equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
    };
  }

  /**
   * Get profit & loss statement
   */
  function getProfitAndLoss(): {
    revenue: Array<{ code: string; name: string; amount: number }>;
    expenses: Array<{ code: string; name: string; amount: number }>;
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
  } {
    const revenueAccounts = accountsByType.value.revenue || [];
    const expenseAccounts = accountsByType.value.expense || [];

    const revenue = revenueAccounts.map(a => ({
      code: a.code,
      name: a.name,
      amount: getAccountBalance(a.code),
    })).filter(a => a.amount !== 0);

    const expenses = expenseAccounts.map(a => ({
      code: a.code,
      name: a.name,
      amount: getAccountBalance(a.code),
    })).filter(a => a.amount !== 0);

    const totalRevenue = revenue.reduce((sum, a) => sum + a.amount, 0);
    const totalExpenses = expenses.reduce((sum, a) => sum + a.amount, 0);

    return {
      revenue,
      expenses,
      totalRevenue,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
    };
  }

  // ============================================
  // RETURN
  // ============================================

  return {
    // State
    accounts,
    journalEntries,
    settings,
    isLoading,
    error,

    // Computed
    currentStandard,
    accountMapping,
    activeAccounts,
    accountsByType,
    postedEntries,

    // Init
    init,

    // Settings
    updateSettings,
    switchStandard,

    // Accounts
    getAccount,
    addAccount,
    updateAccount,

    // Journal Entries
    createJournalEntry,

    // Auto Entry Generators
    createSalesJournalEntry,
    createStockAdjustmentEntry,
    createMembershipEntry,
    recognizeMembershipRevenue,
    createExpenseEntry,

    // Reports
    getAccountBalance,
    getTrialBalance,
    getBalanceSheet,
    getProfitAndLoss,
  };
}
