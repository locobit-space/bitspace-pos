// ============================================
// 🧠 ORDER PARSER - Pattern Matching for Voice Commands
// Natural Language → Structured Order Data
// ============================================

import type {
  VoiceAction,
  VoiceCommand,
  ParsedOrderItem,
  VoiceSize,
  VoiceTemperature,
} from "~/types/voice";
import type { Product, OrderType } from "~/types";

/**
 * Parse natural language voice input into structured order command
 */
export function parseVoiceCommand(
  transcript: string,
  products: Product[],
  language: "en-US" | "lo-LA" | "th-TH" = "en-US",
): VoiceCommand {
  const normalizedText = transcript.toLowerCase().trim();

  // Detect action
  const action = detectAction(normalizedText, language);

  // Base command
  const command: VoiceCommand = {
    action,
    rawTranscript: transcript,
    confidence: 0,
    timestamp: new Date().toISOString(),
    processedBy: "pattern",
    language,
  };

  // Parse based on action
  switch (action) {
    case "add":
      return parseAddCommand(normalizedText, products, command, language);
    case "remove":
      return parseRemoveCommand(normalizedText, command, language);
    case "clear":
      command.confidence = 1.0;
      return command;
    case "set_customer":
      return parseCustomerCommand(normalizedText, command, language);
    case "set_order_type":
      return parseOrderTypeCommand(normalizedText, command, language);
    case "set_table":
      return parseTableCommand(normalizedText, command, language);
    default:
      command.confidence = 0;
      return command;
  }
}

/**
 * Detect the action from the transcript
 */
