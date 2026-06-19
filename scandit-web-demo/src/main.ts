import Anthropic from "@anthropic-ai/sdk";
import { DataCaptureContext } from "@scandit/web-datacapture-core";
import {
  BarcodeAr,
  BarcodeArSettings,
  BarcodeArView,
  BarcodeArSession,
  Symbology,
  barcodeCaptureLoader,
} from "@scandit/web-datacapture-barcode";

const LICENSE_KEY = "AhNHji+1CE3bEFujtu6n894sXhF6A9okxQTlK+D1UNQSfYeNVWHNjoRSWM4qCSftvk0WdTxiAdjMcT2eG0bkrN1/HOUpPTQEc0nPsqw3YosIMaiLSCbIulsm2zRNM9nqu/FdXoF7N47rNW8dXU28UnN/c67+fqqHyrVfpUnqKMStT3r2hZ8gjsR7HKjuyzDctNbczoxtTHoBiLbIbM5YVQ1HGsn0RrMeo4McjEbXj1xpbH91fsn4lC58C4Lh6BzwOdezNaivzYC8eNwMHV0Rpn7N/dQU5vjjMd2CvBJHP2FitZNxdhl2fAXHhi1i1wKKb7fMC3/IzwTvR0t8ocbjIgMculOCvvcaKTrcDlzK9zufD/wJKWw7m6/tVil5QxqCG92acTwX2suf2bJerNjOj5JXayYMI8v++aIiOtS5uaTD3rt88JLy9euV/BGVS+ZJi8Ap9YhVKAxQJNN5zWVxMMGKpEfiL5q4UUKvz9TCoKJoUuhvRZzdadErqhnLFCWShYisKI3sbLYNokRdHWvrdvb0UXDnjotoTZRbF3NIPI/lX9g1z67XSvdBqdo1bOGNl/ZOQb4cWL+NkTARWFvhqcfbMKrYqzXgMaQDYwJesi753dVwFYLGk8bSPQqk/0aukkKEP/f6Rosu8VJNZWBhLN2PCzZBYxRNDkNZciAtK+x+YVGPE5NbOLqBPetFFcnDXB0t5ele9+PZ34Be4i01JDoyyGp076FLvSGQ2DtMgfdn7UWVUKnPs2/ca2dP52AiRgTIlBEHlkXDasRHJQtgJROnw2KzBQxlnNT/O1Ss";

// ── Types ──────────────────────────────────────────────────────────────────

interface Product {
  product_code: string;
  product_id: string;
  name: string;
  brand: string;
  category: string;
  color: string;
  size: string;
  price_chf: number;
  discount_pct: number;
  aisle: string;
  zone_name: string;
  stock_total: number;
  description: string;
  tags?: string[];
  material?: string;
  waterproof_rating_mm?: number;
  temp_rating_c?: number;
}

interface ShoppingIntent {
  summary: string;
  categories?: string[];
  max_price?: number;
  colors?: string[];
  keywords?: string[];
}

// ── State ──────────────────────────────────────────────────────────────────

let productMap: Map<string, Product> = new Map();
let chatHistory: Anthropic.MessageParam[] = [];
let currentIntent: ShoppingIntent | null = null;
let barcodeArView: BarcodeArView | null = null;
let scannerInitialized = false;
let running = false;
let anthropic: Anthropic | null = null;

// ── DOM refs ───────────────────────────────────────────────────────────────

const chatScreen = document.getElementById("chat-screen") as HTMLDivElement;
const scanScreen = document.getElementById("scan-screen") as HTMLDivElement;
const chatMessages = document.getElementById("chat-messages") as HTMLDivElement;
const chatInput = document.getElementById("chat-input") as HTMLTextAreaElement;
const sendBtn = document.getElementById("send-btn") as HTMLButtonElement;
const scanTriggerRow = document.getElementById("scan-trigger-row") as HTMLDivElement;
const scanTriggerBtn = document.getElementById("scan-trigger-btn") as HTMLButtonElement;
const intentSummary = document.getElementById("intent-summary") as HTMLDivElement;
const backBtn = document.getElementById("back-btn") as HTMLButtonElement;
const scanIntentLabel = document.getElementById("scan-intent-label") as HTMLSpanElement;
const container = document.getElementById("scanner-container") as HTMLDivElement;
const startBtn = document.getElementById("start-btn") as HTMLButtonElement;
const resultPanel = document.getElementById("result-panel") as HTMLDivElement;
const apiKeyInput = document.getElementById("api-key-input") as HTMLInputElement;

// ── Product loading ────────────────────────────────────────────────────────

async function loadProducts() {
  const res = await fetch("/products.json");
  const data: Product[] = await res.json();
  for (const p of data) productMap.set(p.product_code, p);
}

// ── Chat UI helpers ────────────────────────────────────────────────────────

function appendMessage(role: "user" | "assistant" | "system-info", text: string) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.textContent = text;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

