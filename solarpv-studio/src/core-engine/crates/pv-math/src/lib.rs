use std::f64::consts::PI;

/// Calculates solar zenith and azimuth angles (in degrees) for a given location and UTC timestamp using the NOAA algorithm.
/// `utc_ts` is given in seconds since Unix epoch.
pub fn solar_position(latitude_deg: f64, longitude_deg: f64, utc_ts: i64) -> (f64, f64) {
    let days_since_2000 = (utc_ts as f64 - 946728000.0) / 86400.0;
    let julian_century = days_since_2000 / 36525.0;

    let geom_mean_long_sun = (280.46646 + julian_century * (36000.76983 + julian_century * 0.0003032)) % 360.0;
    let geom_mean_anom_sun = 357.52911 + julian_century * (35999.05029 - 0.0001537 * julian_century);

    let sun_eq_of_ctr = (geom_mean_anom_sun.to_radians()).sin() * (1.914602 - julian_century * (0.004817 + 0.000014 * julian_century))
        + (2.0 * geom_mean_anom_sun.to_radians()).sin() * (0.019993 - 0.000101 * julian_century)
        + (3.0 * geom_mean_anom_sun.to_radians()).sin() * 0.000289;

    let sun_true_long = geom_mean_long_sun + sun_eq_of_ctr;
    let apparent_long = sun_true_long - 0.00569 - 0.00478 * (125.04 - 1934.136 * julian_century).to_radians().sin();

    let mean_obliq_eclip = 23.0 + (26.0 + (21.448 - julian_century * (46.815 + julian_century * (0.00059 - julian_century * 0.001813))) / 60.0) / 60.0;
    let obliq_corr = mean_obliq_eclip + 0.00256 * (125.04 - 1934.136 * julian_century).to_radians().cos();

    let declination = (obliq_corr.to_radians().sin() * apparent_long.to_radians().sin()).asin().to_degrees();

    let var_y = (obliq_corr.to_radians() / 2.0).tan().powi(2);
    let eq_of_time = 4.0 * (var_y * (2.0 * geom_mean_long_sun.to_radians()).sin()
        - 2.0 * (geom_mean_anom_sun.to_radians()).sin() * 0.016708634
        + 4.0 * 0.016708634 * var_y * (geom_mean_anom_sun.to_radians()).sin() * (2.0 * geom_mean_long_sun.to_radians()).cos()
        - 0.5 * var_y * var_y * (4.0 * geom_mean_long_sun.to_radians()).sin()
        - 1.25 * 0.016708634 * 0.016708634 * (2.0 * geom_mean_anom_sun.to_radians()).sin()).to_degrees();

    let seconds_in_day = ((utc_ts % 86400) + 86400) % 86400;
    let time_offset = eq_of_time + 4.0 * longitude_deg;
    let true_solar_time = (seconds_in_day as f64 / 60.0) + time_offset;

    let hour_angle = if (true_solar_time / 4.0) < 0.0 {
        (true_solar_time / 4.0) + 180.0
    } else {
        (true_solar_time / 4.0) - 180.0
    };

    let lat_rad = latitude_deg.to_radians();
    let decl_rad = declination.to_radians();
    let ha_rad = hour_angle.to_radians();

    let cos_zenith = lat_rad.sin() * decl_rad.sin() + lat_rad.cos() * decl_rad.cos() * ha_rad.cos();
    let zenith_rad = cos_zenith.clamp(-1.0, 1.0).acos();
    let zenith_deg = zenith_rad.to_degrees();

    let azimuth_rad = if ha_rad > 0.0 {
        (PI * 2.0) - ((lat_rad.sin() * cos_zenith - decl_rad.sin()) / (lat_rad.cos() * zenith_rad.sin())).clamp(-1.0, 1.0).acos()
    } else {
        ((lat_rad.sin() * cos_zenith - decl_rad.sin()) / (lat_rad.cos() * zenith_rad.sin())).clamp(-1.0, 1.0).acos()
    };
    let azimuth_deg = (azimuth_rad.to_degrees() + 180.0) % 360.0;

    (zenith_deg, azimuth_deg)
}

/// Computes Plane-of-Array (POA) total irradiance using Perez 1990 transposition model.
pub fn poa_irradiance(
    ghi: f64,
    dni: f64,
    dhi: f64,
    tilt_deg: f64,
    azimuth_deg: f64,
    sun_zenith_deg: f64,
    sun_azimuth_deg: f64,
) -> f64 {
    if sun_zenith_deg >= 90.0 {
        return 0.0;
    }

    let tilt_rad = tilt_deg.to_radians();
    let zenith_rad = sun_zenith_deg.to_radians();
    let sun_az_rad = sun_azimuth_deg.to_radians();
    let surface_az_rad = azimuth_deg.to_radians();

    let cos_inc = (zenith_rad.cos() * tilt_rad.cos())
        + (zenith_rad.sin() * tilt_rad.sin() * (sun_az_rad - surface_az_rad).cos());
    let cos_inc_clamp = cos_inc.max(0.0);

    let beam_poa = dni * cos_inc_clamp;

    let a = cos_inc_clamp.max(0.0);
    let b = zenith_rad.cos().max(0.087156); // cos(85 deg)
    let air_mass = 1.0 / (zenith_rad.cos() + 0.15 * (93.885 - sun_zenith_deg).powf(-1.25)).max(0.1);
    let brightness = (dhi * air_mass / 1367.0).max(0.0);
    let clearness = if dhi <= 0.0 {
        1.0
    } else {
        (((dhi + dni) / dhi) + 1.041 * zenith_rad.powi(3)) / (1.0 + 1.041 * zenith_rad.powi(3))
    };

    let (f1, f2) = if clearness < 1.065 {
        (-0.008 + 0.588 * brightness, -0.062 + 0.072 * brightness)
    } else if clearness < 1.23 {
        (0.115 + 0.683 * brightness, -0.060 + 0.040 * brightness)
    } else {
        (0.332 + 0.487 * brightness, -0.062 - 0.023 * brightness)
    };

    let f1_clamp = f1.max(0.0);
    let diffuse_poa = dhi * ((1.0 - f1_clamp) * (1.0 + tilt_rad.cos()) / 2.0 + f1_clamp * (a / b) + f2 * tilt_rad.sin());

    let albedo = 0.2;
    let ground_reflected = ghi * albedo * (1.0 - tilt_rad.cos()) / 2.0;

    (beam_poa + diffuse_poa.max(0.0) + ground_reflected).max(0.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_solar_position() {
        let (zenith, azimuth) = solar_position(35.6895, 139.6917, 1700000000);
        assert!(zenith >= 0.0 && zenith <= 180.0);
        assert!(azimuth >= 0.0 && azimuth <= 360.0);
    }

    #[test]
    fn test_poa_irradiance() {
        let poa = poa_irradiance(500.0, 600.0, 100.0, 30.0, 180.0, 35.0, 180.0);
        assert!(poa > 500.0);
    }
}
