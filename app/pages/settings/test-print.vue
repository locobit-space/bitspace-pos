<script setup lang="ts">
import { ref, onMounted } from "vue";

definePageMeta({
  title: "POS Auto Print Test",
  layout: "default",
});

const printerIp = ref("192.168.2.31");
const printerPort = ref(9100);
const isPrinting = ref(false);
const printStatus = ref("Ready");
const logs = ref<string[]>([]);
const toast = useToast();

const addLog = (msg: string) => {
  logs.value.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
};

/**
 * Executes a raw network print request to the specified IP using generic POST mechanisms.
 */
const autoPrint = async () => {
  if (!printerIp.value) {
    toast.add({
      title: "Error",
      description: "Printer IP is required",
      color: "red",
    });
    return;
  }

  isPrinting.value = true;
  printStatus.value = "Sending print job...";
  addLog(`Initiating auto-print to ${printerIp.value}...`);

  try {
    const testReceipt = `
================================
       POS PRINT TEST
================================
IP: ${printerIp.value}
Time: ${new Date().toLocaleString()}

Auto-Print: SUCCESSFUL
Status: ONLINE

================================
Thank you for testing!
\n\n\n\n\n\n\x1B\x69`; // Includes ESC i (cut command)

    addLog("Created ESC/POS test receipt format.");

    // Attempt 1: Raw POST to /print endpoint (often used in web print proxies)
    try {
      addLog(`Attempting HTTP POST to http://${printerIp.value}/print`);
      await fetch(`http://${printerIp.value}/print`, {
        method: "POST",
        body: testReceipt,
        headers: { "Content-Type": "text/plain" },
        mode: "no-cors",
      });
      addLog("POST to /print dispatched (no-cors mode).");
    } catch (e) {
      addLog(`Failed to POST to /print: ${(e as Error).message}`);
    }

    // Attempt 2: ePOS API (Used by Epson and some Star printers)
    try {
      addLog(
        `Attempting ePOS XML POST to http://${printerIp.value}/cgi-bin/epos/dispacher.cgi`,
      );
      const eposMessage = `<?xml version="1.0" encoding="utf-8"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><epos-print xmlns="urn:epos-print"><text lang="en">${testReceipt}</text><cut type="feed"/></epos-print></s:Body></s:Envelope>`;

      await fetch(`http://${printerIp.value}/cgi-bin/epos/dispacher.cgi`, {
        method: "POST",
        body: eposMessage,
        headers: { "Content-Type": "text/xml; charset=utf-8" },
        mode: "no-cors",
      });
      addLog("ePOS XML dispatched (no-cors mode).");
    } catch (e) {
      addLog(`Failed to POST to ePOS API: ${(e as Error).message}`);
    }

    addLog("Finished emitting network print commands.");
    printStatus.value = "Commands sent successfully";
    toast.add({
      title: "Print Sent",
      description: "Network print commands sent to the printer.",
      color: "green",
    });
  } catch (error) {
    addLog(`Critical Error: ${(error as Error).message}`);
    printStatus.value = "Failed to send";
    toast.add({
      title: "Print Failed",
      description: "Failed to communicate with printer network.",
      color: "red",
    });
  } finally {
    isPrinting.value = false;
  }
};

const systemPrint = async () => {
  const testReceipt = `
================================
       SYSTEM PRINT TEST
================================
Method: Browser System Dialog
Time: ${new Date().toLocaleString()}

Print Test: SUCCESSFUL

================================
Thank you for testing!`;

  try {
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) {
      toast.add({
        title: "Error",
        description: "Could not open print window. Please allow popups.",
        color: "red",
      });
      return;
    }

    printWindow.document.write(
      "<!DOCTYPE html>" +
        "<html>" +
        "<head>" +
        '<meta charset="UTF-8">' +
        "<title>Test Receipt</title>" +
        "<style>" +
        "  @media print { body { margin: 0; padding: 0; } @page { margin: 0; size: 80mm auto; } }" +
        "  body { font-family: monospace; width: 80mm; margin: 0 auto; padding: 10mm; white-space: pre-wrap; }" +
        "</style>" +
        "</head>" +
        "<body>" +
        testReceipt +
        "<script>" +
        "  window.onload = () => { window.print(); setTimeout(() => window.close(), 500); };" +
        "</" +
        "script>" +
        "</body>" +
        "</html>",
    );
    printWindow.document.close();
    toast.add({
      title: "System Print",
      description: "Browser print dialog opened.",
      color: "green",
    });
  } catch (err) {
    toast.add({
      title: "Error",
      description: (err as Error).message,
      color: "red",
    });
  }
};

// Auto-trigger the print when page loads
onMounted(() => {
  addLog("Test Print page mounted.");
  addLog("Executing auto-print sequence in 1.5 seconds...");

  setTimeout(() => {
    autoPrint();
  }, 1500);
});
</script>

<template>
  <div class="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Auto Print Test
        </h1>
        <p class="text-sm text-gray-500 mt-1">
          Simulate and test network printing to your POS thermal printer.
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <UCard>
        <template #header>
          <div class="flex items-center gap-2 font-semibold">
            <UIcon
              name="solar:printer-linear"
              class="w-5 h-5 text-primary-500"
            />
            Printer Configuration
          </div>
        </template>

        <div class="space-y-4">
          <UFormField label="Printer IP Address" required>
            <UInput
              v-model="printerIp"
              placeholder="e.g., 192.168.2.31"
              icon="solar:global-linear"
            />
          </UFormField>

          <UFormField label="Printer Port">
            <UInput
              v-model.number="printerPort"
              type="number"
              placeholder="9100"
              icon="solar:server-path-linear"
            />
            <template #help>
              <span class="text-xs text-gray-500"
                >Default POS raw socket port is 9100.</span
              >
            </template>
          </UFormField>

          <UAlert
            icon="solar:info-circle-linear"
            color="blue"
            title="Auto-Print Active"
            description="When this page loads, it automatically attempts to blast network print commands to the target IP."
          />

          <div
            class="pt-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between"
          >
            <span
              class="text-sm font-medium"
              :class="
                printStatus.includes('success')
                  ? 'text-green-500'
                  : 'text-gray-500'
              "
            >
              Status: {{ printStatus }}
            </span>
            <div class="flex gap-2">
              <UButton
                color="white"
                icon="solar:printer-minimalistic-linear"
                @click="systemPrint"
              >
                System Print
              </UButton>
              <UButton
                color="primary"
                icon="solar:printer-bold"
                :loading="isPrinting"
                @click="autoPrint"
              >
                Network Print
              </UButton>
            </div>
          </div>
        </div>
      </UCard>

      <UCard class="bg-gray-50 dark:bg-gray-900 flex flex-col h-full">
        <template #header>
          <div class="flex items-center justify-between font-semibold">
            <div class="flex items-center gap-2">
              <UIcon
                name="solar:terminal-linear"
                class="w-5 h-5 text-gray-500"
              />
              Network Request Logs
            </div>
            <UButton
              size="xs"
              color="gray"
              variant="ghost"
              icon="solar:trash-bin-trash-linear"
              @click="logs = []"
            />
          </div>
        </template>

        <div
          class="flex-1 bg-black text-green-400 font-mono text-xs p-4 rounded-lg overflow-y-auto h-64 border border-gray-800 break-words shadow-inner"
        >
          <div v-if="logs.length === 0" class="text-gray-600 italic">
            Waiting for connection events...
          </div>
          <div v-for="(log, idx) in logs" :key="idx" class="mb-1">
            {{ log }}
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