function showTyping() {
  const div = document.createElement("div");
  div.className = "msg assistant typing-indicator";
  div.id = "typing";
  div.innerHTML = "<span></span><span></span><span></span>";
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTyping() {
  document.getElementById("typing")?.remove();
}

// ── Claude chat ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a friendly in-store shopping assistant for an outdoor sports & lifestyle store.
The store sells products like hiking boots, jackets, backpacks, tents, sleeping bags, sportswear, accessories, and more.
Products have attributes: category, brand, color, size, price (CHF), discount, aisle location, and description.

Your job:
1. Greet the customer warmly and ask what they're looking for.
2. Ask 1-2 clarifying questions if needed (budget, color preference, specific use case).
3. After 2-3 exchanges when you understand what they want, add this EXACT block at the end of your message (on its own lines):

INTENT_JSON
{"summary":"<one short sentence>","categories":["<category if known>"],"max_price":<number or null>,"colors":["<color if known>"],"keywords":["<key feature words>"]}
END_INTENT

Keep responses short (2-4 sentences). Be helpful and enthusiastic. Don't repeat the JSON in follow-up messages once you've sent it.`;

const ENV_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;

async function sendMessage(userText: string) {
  if (!anthropic) {
    const key = ENV_API_KEY?.trim() || apiKeyInput.value.trim();
    if (!key) {
      appendMessage("system-info", "Please enter your Anthropic API key above.");
      return;
    }
    anthropic = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
  }

  chatHistory.push({ role: "user", content: userText });

  showTyping();
  sendBtn.disabled = true;
  chatInput.disabled = true;

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: chatHistory,
      thinking: { type: "adaptive" },
    });

    removeTyping();

    const fullText = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as Anthropic.TextBlock).text)
      .join("");

    // Extract intent JSON if present
    const intentMatch = fullText.match(/INTENT_JSON\s*([\s\S]*?)\s*END_INTENT/);
    let displayText = fullText.replace(/INTENT_JSON[\s\S]*?END_INTENT/g, "").trim();

    if (intentMatch) {
      try {
        currentIntent = JSON.parse(intentMatch[1].trim()) as ShoppingIntent;
        intentSummary.textContent = `Looking for: ${currentIntent.summary}`;
        scanTriggerRow.style.display = "block";
      } catch {
        // ignore parse errors
      }
    }

    chatHistory.push({ role: "assistant", content: fullText });
    appendMessage("assistant", displayText);

  } catch (err: unknown) {
    removeTyping();
    const msg = err instanceof Error ? err.message : String(err);
    appendMessage("system-info", `Error: ${msg}`);
  } finally {
    sendBtn.disabled = false;
    chatInput.disabled = false;
    chatInput.focus();
  }
}

// ── Intent matching ────────────────────────────────────────────────────────

interface MatchResult {
  matched: boolean;
  hits: string[];   // reasons it matches
  misses: string[]; // reasons it doesn't match
}

function matchesIntent(product: Product): MatchResult {
  if (!currentIntent) return { matched: true, hits: [], misses: [] };

  const { categories, max_price, colors, keywords } = currentIntent;
  const haystack = [
    product.name, product.brand, product.category,
    product.description, product.color, product.zone_name,
    ...(product.tags ?? []), product.material ?? ""
  ].join(" ").toLowerCase();

  const hits: string[] = [];
  const misses: string[] = [];

  if (max_price != null) {
    if (product.price_chf <= max_price) hits.push(`under CHF ${max_price}`);
    else misses.push(`CHF ${product.price_chf} exceeds budget of CHF ${max_price}`);
  }

  if (categories && categories.length > 0) {
    const matched = categories.filter(
      (c) => haystack.includes(c.toLowerCase()) || product.category.toLowerCase().includes(c.toLowerCase())
    );
    if (matched.length > 0) hits.push(`category: ${matched.join(", ")}`);
    else misses.push(`category doesn't match (looking for ${categories.join(" / ")})`);
  }

  if (colors && colors.length > 0) {
    const matched = colors.filter((c) => haystack.includes(c.toLowerCase()));
    if (matched.length > 0) hits.push(`color: ${matched.join(", ")}`);
    else misses.push(`color doesn't match (looking for ${colors.join(" / ")})`);
  }

  if (keywords && keywords.length > 0) {
    const matched = keywords.filter((k) => haystack.includes(k.toLowerCase()));
    const unmatched = keywords.filter((k) => !haystack.includes(k.toLowerCase()));
    if (matched.length > 0) hits.push(`features: ${matched.join(", ")}`);
    if (unmatched.length > 0) misses.push(`missing: ${unmatched.join(", ")}`);
  }

  return { matched: misses.length === 0, hits, misses };
}

// ── Product card rendering ─────────────────────────────────────────────────

