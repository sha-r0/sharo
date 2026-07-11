"use client";

export default function WeekSelector({
  value = [],
  onChange,
}) {
  function toggle(week) {

    let weeks = [...value];

    if (weeks.includes(week)) {
      weeks = weeks.filter(
        (w) => w !== week
      );
    } else {
      weeks.push(week);
    }

    onChange(weeks);
  }

  return (
    <div>

      <label className="mb-2 block text-sm font-medium text-slate-700">
        Applicable Weeks
      </label>

      <div className="flex flex-wrap gap-3">

        {[1,2,3,4,5].map((week)=>(
          <button
            type="button"
            key={week}
            onClick={()=>toggle(week)}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition
            ${
              value.includes(week)
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-indigo-400"
            }`}
          >
            {week}
          </button>
        ))}

      </div>

    </div>
  );
}