function detectAction(
  text: string,
  language: "en-US" | "lo-LA" | "th-TH",
): VoiceAction {
  // English patterns
  if (language === "en-US") {
    if (/\b(ok|yes|confirm|correct|that's right|looks good)\b/i.test(text))
      return "confirm";
    if (/\b(add|get|i want|i'd like|give me|order)\b/.test(text)) return "add";
    if (/\b(remove|delete|cancel|take out)\b/.test(text)) return "remove";
    if (/\b(clear|empty|start over|reset)\b/.test(text)) return "clear";
    if (/\b(customer|name is|for)\b/.test(text)) return "set_customer";
    if (/\b(table|dine|takeout|delivery|pickup)\b/.test(text))
      return "set_order_type";
    if (/\b(table number|table)\b/.test(text)) return "set_table";
  }

  // Lao patterns
  if (language === "lo-LA") {
    if (/\b(ຕົກລົງ|ແມ່ນແລ້ວ|ຖືກຕ້ອງ|ໂອເຄ)\b/.test(text)) return "confirm";
    if (/\b(ເພີ່ມ|ສັ່ງ|ເອົາ|ຕ້ອງການ)\b/.test(text)) return "add";
    if (/\b(ລຶບ|ຍົກເລີກ)\b/.test(text)) return "remove";
    if (/\b(ລ້າງ|ເລີ່ມໃໝ່)\b/.test(text)) return "clear";
    if (/\b(ລູກຄ້າ|ຊື່)\b/.test(text)) return "set_customer";
    if (/\b(ໂຕະ|ກິນບ່ອນ|ເອົາກັບ|ສົ່ງເດລີເວີລີ່)\b/.test(text))
      return "set_order_type";
  }

  // Thai patterns
  if (language === "th-TH") {
    if (/\b(ตกลง|ใช่|ถูกต้อง|โอเค|ดี)\b/.test(text)) return "confirm";
    if (/\b(เพิ่ม|สั่ง|เอา|ต้องการ|ขอ)\b/.test(text)) return "add";
    if (/\b(ลบ|ยกเลิก)\b/.test(text)) return "remove";
    if (/\b(ล้าง|เริ่มใหม่)\b/.test(text)) return "clear";
    if (/\b(ลูกค้า|ชื่อ)\b/.test(text)) return "set_customer";
    if (/\b(โต๊ะ|กินที่นี่|กลับบ้าน|เดลิเวอรี่)\b/.test(text))
      return "set_order_type";
  }

  // Default to add if contains numbers or product-like words
  if (/\d+/.test(text) || /coffee|tea|food|drink/.test(text)) {
    return "add";
  }

  return "unknown";
}

/**
 * Parse "add" command (most common)
 */
function parseAddCommand(
  text: string,
  products: Product[],
  command: VoiceCommand,
  language: "en-US" | "lo-LA" | "th-TH",
): VoiceCommand {
  const items: ParsedOrderItem[] = [];

  // Extract quantities and product names
  const segments = extractItemSegments(text, language);

  for (const segment of segments) {
    const quantity = extractQuantity(segment.text, language);
    const size = extractSize(segment.text, language);
    const temperature = extractTemperature(segment.text, language);
    const notes = extractNotes(segment.text, language);

    // Find matching product
    const productQuery = cleanProductQuery(segment.text, language);
    const matchResult = findBestProductMatch(productQuery, products);

    const item: ParsedOrderItem = {
      productQuery,
      productId: matchResult.product?.id,
      product: matchResult.product,
      quantity,
      confidence: matchResult.confidence,
      modifiers: {},
      alternatives: matchResult.alternatives,
    };

    // Add modifiers if detected
    if (size) item.modifiers!.size = size;
    if (temperature) item.modifiers!.temperature = temperature;
    if (notes) item.notes = notes;

    items.push(item);
  }

  command.items = items;

  // Calculate overall confidence (average of item confidences)
  command.confidence =
    items.length > 0
      ? items.reduce((sum, item) => sum + item.confidence, 0) / items.length
      : 0;

  return command;
}

/**
 * Extract item segments from text (handles multiple items)
 */
function extractItemSegments(
  text: string,
  language: "en-US" | "lo-LA" | "th-TH",
): Array<{ text: string; index: number }> {
  const segments: Array<{ text: string; index: number }> = [];

  // Split by common separators
  const separators =
    language === "en-US"
      ? /\b(and|,|plus|\+|also)\b/gi
      : language === "lo-LA"
        ? /\b(ແລະ|,|ກັບ)\b/gi
        : /\b(และ|,|กับ|ด้วย)\b/gi; // Thai

  const parts = text.split(separators).filter((p) => p.trim().length > 0);

  parts.forEach((part, index) => {
    const trimmed = part.trim();
    if (
      trimmed &&
      ![
        "and",
        "plus",
        "also",
        "ແລະ",
        "ກັບ",
        "และ",
        "กับ",
        "ด้วย",
        ",",
      ].includes(trimmed)
    ) {
      segments.push({ text: trimmed, index });
    }
  });

  // If no splits found, treat entire text as one segment
  if (segments.length === 0) {
    segments.push({ text, index: 0 });
  }

  return segments;
}

/**
 * Extract quantity from text
 */
function extractQuantity(
  text: string,
  language: "en-US" | "lo-LA" | "th-TH",
): number {
  // Look for explicit numbers (digits)
  const digitMatch = text.match(/\b(\d+)\s*(x|times|pieces|ໂຕະ)?\b/i);
  if (digitMatch) return parseInt(digitMatch[1], 10);

  // English word numbers
  if (language === "en-US") {
    const wordNumbers: Record<string, number> = {
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5,
      six: 6,
      seven: 7,
      eight: 8,
      nine: 9,
      ten: 10,
      a: 1,
      an: 1,
    };

    for (const [word, num] of Object.entries(wordNumbers)) {
      if (new RegExp(`\\b${word}\\b`, "i").test(text)) {
        return num;
      }
    }
  }

  // Lao word numbers
  if (language === "lo-LA") {
    const laoNumbers: Record<string, number> = {
      ໜຶ່ງ: 1,
      ສອງ: 2,
      ສາມ: 3,
      ສີ່: 4,
      ຫ້າ: 5,
      ຫົກ: 6,
      ເຈັດ: 7,
      ແປດ: 8,
      ເກົ້າ: 9,
      ສິບ: 10,
    };

    for (const [word, num] of Object.entries(laoNumbers)) {
      if (text.includes(word)) {
        return num;
      }
    }
  }

  // Thai word numbers
  if (language === "th-TH") {
    const thaiNumbers: Record<string, number> = {
      หนึ่ง: 1,
      สอง: 2,
      สาม: 3,
      สี่: 4,
      ห้า: 5,
      หก: 6,
      เจ็ด: 7,
      แปด: 8,
      เก้า: 9,
      สิบ: 10,
    };

    for (const [word, num] of Object.entries(thaiNumbers)) {
      if (text.includes(word)) {
        return num;
      }
    }
  }

  // Default to 1 if no quantity found
  return 1;
}

/**
 * Extract size modifier
 */
function extractSize(
  text: string,
  language: "en-US" | "lo-LA" | "th-TH",
): VoiceSize | undefined {
  if (language === "en-US") {
    if (/\b(small|s|sm)\b/i.test(text)) return "small";
    if (/\b(medium|m|med)\b/i.test(text)) return "medium";
    if (/\b(large|l|lg|big)\b/i.test(text)) return "large";
    if (/\b(extra large|xl|extra big)\b/i.test(text)) return "extra-large";
  }

  if (language === "lo-LA") {
    if (/\b(ນ້ອຍ|ນ້ອຍ)\b/.test(text)) return "small";
    if (/\b(ກາງ)\b/.test(text)) return "medium";
    if (/\b(ໃຫຍ່|ພິເສດ)\b/.test(text)) return "large";
  }

  if (language === "th-TH") {
    if (/\b(เล็ก|ส)\b/.test(text)) return "small";
    if (/\b(กลาง|ม)\b/.test(text)) return "medium";
    if (/\b(ใหญ่|ล|พิเศษ)\b/.test(text)) return "large";
  }

  return undefined;
}

/**
 * Extract temperature modifier
 */
function extractTemperature(
  text: string,
  language: "en-US" | "lo-LA" | "th-TH",
): VoiceTemperature | undefined {
  if (language === "en-US") {
    if (/\b(hot|warm)\b/i.test(text)) return "hot";
    if (/\b(iced|cold|ice)\b/i.test(text)) return "iced";
  }

  if (language === "lo-LA") {
    if (/\b(ຮ້ອນ|ອຸ່ນ)\b/.test(text)) return "hot";
    if (/\b(ເຢັນ|ນ້ຳແຂງ)\b/.test(text)) return "iced";
  }

  if (language === "th-TH") {
    if (/\b(ร้อน|อุ่น)\b/.test(text)) return "hot";
    if (/\b(เย็น|น้ำแข็ง)\b/.test(text)) return "iced";
  }

  return undefined;
}

/**
 * Extract special notes/instructions
 */
function extractNotes(
  text: string,
  language: "en-US" | "lo-LA" | "th-TH",
): string | undefined {
  // Look for phrases like "with extra sugar", "no ice", etc.
  const patterns =
    language === "en-US"
      ? [
          /\bwith\s+(.+?)(?:\s+and|\s*$)/i,
          /\bextra\s+(.+?)(?:\s+and|\s*$)/i,
          /\bno\s+(.+?)(?:\s+and|\s*$)/i,
          /\bless\s+(.+?)(?:\s+and|\s*$)/i,
        ]
      : language === "lo-LA"
        ? [/\bເພີ່ມ\s+(.+?)(?:\s+ແລະ|\s*$)/i, /\bບໍ່\s+(.+?)(?:\s+ແລະ|\s*$)/i]
        : [/\bเพิ่ม\s+(.+?)(?:\s+และ|\s*$)/i, /\bไม่\s+(.+?)(?:\s+และ|\s*$)/i]; // Thai

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return undefined;
}

/**
 * Clean product query by removing modifiers and quantities
 */
function cleanProductQuery(
  text: string,
  language: "en-US" | "lo-LA" | "th-TH",
): string {
  let cleaned = text || "";

  // Remove quantities
  cleaned = cleaned.replace(/\b\d+\s*(x|times|pieces|ໂຕະ)?\b/gi, "");
  cleaned = cleaned.replace(
    /\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/gi,
    "",
  );

  // Remove sizes
  cleaned = cleaned.replace(
    /\b(small|medium|large|extra large|xl|s|m|l|ນ້ອຍ|ກາງ|ໃຫຍ່)\b/gi,
    "",
  );

  // Remove temperatures
  cleaned = cleaned.replace(/\b(hot|iced|cold|warm|ຮ້ອນ|ເຢັນ|ນ້ຳແຂງ)\b/gi, "");

  // Remove action words
  cleaned = cleaned.replace(
    /\b(add|get|i want|i'd like|give me|order|ເພີ່ມ|ສັ່ງ|ເອົາ|เพิ่ม|สั่ง|เอา|ขอ)\b/gi,
    "",
  );

  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}

/**
 * Find best matching product using fuzzy matching
 */
function findBestProductMatch(
  query: string,
  products: Product[],
): {
  product?: Product;
  confidence: number;
  alternatives?: Array<{
    productId: string;
    product: Product;
    confidence: number;
  }>;
} {
  if (!query || products.length === 0) {
    return { confidence: 0 };
  }

  const matches = products
    .map((product) => {
      const score = fuzzyMatch(query, product.name);
      return { product, score };
    })
    .filter((m) => m.score > 0.3) // Filter out very low matches
    .sort((a, b) => b.score - a.score);

  if (matches.length === 0) {
    return { confidence: 0 };
  }

  const bestMatch = matches[0];
  if (!bestMatch) {
    return { confidence: 0 };
  }

  const alternatives = matches.slice(1, 4).map((m) => ({
    productId: m.product.id,
    product: m.product,
    confidence: m.score,
  }));

  return {
    product: bestMatch.product,
    confidence: bestMatch.score,
    alternatives: alternatives.length > 0 ? alternatives : undefined,
  };
}

/**
 * Fuzzy string matching (Levenshtein-based)
 */
function fuzzyMatch(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  // Exact match
  if (q === t) return 1.0;

  // Contains match
  if (t.includes(q)) return 0.9;
  if (q.includes(t)) return 0.85;

  // Word boundary match
  const qWords = q.split(/\s+/);
  const tWords = t.split(/\s+/);

  // Check if all query words are in target
  const allWordsMatch = qWords.every((qw) =>
    tWords.some((tw) => tw.startsWith(qw) || qw.startsWith(tw)),
  );
  if (allWordsMatch) return 0.8;

  // Levenshtein distance
  const distance = levenshteinDistance(q, t);
  const maxLen = Math.max(q.length, t.length);
  const similarity = 1 - distance / maxLen;

  return Math.max(0, similarity);
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[m][n];
}

/**
 * Parse "remove" command
 */
function parseRemoveCommand(
  text: string,
  command: VoiceCommand,
  language: "en-US" | "lo-LA",
): VoiceCommand {
  // Simple patterns for now
  if (
    /\b(last|previous|recent)\b/i.test(text) ||
    /\b(ສຸດທ້າຍ|ຜ່ານມາ)\b/.test(text)
  ) {
    command.notes = "last_item";
    command.confidence = 0.9;
  } else {
    command.confidence = 0.5;
  }

  return command;
}

/**
 * Parse customer information
 */
function parseCustomerCommand(
  text: string,
  command: VoiceCommand,
  language: "en-US" | "lo-LA",
): VoiceCommand {
  // Extract customer name
  const namePatterns =
    language === "en-US"
      ? [
          /\bcustomer\s+(?:name\s+)?(?:is\s+)?(.+?)(?:\s|$)/i,
          /\bname\s+(?:is\s+)?(.+?)(?:\s|$)/i,
          /\bfor\s+(.+?)(?:\s|$)/i,
        ]
      : [/\bຊື່\s+(.+?)(?:\s|$)/i, /\bລູກຄ້າ\s+(.+?)(?:\s|$)/i];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      command.customerName = match[1].trim();
      command.confidence = 0.9;
      return command;
    }
  }

  command.confidence = 0.3;
  return command;
}

/**
 * Parse order type command
 */
function parseOrderTypeCommand(
  text: string,
  command: VoiceCommand,
  language: "en-US" | "lo-LA",
): VoiceCommand {
  if (
    /\b(dine in|dine-in|eat here|for here)\b/i.test(text) ||
    /\b(ກິນບ່ອນ|ກິນທີ່ນີ້)\b/.test(text)
  ) {
    command.orderType = "dine_in";
    command.confidence = 0.95;
  } else if (
    /\b(takeout|take out|take away|to go|togo)\b/i.test(text) ||
    /\b(ເອົາກັບ|ກັບເຮືອນ)\b/.test(text)
  ) {
    command.orderType = "take_away";
    command.confidence = 0.95;
  } else if (
    /\b(delivery|deliver)\b/i.test(text) ||
    /\b(ສົ່ງເດລີເວີລີ່|ສົ່ງ)\b/.test(text)
  ) {
    command.orderType = "delivery";
    command.confidence = 0.95;
  } else if (/\b(pickup|pick up)\b/i.test(text)) {
    command.orderType = "pickup";
    command.confidence = 0.95;
  } else {
    command.confidence = 0.3;
  }

  return command;
}

/**
 * Parse table number
 */
function parseTableCommand(
  text: string,
  command: VoiceCommand,
  language: "en-US" | "lo-LA",
): VoiceCommand {
  const tableMatch = text.match(/\btable\s+(?:number\s+)?(\d+|[a-z]\d*)\b/i);
  const laoTableMatch = text.match(/\bໂຕະ\s+(\d+)/);

  return command;
}
