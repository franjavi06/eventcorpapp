const dateTimeFmt = new Intl.DateTimeFormat("es-SV", {
  dateStyle: "medium",
  timeStyle: "short",
});

const dateFmt = new Intl.DateTimeFormat("es-SV", { dateStyle: "medium" });

export function formatDateTime(d: Date | string): string {
  return dateTimeFmt.format(new Date(d));
}

export function formatDate(d: Date | string): string {
  return dateFmt.format(new Date(d));
}

/** Date → valor para input[type=datetime-local] en hora local. */
export function toDateTimeLocal(d: Date | string): string {
  const date = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
