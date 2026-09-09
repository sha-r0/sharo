export default class PurchaseOrderExportService {
  static isSafari() {
    const userAgent = navigator.userAgent;
    return /Safari/i.test(userAgent) && !/(Chrome|Chromium|CriOS|Edg|OPR|Android)/i.test(userAgent);
  }

  static async waitForImages(element) {
    const images = Array.from(element.querySelectorAll("img"));
    await Promise.all(images.map(async (image) => {
      if (image.complete && image.naturalWidth > 0) return;
      await Promise.race([
        typeof image.decode === "function" ? image.decode().catch(() => {}) : Promise.resolve(),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    }));
  }

  static async prepareDocument(element) {
    if (!element) return () => {};
    const documentElement = element.querySelector?.("#purchase-order-preview") || element;
    const fontsReady = document.fonts?.ready || Promise.resolve();
    await Promise.race([
      fontsReady.catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
    await this.waitForImages(documentElement);
    return () => {};
  }

  static printDocument(element, purchaseOrderNumber = "purchase-order") {
    if (!element) return Promise.reject(new Error("Purchase order preview is not available."));
    const documentElement = element.querySelector?.("#purchase-order-preview") || element;

    return this.prepareDocument(documentElement).then(() => {
      const parent = documentElement.parentNode;
      const nextSibling = documentElement.nextSibling;
      const printRoot = document.createElement("div");
      const previousTitle = document.title;
      const printMedia = window.matchMedia?.("print");
      const isSafari = this.isSafari();

      printRoot.id = "purchase-order-print-root";
      document.body.appendChild(printRoot);
      printRoot.appendChild(documentElement);
      document.body.classList.add("purchase-order-pdf-print");
      document.title = String(purchaseOrderNumber || "purchase-order").trim() || "purchase-order";

      return new Promise((resolve, reject) => {
        let cleaned = false;
        let enteredPrintMedia = false;
        let focusTimer;
        const safetyTimer = setTimeout(cleanup, 300000);

        function cleanup(error) {
          if (cleaned) return;
          cleaned = true;
          clearTimeout(safetyTimer);
          clearTimeout(focusTimer);
          window.removeEventListener("afterprint", onAfterPrint);
          window.removeEventListener("focus", onFocus);
          if (printMedia?.removeEventListener) printMedia.removeEventListener("change", onPrintMediaChange);
          else printMedia?.removeListener?.(onPrintMediaChange);
          document.body.classList.remove("purchase-order-pdf-print");
          document.title = previousTitle;
          if (parent) parent.insertBefore(documentElement, nextSibling);
          printRoot.remove();
          if (error) reject(error);
          else resolve();
        }

        function onAfterPrint() {
          if (!isSafari || enteredPrintMedia) {
            cleanup();
            return;
          }
          clearTimeout(focusTimer);
          focusTimer = setTimeout(() => {
            if (document.hasFocus() && !printMedia?.matches) cleanup();
          }, 500);
        }

        function onPrintMediaChange(event) {
          if (event.matches) enteredPrintMedia = true;
          else if (enteredPrintMedia) cleanup();
        }

        function onFocus() {
          clearTimeout(focusTimer);
          focusTimer = setTimeout(() => {
            if (!printMedia?.matches) cleanup();
          }, 500);
        }

        window.addEventListener("afterprint", onAfterPrint, { once: true });
        window.addEventListener("focus", onFocus);
        if (printMedia?.addEventListener) printMedia.addEventListener("change", onPrintMediaChange);
        else printMedia?.addListener?.(onPrintMediaChange);

        try {
          window.print();
        } catch (error) {
          cleanup(error);
        }
      });
    });
  }
}
