export function formatCurrency(amount, currency = 'EGP') {
  if (amount === null || amount === undefined || isNaN(amount)) return '0 ' + currency;
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  } catch {
    return String(dateString);
  }
}

export function formatArea(areaSqm) {
  if (!areaSqm) return '—';
  return `${areaSqm} م²`;
}
