export function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}
