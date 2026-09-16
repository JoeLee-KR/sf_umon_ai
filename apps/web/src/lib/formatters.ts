export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0 || isNaN(bytes)) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];

  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  const unitIndex = Math.min(i, sizes.length - 1);
  const value = bytes / Math.pow(k, unitIndex);

  return `${value.toFixed(dm)} ${sizes[unitIndex]}`;
}

export function formatBytesCompact(bytes: number): string {
  if (bytes === 0 || isNaN(bytes)) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  const unitIndex = Math.min(i, sizes.length - 1);
  const value = bytes / Math.pow(k, unitIndex);

  const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
  return `${formatted} ${sizes[unitIndex]}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return dateStr.substring(0, 10);
}

export function formatCredits(
  credits: number,
  decimals: number = 4,
  exactDecimals: boolean = false
): string {
  if (credits === 0 || isNaN(credits)) {
    if (exactDecimals) {
      return (0).toFixed(decimals);
    }
    return decimals === 6 ? '0.000000' : '0.0000';
  }
  return credits.toLocaleString(undefined, {
    minimumFractionDigits: exactDecimals ? decimals : Math.min(2, decimals),
    maximumFractionDigits: decimals,
  });
}

export function formatCreditsCompact(credits: number): string {
  if (credits === 0 || isNaN(credits)) return '0';
  if (Math.abs(credits) >= 1_000_000) {
    return `${(credits / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(credits) >= 1_000) {
    return `${(credits / 1_000).toFixed(1)}k`;
  }
  if (credits % 1 === 0) {
    return credits.toFixed(0);
  }
  return credits.toFixed(2);
}

export function formatCurrency(
  amount: number,
  decimals: number = 2,
  includeDollarSign: boolean = true
): string {
  if (amount === 0 || isNaN(amount)) {
    const zero = (0).toFixed(decimals);
    return includeDollarSign ? `$${zero}` : zero;
  }
  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return includeDollarSign ? `$${formatted}` : formatted;
}
