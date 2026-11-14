/** "hace 2 h", "ayer", "hace 3 días": how fresh the request is. */
export function timeAgo(iso: string, now = Date.now()): string {
  const minutes = Math.max(
    0,
    Math.round((now - new Date(iso).getTime()) / 60000),
  );
  if (minutes < 60) return minutes <= 1 ? 'recién' : `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'ayer' : `hace ${days} días`;
}
