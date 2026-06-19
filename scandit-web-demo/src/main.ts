import {
  DataCaptureContext,
} from "@scandit/web-datacapture-core";
import {
  BarcodeAr,
  BarcodeArSettings,
  BarcodeArView,
  Symbology,
  barcodeCaptureLoader,
} from "@scandit/web-datacapture-barcode";

const LICENSE_KEY = "AhNHji+1CE3bEFujtu6n894sXhF6A9okxQTlK+D1UNQSfYeNVWHNjoRSWM4qCSftvk0WdTxiAdjMcT2eG0bkrN1/HOUpPTQEc0nPsqw3YosIMaiLSCbIulsm2zRNM9nqu/FdXoF7N47rNW8dXU28UnN/c67+fqqHyrVfpUnqKMStT3r2hZ8gjsR7HKjuyzDctNbczoxtTHoBiLbIbM5YVQ1HGsn0RrMeo4McjEbXj1xpbH91fsn4lC58C4Lh6BzwOdezNaivzYC8eNwMHV0Rpn7N/dQU5vjjMd2CvBJHP2FitZNxdhl2fAXHhi1i1wKKb7fMC3/IzwTvR0t8ocbjIgMculOCvvcaKTrcDlzK9zufD/wJKWw7m6/tVil5QxqCG92acTwX2suf2bJerNjOj5JXayYMI8v++aIiOtS5uaTD3rt88JLy9euV/BGVS+ZJi8Ap9YhVKAxQJNN5zWVxMMGKpEfiL5q4UUKvz9TCoKJoUuhvRZzdadErqhnLFCWShYisKI3sbLYNokRdHWvrdvb0UXDnjotoTZRbF3NIPI/lX9g1z67XSvdBqdo1bOGNl/ZOQb4cWL+NkTARWFvhqcfbMKrYqzXgMaQDYwJesi753dVwFYLGk8bSPQqk/0aukkKEP/f6Rosu8VJNZWBhLN2PCzZBYxRNDkNZciAtK+x+YVGPE5NbOLqBPetFFcnDXB0t5ele9+PZ34Be4i01JDoyyGp076FLvSGQ2DtMgfdn7UWVUKnPs2/ca2dP52AiRgTIlBEHlkXDasRHJQtgJROnw2KzBQxlnNT/O1Ss";

const btn = document.getElementById("start-btn") as HTMLButtonElement;
const container = document.getElementById("scanner-container") as HTMLDivElement;
const status = document.getElementById("status") as HTMLDivElement;

let barcodeArView: BarcodeArView | null = null;
let running = false;

async function startScanner() {
  btn.disabled = true;
  status.textContent = "Initializing…";

  const context = await DataCaptureContext.forLicenseKey(LICENSE_KEY, {
    libraryLocation: "https://cdn.jsdelivr.net/npm/@scandit/web-datacapture-core@latest/sdc-lib/",
    moduleLoaders: [barcodeCaptureLoader()],
  });

  const settings = new BarcodeArSettings();
  settings.enableSymbologies([
    Symbology.EAN13UPCA,
    Symbology.EAN8,
    Symbology.UPCE,
    Symbology.Code128,
    Symbology.Code39,
    Symbology.QR,
    Symbology.DataMatrix,
  ]);

  const barcodeAr = await BarcodeAr.forContext(context, settings);

  barcodeArView = await BarcodeArView.create(container, context, barcodeAr);

  await barcodeArView.start();
  running = true;

  btn.textContent = "Stop Scanning";
  btn.disabled = false;
  status.textContent = "Scanning — point camera at barcodes";
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
  status.textContent = "Ready";
}

btn.addEventListener("click", () => {
  if (running) stopScanner();
  else startScanner().catch((err) => {
    console.error(err);
    status.textContent = `Error: ${err.message}`;
    btn.disabled = false;
  });
});
