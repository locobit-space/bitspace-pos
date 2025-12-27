// ============================================
// 👥 EMPLOYEES COMPOSABLE
// Employee Management with Dexie + Nostr
// ============================================

import type { Employee, EmployeeStatus } from "~/types";
import { db, type EmployeeRecord } from "~/db/db";

// Singleton state
const employees = ref<Employee[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const isInitialized = ref(false);

// Filters
const searchQuery = ref("");
const selectedStatus = ref<EmployeeStatus | "all">("all");
const selectedDepartment = ref<string>("all");

/**
 * 👥 EMPLOYEES STORE
 * Employee CRUD with local storage and Nostr sync
 */
export function useEmployeesStore() {
  const toast = useToast();
  const { t } = useI18n();

  // ============================================
  // 📊 COMPUTED
  // ============================================

  // Filtered employees
  const filteredEmployees = computed(() => {
    let result = employees.value;

    // Search filter
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter(
        (e) =>
          e.firstName.toLowerCase().includes(query) ||
          e.lastName.toLowerCase().includes(query) ||
          e.employeeCode.toLowerCase().includes(query) ||
          e.email?.toLowerCase().includes(query) ||
          e.phone?.includes(query) ||
          e.position?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (selectedStatus.value !== "all") {
      result = result.filter((e) => e.status === selectedStatus.value);
    }

    // Department filter
    if (selectedDepartment.value !== "all") {
      result = result.filter((e) => e.department === selectedDepartment.value);
    }

    return result;
  });

  // Active employees only
  const activeEmployees = computed(() =>
    employees.value.filter((e) => e.status === "active")
  );

  // Employee count by status
  const employeeStats = computed(() => ({
    total: employees.value.length,
    active: employees.value.filter((e) => e.status === "active").length,
    inactive: employees.value.filter((e) => e.status === "inactive").length,
    onLeave: employees.value.filter((e) => e.status === "on-leave").length,
    terminated: employees.value.filter((e) => e.status === "terminated").length,
  }));

  // Unique departments
  const departments = computed(() => {
    const depts = new Set<string>();
    employees.value.forEach((e) => {
      if (e.department) depts.add(e.department);
    });
    return Array.from(depts).sort();
  });

  // Unique positions
  const positions = computed(() => {
    const pos = new Set<string>();
    employees.value.forEach((e) => {
      if (e.position) pos.add(e.position);
    });
    return Array.from(pos).sort();
  });

  // ============================================
  // 🗄️ LOCAL STORAGE (Dexie)
  // ============================================

  async function loadEmployeesFromLocal(): Promise<Employee[]> {
    try {
      // Check if employees table exists, if not return empty
      if (!db.employees) {
        console.warn("Employees table not initialized in Dexie");
        return [];
      }
      const records = await db.employees.toArray();
      return records.map((r: EmployeeRecord) => ({
        ...r,
        synced: undefined, // Remove internal field
      }));
    } catch (e) {
      console.error("Failed to load employees:", e);
      return [];
    }
  }

  async function saveEmployeeToLocal(employee: Employee): Promise<void> {
    if (!employee.id) return;
    if (!db.employees) {
      console.warn("Employees table not initialized");
      return;
    }
    const record: EmployeeRecord = {
      ...employee,
      synced: false,
    };
    await db.employees.put(record);
  }

  // ============================================
  // 🔄 INITIALIZATION
  // ============================================

  async function init(): Promise<void> {
    if (isInitialized.value) return;
    isLoading.value = true;
    error.value = null;

    try {
      employees.value = await loadEmployeesFromLocal();
      isInitialized.value = true;
    } catch (e) {
      error.value = `Failed to initialize employees: ${e}`;
      console.error(error.value);
    } finally {
      isLoading.value = false;
    }
  }

  // ============================================
  // 📝 CRUD OPERATIONS
  // ============================================

  function generateEmployeeCode(): string {
    const prefix = "EMP";
    const num = employees.value.length + 1;
    return `${prefix}${num.toString().padStart(4, "0")}`;
  }

  function generateId(): string {
    return `emp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async function addEmployee(
    data: Omit<Employee, "id" | "employeeCode" | "createdAt" | "updatedAt">
  ): Promise<Employee> {
    const now = new Date().toISOString();
    const employee: Employee = {
      ...data,
      id: generateId(),
      employeeCode: generateEmployeeCode(),
      createdAt: now,
      updatedAt: now,
    };

    employees.value.push(employee);
    await saveEmployeeToLocal(employee);

    toast.add({
      title: t("employees.createSuccess"),
      icon: "i-heroicons-check-circle",
      color: "success",
    });

    return employee;
  }

  async function updateEmployee(
    id: string,
    updates: Partial<Employee>
  ): Promise<Employee | null> {
    const index = employees.value.findIndex((e) => e.id === id);
    if (index === -1) return null;

    const existing = employees.value[index]!;
    const updated: Employee = {
      ...existing,
      ...updates,
      id: existing.id,
      employeeCode: existing.employeeCode,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    employees.value[index] = updated;
    await saveEmployeeToLocal(updated);

    toast.add({
      title: t("employees.updateSuccess"),
      icon: "i-heroicons-check-circle",
      color: "success",
    });

    return updated;
  }

  async function deleteEmployee(id: string): Promise<boolean> {
    const index = employees.value.findIndex((e) => e.id === id);
    if (index === -1) return false;

    // Soft delete - just mark as terminated
    const employee = employees.value[index]!;
    await updateEmployee(id, {
      status: "terminated",
      terminationDate: new Date().toISOString(),
    });

    toast.add({
      title: t("employees.deleteSuccess"),
      icon: "i-heroicons-check-circle",
      color: "success",
    });

    return true;
  }

  async function hardDeleteEmployee(id: string): Promise<boolean> {
    const index = employees.value.findIndex((e) => e.id === id);
    if (index === -1) return false;

    employees.value.splice(index, 1);
    if (db.employees) {
      await db.employees.delete(id);
    }

    return true;
  }

  // ============================================
  // 🔍 GETTERS
  // ============================================

  function getEmployee(id: string): Employee | undefined {
    return employees.value.find((e) => e.id === id);
  }

  function getEmployeeByCode(code: string): Employee | undefined {
    return employees.value.find((e) => e.employeeCode === code);
  }

  function getEmployeesByBranch(branchId: string): Employee[] {
    return employees.value.filter((e) => e.branchId === branchId);
  }

  function getEmployeesByDepartment(department: string): Employee[] {
    return employees.value.filter((e) => e.department === department);
  }

  // ============================================
  // 🏖️ LEAVE MANAGEMENT
  // ============================================

  async function adjustLeaveBalance(
    employeeId: string,
    leaveType: "annual" | "sick" | "personal",
    adjustment: number
  ): Promise<boolean> {
    const employee = getEmployee(employeeId);
    if (!employee) return false;

    const key = `${leaveType}LeaveBalance` as keyof Employee;
    const currentBalance = (employee[key] as number) || 0;
    const newBalance = Math.max(0, currentBalance + adjustment);

    await updateEmployee(employeeId, {
      [key]: newBalance,
    });

    return true;
  }

  // ============================================
  // 💰 COMMISSION & PAY
  // ============================================

  function calculateMonthlyPay(
    employee: Employee,
    hoursWorked: number = 0,
    overtimeHours: number = 0
  ): number {
    let basePay = 0;

    switch (employee.salaryType) {
      case "monthly":
        basePay = employee.baseSalary;
        break;
      case "daily":
        basePay = employee.baseSalary * 22; // Assume 22 working days
        break;
      case "hourly":
        basePay = employee.baseSalary * hoursWorked;
        break;
      case "weekly":
        basePay = employee.baseSalary * 4;
        break;
    }

    // Add overtime
    const overtimeRate = employee.overtimeRate || 1.5;
    const overtimePay =
      employee.salaryType === "hourly"
        ? employee.baseSalary * overtimeRate * overtimeHours
        : 0;

    return basePay + overtimePay;
  }

  // ============================================
  // 📤 EXPORT
  // ============================================

  return {
    // State
    employees: readonly(employees),
    isLoading: readonly(isLoading),
    error: readonly(error),
    isInitialized: readonly(isInitialized),

    // Filters
    searchQuery,
    selectedStatus,
    selectedDepartment,

    // Computed
    filteredEmployees,
    activeEmployees,
    employeeStats,
    departments,
    positions,

    // Methods
    init,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    hardDeleteEmployee,
    getEmployee,
    getEmployeeByCode,
    getEmployeesByBranch,
    getEmployeesByDepartment,
    adjustLeaveBalance,
    calculateMonthlyPay,
    generateEmployeeCode,
  };
}
