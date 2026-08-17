export default class QuotationExportService {
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
      try {
        await image.decode();
      } catch {
        await new Promise((resolve) => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
        });
      }
    }));
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

  static async exportPDF(element, quotationNumber = "quotation") {
    if (!element) throw new Error("Quotation preview is not available.");
    const documentElement = element.querySelector?.("#quotation-preview") || element;
    const parent = documentElement.parentNode;
    const nextSibling = documentElement.nextSibling;
    const printRoot = document.createElement("div");
    const previousTitle = document.title;
    let restoreImages = () => {};

    try {
      await document.fonts?.ready;
      await this.waitForImages(documentElement);
      restoreImages = await this.optimizeImagesForPrint(documentElement);

      printRoot.id = "quotation-print-root";
      document.body.appendChild(printRoot);
      printRoot.appendChild(documentElement);
      document.body.classList.add("quotation-pdf-print");
      document.title = this.sanitizeFileName(quotationNumber);

      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      window.print();
    } finally {
      document.body.classList.remove("quotation-pdf-print");
      document.title = previousTitle;
      restoreImages();
      if (parent) parent.insertBefore(documentElement, nextSibling);
      printRoot.remove();
    }
  }
}
