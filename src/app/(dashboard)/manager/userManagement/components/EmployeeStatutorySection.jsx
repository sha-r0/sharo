"use client";

export default function EmployeeStatutorySection({ salaryStructure, statutoryDetails, onChange }) {
  const updateFlag = (key, value) => onChange({ salaryStructure: { ...salaryStructure, [key]: value === "yes" }, statutoryDetails });
  const updateNumber = (key, value) => onChange({ salaryStructure, statutoryDetails: { ...statutoryDetails, [key]: value } });
  const inputClass = "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-700 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

  return <section aria-labelledby="employee-statutory-title" className="rounded-3xl border border-slate-200 bg-white p-8">
    <h2 id="employee-statutory-title" className="text-xl font-bold text-slate-800">PF &amp; ESI Details</h2>
    <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
      {[
        { flag: "includePf", key: "uan", label: "PF Applicable", numberLabel: "UAN Number", digits: 12 },
        { flag: "includeEsi", key: "ipNumber", label: "ESI Applicable", numberLabel: "ESIC/IP Number", digits: 10 },
      ].map((field) => <div key={field.key} className="space-y-5">
        <label className="block text-sm font-semibold text-slate-700">{field.label}
          <select name={`salaryStructure.${field.flag}`} value={salaryStructure[field.flag] === true ? "yes" : "no"} onChange={(event) => updateFlag(field.flag, event.target.value)} className={`${inputClass} mt-2`}>
            <option value="yes">Yes</option><option value="no">No</option>
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-700">{field.numberLabel}{salaryStructure[field.flag] === true && <span className="ml-1 text-red-500">*</span>}
          <input type="text" inputMode="numeric" name={`statutoryDetails.${field.key}`} value={statutoryDetails[field.key] ?? ""} onChange={(event) => updateNumber(field.key, event.target.value)} required={salaryStructure[field.flag] === true} pattern={`[0-9]{${field.digits}}`} title={`Enter exactly ${field.digits} digits.`} aria-describedby={`employee-${field.key}-help`} className={`${inputClass} mt-2`} />
        </label>
        <p id={`employee-${field.key}-help`} className="text-xs text-slate-500">{field.digits} digits. Required only when {field.label.split(" ")[0]} is applicable.</p>
      </div>)}
    </div>
  </section>;
}
