const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    timeZone: TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: TZ,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
