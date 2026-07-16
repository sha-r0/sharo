export default class QuotationCalculationService {

    //////////////////////////////////////////////////////
    // Calculate One Item
    //////////////////////////////////////////////////////

    static calculateItem(item) {

        const qty = Number(item.qty || 0);

        const rate = Number(item.rate || 0);

        const discount = Number(item.discount || 0);

        const gst = Number(item.gst || 0);

        //////////////////////////////////////////

        const basicAmount = qty * rate;

        const taxableAmount = Math.max(

            basicAmount - discount,

            0

        );

        const gstAmount =

            taxableAmount * gst / 100;

        const total =

            taxableAmount + gstAmount;

        return {

            ...item,

            basicAmount,

            taxableAmount,

            gstAmount,

            total,

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

        const discount = items.reduce(

            (sum, item) =>

                sum + Number(item.discount || 0),

            0

        );

        //////////////////////////////////////////////////

        const taxable = items.reduce(

            (sum, item) =>

                sum + item.taxableAmount,

            0

        );

        //////////////////////////////////////////////////

        const gst = items.reduce(

            (sum, item) =>

                sum + item.gstAmount,

            0

        );

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

            cgst: gst / 2,

            sgst: gst / 2,

            igst: gst,

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