/**
 * Utility functions for Scrum PM Metrics & Project Financials (NPV/IRR tool and estimates)
 */

export function calculateNPV(initialInvestment: number, cashFlows: number[], discountRatePct: number): number {
  if (initialInvestment < 0) initialInvestment = 0;
  const r = discountRatePct / 100;
  let npv = -initialInvestment;
  for (let t = 0; t < cashFlows.length; t++) {
    const cf = cashFlows[t] || 0;
    npv += cf / Math.pow(1 + r, t + 1);
  }
  return npv;
}

/**
 * Iteratively solves IRR using simple binary search for -100% < r < 2000%
 */
export function calculateIRR(initialInvestment: number, cashFlows: number[]): number | null {
  if (initialInvestment <= 0) return null;
  
  // Total of cash flows must exceed initial investment for IRR to be positive,
  // otherwise if all cash inflows are zero or negative, return null or extreme negative.
  const totalInflows = cashFlows.reduce((sum, val) => sum + (val || 0), 0);
  if (totalInflows <= 0) return -100; // Or null representing negative infinite return

  const f = (r: number) => {
    let sum = -initialInvestment;
    for (let t = 0; t < cashFlows.length; t++) {
      const cf = cashFlows[t] || 0;
      sum += cf / Math.pow(1 + r, t + 1);
    }
    return sum;
  };

  let low = -0.95; // -95% Limit
  let high = 20.0; // 2000% Max Search Boundary
  
  // Ensure we have different signs on boundaries helper
  const fLow = f(low);
  const fHigh = f(high);
  
  if (fLow * fHigh > 0) {
    // If they have same sign, standard search or extreme case
    if (fLow > 0) return -100;
    return null;
  }

  // Bisection iteration
  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2;
    const fMid = f(mid);
    if (Math.abs(fMid) < 0.00001) {
      return mid * 100;
    }
    if (f(low) * fMid < 0) {
      high = mid;
    } else {
      low = mid;
    }
  }
  return ((low + high) / 2) * 100;
}
