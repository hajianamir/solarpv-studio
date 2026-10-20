#[derive(Debug, PartialEq)]
pub struct StringSizingResult {
    pub min_modules: u32,
    pub max_modules: u32,
    pub warnings: Vec<String>,
}

/// Sizing PV module string length per IEC 62548:2024.
pub fn string_sizing(
    panel_voc: f64,
    panel_vmp: f64,
    temp_min_c: f64,
    temp_max_c: f64,
    beta_voc_per_c: f64, // e.g. -0.0028 for -0.28%/C
    inverter_vdc_max: f64,
    inverter_mppt_min: f64,
    inverter_mppt_max: f64,
) -> StringSizingResult {
    let mut warnings = Vec::new();

    let voc_max_temp = panel_voc * (1.0 + beta_voc_per_c * (temp_min_c - 25.0));
    let vmp_min_temp = panel_vmp * (1.0 + beta_voc_per_c * (temp_max_c - 25.0));

    let max_modules_vmax = (inverter_vdc_max / voc_max_temp).floor() as u32;
    let max_modules_mppt = (inverter_mppt_max / panel_vmp).floor() as u32;
    let max_modules = max_modules_vmax.min(max_modules_mppt);

    let min_modules = (inverter_mppt_min / vmp_min_temp).ceil() as u32;

    if min_modules > max_modules {
        warnings.push("Minimum required modules exceeds maximum allowed string voltage.".to_string());
    }

    StringSizingResult {
        min_modules,
        max_modules,
        warnings,
    }
}

/// Computes DC cable voltage drop percentage per IEC 60364-5-52.
/// `rho` is conductor resistivity in ohm-mm2/m (e.g., 0.0175 for copper at 20C).
pub fn voltage_drop_dc(
    length_m: f64,
    current_a: f64,
    cross_section_mm2: f64,
    v_nominal: f64,
    rho: f64,
) -> f64 {
    if cross_section_mm2 <= 0.0 || v_nominal <= 0.0 {
        return 0.0;
    }
    let resistance = rho * (2.0 * length_m) / cross_section_mm2;
    let v_drop = resistance * current_a;
    (v_drop / v_nominal) * 100.0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_string_sizing() {
        let res = string_sizing(50.0, 42.0, -10.0, 60.0, -0.0028, 1000.0, 200.0, 800.0);
        assert!(res.min_modules > 0);
        assert!(res.max_modules >= res.min_modules);
    }

    #[test]
    fn test_voltage_drop_dc() {
        let v_drop_pct = voltage_drop_dc(50.0, 13.0, 4.0, 600.0, 0.0175);
        assert!(v_drop_pct > 0.0 && v_drop_pct < 5.0);
    }
}
