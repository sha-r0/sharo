export default class QuotationExportService {
  static isSafari() {
    const userAgent = navigator.userAgent;
    return /Safari/i.test(userAgent) && !/(Chrome|Chromium|CriOS|Edg|OPR|Android)/i.test(userAgent);
  }

  static sanitizeFileName(value) {
    return String(value || "quotation")
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
      .replace(/\s+/g, " ")
      .trim() || "quotation";
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
    const documentElement = element.querySelector?.("#quotation-preview") || element;
    const fontsReady = document.fonts?.ready || Promise.resolve();
    await Promise.race([
      fontsReady.catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
    await this.waitForImages(documentElement);
    return this.optimizeImagesForPrint(documentElement);
  }

  static async optimizeImagesForPrint(element) {
    const optimized = [];
    const images = Array.from(element.querySelectorAll("img"));

    for (const image of images) {
      const originalSource = image.currentSrc || image.src;
      const isVector = /^data:image\/svg\+xml/i.test(originalSource) || /\.svg(?:\?|$)/i.test(originalSource);
      const isQr = /qr/i.test(image.alt || "");
      const maximumDimension = isQr ? 240 : 600;
      const largestDimension = Math.max(image.naturalWidth, image.naturalHeight);

      if (isVector || !largestDimension || largestDimension <= maximumDimension) continue;

      const ratio = maximumDimension / largestDimension;
      const width = Math.max(1, Math.round(image.naturalWidth * ratio));
      const height = Math.max(1, Math.round(image.naturalHeight * ratio));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(image, 0, 0, width, height);

      try {
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.88));
        if (!blob) continue;
        const objectUrl = URL.createObjectURL(blob);
        optimized.push({
          image,
          originalSource,
          objectUrl,
          sourceDimensions: `${image.naturalWidth}x${image.naturalHeight}`,
          printDimensions: `${width}x${height}`,
          printBytes: blob.size,
        });
        image.src = objectUrl;
      } catch (error) {
        console.warn("Unable to optimize a quotation image for PDF:", error);
      }
    }

    if (optimized.length) {
      await this.waitForImages(element);
      console.info("Quotation PDF image optimization:", optimized.map(({ sourceDimensions, printDimensions, printBytes }) => ({ sourceDimensions, printDimensions, printBytes })));
    }

    return () => {
      optimized.forEach(({ image, originalSource, objectUrl }) => {
        image.src = originalSource;
        URL.revokeObjectURL(objectUrl);
      });
    };
  }

  static exportPDF(element, quotationNumber = "quotation") {
    if (!element) return Promise.reject(new Error("Quotation preview is not available."));
    const documentElement = element.querySelector?.("#quotation-preview") || element;
    const parent = documentElement.parentNode;
    const nextSibling = documentElement.nextSibling;
    const printRoot = document.createElement("div");
    const previousTitle = document.title;
    const printMedia = window.matchMedia?.("print");
    const isSafari = this.isSafari();

    printRoot.id = "quotation-print-root";
    document.body.appendChild(printRoot);
    printRoot.appendChild(documentElement);
    document.body.classList.add("quotation-pdf-print");
    document.title = this.sanitizeFileName(quotationNumber);

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
        document.body.classList.remove("quotation-pdf-print");
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
  }
}