function showProduct(code: string) {
  const product = productMap.get(code);
  if (!product) {
    resultPanel.innerHTML = `<div class="result-card unknown"><strong>${code}</strong><br>Not found in catalog</div>`;
    return;
  }

  const { matched, hits, misses } = matchesIntent(product);
  const discountBadge = product.discount_pct > 0
    ? `<span class="badge discount">-${product.discount_pct}%</span>` : "";
  const matchBadge = currentIntent
    ? (matched ? `<span class="badge match-badge">✓ Match</span>` : `<span class="badge" style="background:#333;color:#999">✗ No match</span>`)
    : "";
  const finalPrice = product.price_chf * (1 - product.discount_pct / 100);

  const reasonsHtml = currentIntent ? `
    <div class="match-reasons">
      ${hits.map(h => `<span class="reason hit">✓ ${h}</span>`).join("")}
      ${misses.map(m => `<span class="reason miss">✗ ${m}</span>`).join("")}
    </div>` : "";

  resultPanel.innerHTML = `
    <div class="result-card ${currentIntent ? (matched ? "match" : "no-match") : ""}">
      <div class="result-header">
        <span class="category">${product.zone_name}</span>
        <div style="display:flex;gap:0.3rem">${matchBadge}${discountBadge}</div>
      </div>
      <div class="result-name">${product.name}</div>
      <div class="result-meta">${product.brand} · ${product.color} · Size ${product.size}</div>
      <div class="result-price">CHF ${finalPrice.toFixed(2)}${product.discount_pct > 0 ? ` <s class="original">CHF ${product.price_chf.toFixed(2)}</s>` : ""}</div>
      ${reasonsHtml}
      <div class="result-footer">
        <span>📍 Aisle ${product.aisle}</span>
        <span>📦 ${product.stock_total} in stock</span>
      </div>
      <div class="result-desc">${product.description}</div>
    </div>
  `;
}

// ── Scanner ────────────────────────────────────────────────────────────────

async function startScanner() {
  startBtn.disabled = true;
  resultPanel.innerHTML = `<div class="result-hint">Initializing camera…</div>`;

  if (!scannerInitialized) {
    const context = await DataCaptureContext.forLicenseKey(LICENSE_KEY, {
      libraryLocation: new URL("/sdc-lib/", window.location.href).toString(),
      moduleLoaders: [barcodeCaptureLoader()],
    });

    const settings = new BarcodeArSettings();
    settings.enableSymbologies([
      Symbology.EAN13UPCA,
      Symbology.EAN8,
      Symbology.UPCE,
      Symbology.Code128,
      Symbology.Code39,
    ]);

    const barcodeAr = await BarcodeAr.forContext(context, settings);

    barcodeAr.addListener({
      didUpdateSession(_barcodeAr: BarcodeAr, session: BarcodeArSession) {
        const barcodes = Object.values(session.allTrackedBarcodes);
        if (barcodes.length === 0) return;
        const code = barcodes[0].barcode.data ?? "";
        if (code) requestAnimationFrame(() => showProduct(code));
      }
    });

    barcodeArView = await BarcodeArView.create(container, context, barcodeAr);
    scannerInitialized = true;
  }

  await barcodeArView!.start();
  running = true;

  startBtn.textContent = "Stop";
  startBtn.disabled = false;
  resultPanel.innerHTML = `<div class="result-hint">Point camera at a barcode</div>`;
}

async function stopScanner() {
  if (!barcodeArView) return;
  startBtn.disabled = true;
  try {
    await barcodeArView.stop();
  } catch {
    // ignore teardown errors
  }
  running = false;
  startBtn.textContent = "Start Camera";
  startBtn.disabled = false;
  resultPanel.innerHTML = "";
}

// ── Screen transitions ─────────────────────────────────────────────────────

function showScanScreen() {
  chatScreen.style.display = "none";
  scanScreen.style.display = "flex";
  scanIntentLabel.textContent = currentIntent?.summary ?? "Scanning all products";
}

async function showChatScreen() {
  if (running) await stopScanner();
  scanScreen.style.display = "none";
  chatScreen.style.display = "flex";
}

// ── Event listeners ────────────────────────────────────────────────────────

sendBtn.addEventListener("click", () => {
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = "";
  appendMessage("user", text);
  sendMessage(text);
});

chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendBtn.click();
  }
});

scanTriggerBtn.addEventListener("click", showScanScreen);
backBtn.addEventListener("click", showChatScreen);

startBtn.addEventListener("click", () => {
  if (running) stopScanner();
  else startScanner().catch((err) => {
    console.error(err);
    resultPanel.innerHTML = `<div class="result-hint error">Error: ${err.message}</div>`;
    startBtn.disabled = false;
  });
});

// ── Boot ───────────────────────────────────────────────────────────────────

(async () => {
  await loadProducts();

  // Show API key row only if no key is baked in via env
  if (!ENV_API_KEY?.trim()) {
    const apiKeyRow = document.getElementById("api-key-row") as HTMLDivElement;
    apiKeyRow.style.display = "flex";
  }

  appendMessage("assistant", "Hi! I'm your in-store shopping assistant. What are you looking for today? Tell me what you need and I'll help you find the right products.");
})();
