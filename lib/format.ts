export function formatMoney(amount: number, currency = '$'): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency}${formatted}`;
}

export function formatSigned(amount: number, currency = '$'): string {
  const prefix = amount < 0 ? '-' : '+';
  return `${prefix}${formatMoney(amount, currency)}`;
}

export function formatDateIso(iso: string, now: Date = new Date()): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((today.getTime() - date.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function monthLabel(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}