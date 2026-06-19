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
}

let productMap: Map<string, Product> = new Map();

async function loadProducts() {
  const res = await fetch("/products.json");
  const data: Product[] = await res.json();
  for (const p of data) productMap.set(p.product_code, p);
}

const btn = document.getElementById("start-btn") as HTMLButtonElement;
const container = document.getElementById("scanner-container") as HTMLDivElement;
const resultPanel = document.getElementById("result-panel") as HTMLDivElement;

let barcodeArView: BarcodeArView | null = null;
let running = false;

function showProduct(code: string) {
  const product = productMap.get(code);
  if (!product) {
    resultPanel.innerHTML = `<div class="result-card unknown"><strong>${code}</strong><br>Not found in catalog</div>`;
    return;
  }
  const discountBadge = product.discount_pct > 0
    ? `<span class="badge discount">-${product.discount_pct}%</span>`
    : "";
  const finalPrice = product.price_chf * (1 - product.discount_pct / 100);
  resultPanel.innerHTML = `
    <div class="result-card">
      <div class="result-header">
        <span class="category">${product.zone_name}</span>
        ${discountBadge}
      </div>
      <div class="result-name">${product.name}</div>
      <div class="result-meta">${product.brand} · ${product.color} · Size ${product.size}</div>
      <div class="result-price">CHF ${finalPrice.toFixed(2)}${product.discount_pct > 0 ? ` <s class="original">CHF ${product.price_chf.toFixed(2)}</s>` : ""}</div>
      <div class="result-footer">
        <span>📍 Aisle ${product.aisle}</span>
        <span>📦 ${product.stock_total} in stock</span>
      </div>
      <div class="result-desc">${product.description}</div>
    </div>
  `;
}

async function startScanner() {
  btn.disabled = true;
  resultPanel.innerHTML = `<div class="result-hint">Initializing…</div>`;

  await loadProducts();

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

  const listener = {
    didUpdateSession(_barcodeAr: BarcodeAr, session: BarcodeArSession) {
      const barcodes = Object.values(session.allTrackedBarcodes);
      if (barcodes.length === 0) return;
      // Show info for the first tracked barcode
      const code = barcodes[0].barcode.data ?? "";
      if (code) requestAnimationFrame(() => showProduct(code));
    }
  };
  barcodeAr.addListener(listener);

  barcodeArView = await BarcodeArView.create(container, context, barcodeAr);
  await barcodeArView.start();
  running = true;

  btn.textContent = "Stop";
  btn.disabled = false;
  resultPanel.innerHTML = `<div class="result-hint">Point camera at a barcode</div>`;
}

async function stopScanner() {
  if (!barcodeArView) return;
  btn.disabled = true;
  await barcodeArView.stop();
  barcodeArView.remove();
  barcodeArView = null;
  running = false;
  btn.textContent = "Start Scanning";
  btn.disabled = false;
  resultPanel.innerHTML = "";
}

btn.addEventListener("click", () => {
  if (running) stopScanner();
  else startScanner().catch((err) => {
    console.error(err);
    resultPanel.innerHTML = `<div class="result-hint error">Error: ${err.message}</div>`;
    btn.disabled = false;
  });
});
