use pv_electrical::{string_sizing, voltage_drop_dc};
use pv_finance::{irr, lcoe, npv};
use pv_math::{poa_irradiance, solar_position};

#[repr(C)]
pub struct FfiSolarPosition {
    pub zenith_deg: f64,
    pub azimuth_deg: f64,
}

#[repr(C)]
pub struct FfiStringSizingResult {
    pub min_modules: u32,
    pub max_modules: u32,
    pub has_warning: u8,
}

#[repr(C)]
pub struct FfiTriangle {
    pub v0_x: f64, pub v0_y: f64, pub v0_z: f64,
    pub v1_x: f64, pub v1_y: f64, pub v1_z: f64,
    pub v2_x: f64, pub v2_y: f64, pub v2_z: f64,
}

#[repr(C)]
pub struct FfiVec3 {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

#[no_mangle]
pub extern "C" fn ffi_solar_position(latitude_deg: f64, longitude_deg: f64, utc_ts: i64) -> FfiSolarPosition {
    let (zenith_deg, azimuth_deg) = solar_position(latitude_deg, longitude_deg, utc_ts);
    FfiSolarPosition { zenith_deg, azimuth_deg }
}

#[no_mangle]
pub extern "C" fn ffi_poa_irradiance(
    ghi: f64,
    dni: f64,
    dhi: f64,
    tilt_deg: f64,
    azimuth_deg: f64,
    sun_zenith_deg: f64,
    sun_azimuth_deg: f64,
) -> f64 {
    poa_irradiance(ghi, dni, dhi, tilt_deg, azimuth_deg, sun_zenith_deg, sun_azimuth_deg)
}

#[no_mangle]
pub extern "C" fn ffi_string_sizing(
    panel_voc: f64,
    panel_vmp: f64,
    temp_min_c: f64,
    temp_max_c: f64,
    beta_voc_per_c: f64,
    inverter_vdc_max: f64,
    inverter_mppt_min: f64,
    inverter_mppt_max: f64,
) -> FfiStringSizingResult {
    let res = string_sizing(
        panel_voc,
        panel_vmp,
        temp_min_c,
        temp_max_c,
        beta_voc_per_c,
        inverter_vdc_max,
        inverter_mppt_min,
        inverter_mppt_max,
    );
    FfiStringSizingResult {
        min_modules: res.min_modules,
        max_modules: res.max_modules,
        has_warning: if res.warnings.is_empty() { 0 } else { 1 },
    }
}

#[no_mangle]
pub extern "C" fn ffi_voltage_drop_dc(
    length_m: f64,
    current_a: f64,
    cross_section_mm2: f64,
    v_nominal: f64,
    rho: f64,
) -> f64 {
    voltage_drop_dc(length_m, current_a, cross_section_mm2, v_nominal, rho)
}

#[no_mangle]
pub extern "C" fn ffi_npv(rate: f64, cashflows_ptr: *const f64, len: usize) -> f64 {
    if cashflows_ptr.is_null() || len == 0 {
        return 0.0;
    }
    let slice = unsafe { std::slice::from_raw_parts(cashflows_ptr, len) };
    npv(rate, slice)
}

#[no_mangle]
pub extern "C" fn ffi_irr(cashflows_ptr: *const f64, len: usize) -> f64 {
    if cashflows_ptr.is_null() || len == 0 {
        return 0.0;
    }
    let slice = unsafe { std::slice::from_raw_parts(cashflows_ptr, len) };
    irr(slice)
}

#[no_mangle]
pub extern "C" fn ffi_lcoe(
    capex: f64,
    opex_annual: f64,
    energy_annual: f64,
    discount_rate: f64,
    lifetime_years: u32,
) -> f64 {
    lcoe(capex, opex_annual, energy_annual, discount_rate, lifetime_years)
}

#[no_mangle]
pub extern "C" fn ffi_shading_factor(
    tris_ptr: *const FfiTriangle,
    tris_len: usize,
    targets_ptr: *const FfiVec3,
    targets_len: usize,
    sundirs_ptr: *const FfiVec3,
    sundirs_len: usize,
    out_factors_ptr: *mut f64,
) -> i32 {
    if tris_ptr.is_null() || targets_ptr.is_null() || sundirs_ptr.is_null() || out_factors_ptr.is_null() {
        return -1;
    }

    let ffi_tris = unsafe { std::slice::from_raw_parts(tris_ptr, tris_len) };
    let ffi_targets = unsafe { std::slice::from_raw_parts(targets_ptr, targets_len) };
    let ffi_sundirs = unsafe { std::slice::from_raw_parts(sundirs_ptr, sundirs_len) };

    let triangles: Vec<pv_shading::Triangle> = ffi_tris
        .iter()
        .map(|t| pv_shading::Triangle {
            v0: pv_shading::Vec3::new(t.v0_x, t.v0_y, t.v0_z),
            v1: pv_shading::Vec3::new(t.v1_x, t.v1_y, t.v1_z),
            v2: pv_shading::Vec3::new(t.v2_x, t.v2_y, t.v2_z),
        })
        .collect();

    let targets: Vec<pv_shading::Vec3> = ffi_targets
        .iter()
        .map(|p| pv_shading::Vec3::new(p.x, p.y, p.z))
        .collect();

    let sundirs: Vec<pv_shading::Vec3> = ffi_sundirs
        .iter()
        .map(|d| pv_shading::Vec3::new(d.x, d.y, d.z))
        .collect();

    let mesh = pv_shading::TriangleMesh::new(triangles);
    let factors = pv_shading::shading_factor(&mesh, &targets, &sundirs);

    let out_slice = unsafe { std::slice::from_raw_parts_mut(out_factors_ptr, sundirs_len) };
    for (i, &f) in factors.iter().enumerate().take(sundirs_len) {
        out_slice[i] = f;
    }

    0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ffi_exports() {
        let pos = ffi_solar_position(35.0, 51.0, 1700000000);
        assert!(pos.zenith_deg >= 0.0);

        let cashflows = vec![-1000.0, 400.0, 400.0, 400.0];
        let val_npv = ffi_npv(0.05, cashflows.as_ptr(), cashflows.len());
        assert!(val_npv > 0.0);
    }
}
