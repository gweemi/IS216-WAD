export const fitsWindow = (windows, startMs, durationHrs) =>
  windows.some((w) => startMs >= w.start && startMs + durationHrs * 3600000 <= w.end)
