// Prediction scoring: exact position = 30 points, driver in top 3 but wrong slot = 10 points.
// Maximum per session = 90 points.
export const POINTS_EXACT = 30;
export const POINTS_IN_TOP3 = 10;

export function scorePrediction(pred: string[], truth: string[]): number {
  let s = 0;
  for (let i = 0; i < 3; i++) {
    if (pred[i] && truth[i] && pred[i] === truth[i]) s += POINTS_EXACT;
    else if (pred[i] && truth.includes(pred[i])) s += POINTS_IN_TOP3;
  }
  return s;
}

// Start of the current calendar year in UTC — the yearly leaderboard resets at 1.1. 00:00 UTC.
export function yearStartIso(): string {
  return new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1, 0, 0, 0)).toISOString();
}
