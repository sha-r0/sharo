export default class QuotationCalculationService {

    static TAX_RATES = {
        igst: { igst: 18, cgst: 0, sgst: 0 },
        cgst_sgst: { igst: 0, cgst: 9, sgst: 9 },
        none: { igst: 0, cgst: 0, sgst: 0 },
    };

    //////////////////////////////////////////////////////
    // Calculate One Item
    //////////////////////////////////////////////////////

    static calculateItem(item) {

        const qtyValue = Number(item.qty || 0);

        const rateValue = Number(item.rate || 0);

        const qty = Number.isFinite(qtyValue) ? qtyValue : 0;

        const rate = Number.isFinite(rateValue) ? rateValue : 0;

        const basicAmount = qty * rate;

        return {

            ...item,

            basicAmount,

            taxableAmount: basicAmount,

            gstAmount: 0,

            total: basicAmount,

        };

    }

    //////////////////////////////////////////////////////
    // Calculate Entire Quotation
    //////////////////////////////////////////////////////

    static calculate(form) {

        const items =

            (form.items || []).map(

                this.calculateItem

            );

        //////////////////////////////////////////////////

        const subtotal = items.reduce(

            (sum, item) =>

                sum + item.basicAmount,

            0

        );

        //////////////////////////////////////////////////

        const discount = 0;

        const taxable = subtotal;

        const taxMode = this.TAX_RATES[form.taxMode]
            ? form.taxMode
            : String(form.gstType || "").toLowerCase() === "igst"
                ? "igst"
                : "cgst_sgst";

        const rates = this.TAX_RATES[taxMode];
        const igst = taxable * rates.igst / 100;
        const cgst = taxable * rates.cgst / 100;
        const sgst = taxable * rates.sgst / 100;
        const gst = igst + cgst + sgst;

        //////////////////////////////////////////////////

        const freight = Number(

            form.freight || 0

        );

        const packing = Number(

            form.packing || 0

        );

        const installation = Number(

            form.installation || 0

        );

        const transportation = Number(

            form.transportation || 0

        );

        const otherCharges = Number(

            form.otherCharges || 0

        );

        //////////////////////////////////////////////////

        const extraCharges =

            freight +

            packing +

            installation +

            transportation +

            otherCharges;

        //////////////////////////////////////////////////

        const grandTotal =

            taxable +

            gst +

            extraCharges;

        //////////////////////////////////////////////////

        return {

            items,

            subtotal,

            discount,

            taxable,

            gst,

            taxMode,

            cgst,

            sgst,

            igst,

            freight,

            packing,

            installation,

            transportation,

            otherCharges,

            extraCharges,

            grandTotal,

            amountInWords:

                this.numberToWords(

                    Math.round(

                        grandTotal

                    )

                ),

        };

    }

    //////////////////////////////////////////////////////
    // Amount in Words
    //////////////////////////////////////////////////////

    static numberToWords(number) {

        try {

            return new Intl.NumberFormat(

                "en-IN",

                {

                    style: "spellout",

                }

            ).format(number);

        }

        catch {

            return "";

        }

    }

}
