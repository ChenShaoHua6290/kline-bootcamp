export function isTransientIndicatorEmpty(want: string[], actual: string[]) {
  return want.length > 0 && actual.length === 0;
}

