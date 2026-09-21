const natural = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const integerDescending = (left, right) => left === right ? 0 : left > right ? -1 : 1;
function numberParts(record, prefix) {
  const value = String(record.quotationNumber || "").trim();
  const current = value.toUpperCase().startsWith(`${prefix.toUpperCase()}-`)
    && /^(\d{2}|\d{4})-\d+$/.test(value.slice(prefix.length + 1));
  const pieces = current ? value.slice(prefix.length + 1).split("-") : [];
  const suffix = value.match(/(\d+)(?:-[A-Za-z]+)?$/)?.[1];
  return { value, current, year: current ? Number(pieces[0].length === 2 ? `20${pieces[0]}` : pieces[0]) : 0, sequence: suffix ? BigInt(suffix) : -1n };
}
export function quotationListComparator(prefix = "QT") {
  return (left, right) => {
    const a = numberParts(left, prefix), b = numberParts(right, prefix);
    return Number(b.current) - Number(a.current)
      || b.year - a.year
      || integerDescending(a.sequence, b.sequence)
      || natural.compare(b.value, a.value)
      || String(left.id).localeCompare(String(right.id));
  };
}
