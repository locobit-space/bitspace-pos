/**
 * Printer Settings Composable
 *
 * Centralized management of printer settings with localStorage persistence.
 * Allows configuration of network printers for different locations (Kitchen, Bar, etc.)
 */

import { computed } from "vue";

// ============================================
// Types
// ============================================

export type PrinterLocation = "counter" | "kitchen" | "bar" | "custom";
export type PrinterType =
  | "network"
  | "wireless"
  | "bluetooth"
  | "usb"
  | "ethernet"
  | "system";

export interface Printer {
  id: string;
  name: string;
  ip: string; // Network IP address (for network/wireless/ethernet types)
  port: number; // Default 9100 (for network/wireless/ethernet types)
  type: PrinterType;
  location: PrinterLocation;
  customLocation?: string; // If location is 'custom'
  isActive: boolean;
  paperWidth: "58mm" | "80mm" | "custom";
  customPaperWidth?: number; // Custom width in mm (when paperWidth is 'custom')
  autoCut: boolean; // Enable automatic paper cutting after print
  encoding?: string; // Character encoding (e.g., 'UTF-8', 'GB18030', 'ISO-8859-1')
  density?: number; // Print density/darkness (1-5 scale, 3 is default)
}

export interface PrinterSettings {
  printers: Printer[];
  defaultPrinterId?: string;
  autoPrintReceipt: boolean;
  autoPrintKitchen: boolean;
  autoPrintBar: boolean;
}

// ============================================
// Constants
// ============================================

const PRINTER_SETTINGS_KEY = "pos_printer_settings";

// Default settings
const defaultSettings: PrinterSettings = {
  printers: [],
  autoPrintReceipt: true,
  autoPrintKitchen: true,
  autoPrintBar: true,
};

// ============================================
// Composable
// ============================================

// Global state (singleton pattern)
const settings = useState<PrinterSettings>("printer-settings", () => ({
  ...defaultSettings,
}));
const isLoaded = useState<boolean>("printer-settings-loaded", () => false);

export function usePrinterSettings() {
  /**
   * Load settings from localStorage
   */
  const loadSettings = (): PrinterSettings => {
    if (typeof window === "undefined") {
      return { ...defaultSettings };
    }

    try {
      const saved = localStorage.getItem(PRINTER_SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Deep merge logic could be added here if structure becomes complex
        // For now, simple spread is okay ensuring array exists
        settings.value = {
          ...defaultSettings,
          ...parsed,
          printers: Array.isArray(parsed.printers) ? parsed.printers : [],
        };
      } else {
        settings.value = { ...defaultSettings };
      }
      isLoaded.value = true;
    } catch (error) {
      console.error("[PrinterSettings] Failed to load settings:", error);
      settings.value = { ...defaultSettings };
    }

    return settings.value;
  };

  /**
   * Save settings to localStorage
   */
  const saveSettings = (newSettings?: Partial<PrinterSettings>): boolean => {
    if (typeof window === "undefined") {
      return false;
    }

    try {
      if (newSettings) {
        settings.value = { ...settings.value, ...newSettings };
      }
      localStorage.setItem(
        PRINTER_SETTINGS_KEY,
        JSON.stringify(settings.value),
      );
      return true;
    } catch (error) {
      console.error("[PrinterSettings] Failed to save settings:", error);
      return false;
    }
  };

  /**
   * Add a new printer
   */
  const addPrinter = (printer: Omit<Printer, "id">) => {
    const newPrinter: Printer = {
      ...printer,
      id: crypto.randomUUID(),
    };
    settings.value.printers.push(newPrinter);
    saveSettings();
    return newPrinter;
  };

  /**
   * Update an existing printer
   */
  const updatePrinter = (id: string, updates: Partial<Omit<Printer, "id">>) => {
    const index = settings.value.printers.findIndex((p) => p.id === id);
    if (index !== -1) {
      settings.value.printers[index] = {
        ...settings.value.printers[index],
        ...updates,
      };
      saveSettings();
    }
  };

  /**
   * Remove a printer
   */
  const removePrinter = (id: string) => {
    settings.value.printers = settings.value.printers.filter(
      (p) => p.id !== id,
    );
    saveSettings();
  };

  /**
   * Get Active printers by location
   */
  const getPrintersByLocation = (location: PrinterLocation) => {
    return settings.value.printers.filter(
      (p) => p.isActive && p.location === location,
    );
  };

  // Computed helpers
  const activePrinters = computed(() =>
    settings.value.printers.filter((p) => p.isActive),
  );
  const kitchenPrinters = computed(() => getPrintersByLocation("kitchen"));
  const barPrinters = computed(() => getPrintersByLocation("bar"));
  const counterPrinters = computed(() => getPrintersByLocation("counter"));

  // Auto-load on first use (client-side only)
  if (typeof window !== "undefined" && !isLoaded.value) {
    loadSettings();
  }

  return {
    // State
    settings,
    isLoaded,

    // Methods
    loadSettings,
    saveSettings,
    addPrinter,
    updatePrinter,
    removePrinter,
    getPrintersByLocation,

    // Computed
    activePrinters,
    kitchenPrinters,
    barPrinters,
    counterPrinters,
  };
}
