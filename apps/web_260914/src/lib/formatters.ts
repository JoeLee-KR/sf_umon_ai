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

  return `${value.toFixed(1)} ${sizes[unitIndex]}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return dateStr.substring(0, 10);
}
