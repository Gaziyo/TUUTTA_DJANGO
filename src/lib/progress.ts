export const getProgressClass = (value: number): string => {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const rounded = Math.round(clamped / 5) * 5;
  return `progress-w-${rounded}`;
};
