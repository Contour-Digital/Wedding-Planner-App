// Pure client-side CSV generation — no dependency, matching how lightweight
// the rest of this app's dependencies are. Blob + a throwaway <a download>
// is the standard way to trigger a file download from the browser without
// a server round-trip.
function escapeCsvField(value: string | number): string {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  return [headers, ...rows].map((row) => row.map(escapeCsvField).join(",")).join("\r\n");
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const blob = new Blob([toCsv(headers, rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
