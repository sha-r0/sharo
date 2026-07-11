import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export function exportExpenseExcel(expenses, fromDate, toDate) {

    const rows = expenses.map((expense) => ({

        Date: expense.date,

        Employee: expense.employeeName,

        Project: expense.projectName,

        Category: expense.category,

        Description: expense.description,

        Amount: expense.amount,

        Status: expense.status,

    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Expenses"
    );

    const excelBuffer = XLSX.write(
        workbook,
        {
            bookType: "xlsx",
            type: "array",
        }
    );

    saveAs(
        new Blob([excelBuffer]),
        `Expenses_${fromDate}_to_${toDate}.xlsx`
    );

}