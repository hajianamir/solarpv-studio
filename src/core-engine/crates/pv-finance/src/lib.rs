/// Calculates Net Present Value (NPV) given discount rate and cashflow series.
pub fn npv(rate: f64, cashflows: &[f64]) -> f64 {
    cashflows
        .iter()
        .enumerate()
        .map(|(t, &cf)| cf / (1.0f64 + rate).powi(t as i32))
        .sum()
}

/// Calculates Internal Rate of Return (IRR) using Newton-Raphson method with bisection fallback.
pub fn irr(cashflows: &[f64]) -> f64 {
    if cashflows.is_empty() {
        return 0.0;
    }

    let mut rate = 0.10f64;
    let max_iterations = 100;
    let tolerance = 1e-7;

    for _ in 0..max_iterations {
        let f: f64 = cashflows
            .iter()
            .enumerate()
            .map(|(t, &cf)| cf / (1.0f64 + rate).powi(t as i32))
            .sum();

        let df: f64 = cashflows
            .iter()
            .enumerate()
            .map(|(t, &cf)| -(t as f64) * cf / (1.0f64 + rate).powi(t as i32 + 1))
            .sum();

        if df.abs() < 1e-12 {
            break;
        }

        let next_rate = rate - f / df;
        if (next_rate - rate).abs() < tolerance {
            return next_rate;
        }
        rate = next_rate;
    }

    // Bisection fallback
    let mut low = -0.99f64;
    let mut high = 2.0f64;
    for _ in 0..100 {
        let mid = (low + high) / 2.0;
        let f_mid = npv(mid, cashflows);
        if f_mid.abs() < tolerance {
            return mid;
        }
        if f_mid > 0.0 {
            low = mid;
        } else {
            high = mid;
        }
    }
    (low + high) / 2.0
}

/// Calculates Levelized Cost of Energy (LCOE).
pub fn lcoe(capex: f64, opex_annual: f64, energy_annual: f64, discount_rate: f64, lifetime_years: u32) -> f64 {
    if energy_annual <= 0.0 || lifetime_years == 0 {
        return 0.0;
    }

    let total_cost_pv: f64 = capex
        + (1..=lifetime_years)
            .map(|t| opex_annual / (1.0f64 + discount_rate).powi(t as i32))
            .sum::<f64>();

    let total_energy_pv: f64 = (1..=lifetime_years)
        .map(|t| energy_annual / (1.0f64 + discount_rate).powi(t as i32))
        .sum::<f64>();

    if total_energy_pv == 0.0 {
        0.0
    } else {
        total_cost_pv / total_energy_pv
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_npv() {
        let cashflows = vec![-1000.0, 300.0, 400.0, 500.0];
        let val = npv(0.05, &cashflows);
        assert!(val > 0.0);
    }

    #[test]
    fn test_irr() {
        let cashflows = vec![-1000.0, 400.0, 400.0, 400.0];
        let r = irr(&cashflows);
        assert!((r - 0.097).abs() < 0.01);
    }

    #[test]
    fn test_lcoe() {
        let val = lcoe(10000.0, 200.0, 5000.0, 0.05, 25);
        assert!(val > 0.0);
    }
}
