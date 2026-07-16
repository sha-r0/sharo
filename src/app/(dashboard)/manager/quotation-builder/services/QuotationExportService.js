export default class QuotationExportService {
  static async exportPDF(element, quotationNumber = "quotation") {
    if (!element) throw new Error("Quotation preview is not available.");
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const width = 210;
    const height = (canvas.height * width) / canvas.width;
    const image = canvas.toDataURL("image/png");
    let remaining = height;
    let position = 0;
    pdf.addImage(image, "PNG", 0, position, width, height);
    remaining -= 297;
    while (remaining > 0) {
      position = remaining - height;
      pdf.addPage();
      pdf.addImage(image, "PNG", 0, position, width, height);
      remaining -= 297;
    }
    pdf.save(`${String(quotationNumber).replaceAll("/", "-")}.pdf`);
  }
}
