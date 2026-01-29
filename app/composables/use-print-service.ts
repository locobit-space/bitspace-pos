/**
 * Print Service Composable
 * Handles sending receipts to thermal printers
 */

import type { Printer } from "./use-printer-settings";

export const usePrintService = () => {
  const printerSettings = usePrinterSettings();
  const toast = useToast();
  const { t } = useI18n();

  /**
   * Send receipt HTML to a thermal printer
   * @param printerId - ID of the printer to use
   * @param receiptHtml - HTML content of the receipt
   * @returns Promise<boolean> - Success status
   */
  const sendToPrinter = async (
    printerId: string,
    receiptHtml: string,
  ): Promise<boolean> => {
    const printer = printerSettings.settings.value.printers.find(
      (p) => p.id === printerId,
    );

    if (!printer) {
      throw new Error(t("settings.printers.notFound", "Printer not found"));
    }

    if (!printer.isActive) {
      throw new Error(t("settings.printers.inactive", "Printer is inactive"));
    }

    // Route to appropriate print handler based on printer type
    switch (printer.type) {
      case "network":
      case "wireless":
      case "ethernet":
        return await sendToNetworkPrinter(printer, receiptHtml);
      case "bluetooth":
        return await sendToBluetoothPrinter(printer, receiptHtml);
      case "usb":
        return await sendToUSBPrinter(printer, receiptHtml);
      default:
        throw new Error(`Unsupported printer type: ${printer.type}`);
    }
  };

  /**
   * Send to network-based printer (IP/WiFi/Ethernet)
   * NOTE: This is a placeholder implementation
   * Production implementation needs backend service or ESC/POS library
   */
  const sendToNetworkPrinter = async (
    printer: Printer,
    html: string,
  ): Promise<boolean> => {
    console.log("Sending to network printer:", printer.name);
    console.log("Printer config:", {
      ip: printer.ip,
      port: printer.port,
      paperWidth: printer.paperWidth,
      autoCut: printer.autoCut,
      encoding: printer.encoding,
      density: printer.density,
    });

    // TODO: Implement actual network print job
    // Options:
    // 1. Use backend service to handle ESC/POS conversion and network transmission
    // 2. Use browser-based ESC/POS library (e.g., @tillpos/xml-escpos-helper)
    // 3. Send to print server endpoint that forwards to printer

    // For now, log the attempt and use browser print as fallback
    toast.add({
      title: t(
        "pos.print.networkPrintPlaceholder",
        "Network Print (Development Mode)",
      ),
      description: t(
        "pos.print.usingBrowserPrint",
        "Using browser print dialog as fallback",
      ),
      color: "yellow",
      icon: "i-heroicons-printer",
    });

    // Fallback to browser print
    return await printWithBrowser(html);
  };

  /**
   * Send to Bluetooth printer
   * Requires Web Bluetooth API support
   */
  const sendToBluetoothPrinter = async (
    printer: Printer,
    html: string,
  ): Promise<boolean> => {
    console.log("Bluetooth printing requested for:", printer.name);

    // Check if Web Bluetooth is available
    if (!navigator.bluetooth) {
      toast.add({
        title: t("pos.print.bluetoothNotSupported", "Bluetooth Not Supported"),
        description: t(
          "pos.print.bluetoothRequiresHttps",
          "Bluetooth requires HTTPS connection",
        ),
        color: "red",
        icon: "i-heroicons-exclamation-triangle",
      });
      return false;
    }

    // TODO: Implement Web Bluetooth printing
    // Requires pairing and ESC/POS command generation
    toast.add({
      title: t(
        "pos.print.bluetoothNotImplemented",
        "Bluetooth Printing Not Yet Implemented",
      ),
      description: t(
        "pos.print.usingBrowserPrint",
        "Using browser print dialog as fallback",
      ),
      color: "yellow",
      icon: "i-heroicons-printer",
    });

    return await printWithBrowser(html);
  };

  /**
   * Send to USB printer
   * Uses browser's native print dialog
   */
  const sendToUSBPrinter = async (
    printer: Printer,
    html: string,
  ): Promise<boolean> => {
    console.log("USB printing requested for:", printer.name);
    return await printWithBrowser(html);
  };

  /**
   * Fallback: Use browser's print dialog
   * Opens receipt in new window and triggers print
   */
  const printWithBrowser = async (html: string): Promise<boolean> => {
    try {
      // Create a new window with the receipt content
      const printWindow = window.open("", "_blank", "width=400,height=600");
      if (!printWindow) {
        throw new Error("Could not open print window. Please allow popups.");
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Receipt</title>
          <style>
            @media print {
              body { margin: 0; padding: 0; }
              @page { margin: 0; size: 80mm auto; }
            }
            body {
              font-family: monospace;
              width: 80mm;
              margin: 0 auto;
              padding: 10mm;
            }
          </style>
        </head>
        <body>
          ${html}
          <script>
            window.onload = () => {
              window.print();
              // Auto-close after printing (optional)
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();

      return true;
    } catch (error) {
      console.error("Browser print failed:", error);
      throw error;
    }
  };

  /**
   * Test print to verify printer connectivity
   * Sends a simple test receipt
   */
  const testPrint = async (printerId: string): Promise<boolean> => {
    const testReceipt = `
      <div style="text-align: center;">
        <h2>TEST RECEIPT</h2>
        <p>━━━━━━━━━━━━━━━━━━━━</p>
        <p>Printer: ${printerSettings.settings.value.printers.find((p) => p.id === printerId)?.name || "Unknown"}</p>
        <p>Time: ${new Date().toLocaleString()}</p>
        <p>━━━━━━━━━━━━━━━━━━━━</p>
        <p>✓ Print Test Successful</p>
        <br/>
      </div>
    `;

    return await sendToPrinter(printerId, testReceipt);
  };

  return {
    sendToPrinter,
    testPrint,
  };
};
