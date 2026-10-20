use pv_electrical::string_sizing;
use pv_finance::{lcoe, npv};
use pv_math::{poa_irradiance, solar_position};
use pv_shading::{shading_factor, Triangle, TriangleMesh, Vec3};

#[test]
fn test_end_to_end_calculation_flow() {
    let (zenith, azimuth) = solar_position(35.6895, 139.6917, 1700000000);
    assert!(zenith > 0.0);

    let poa = poa_irradiance(500.0, 600.0, 100.0, 30.0, 180.0, zenith, azimuth);
    assert!(poa >= 0.0);

    let string_res = string_sizing(50.0, 42.0, -10.0, 60.0, -0.0028, 1000.0, 200.0, 800.0);
    assert!(string_res.max_modules >= string_res.min_modules);

    let obstacle = Triangle {
        v0: Vec3::new(-1.0, 1.0, 2.0),
        v1: Vec3::new(1.0, 1.0, 2.0),
        v2: Vec3::new(0.0, -1.0, 2.0),
    };
    let mesh = TriangleMesh::new(vec![obstacle]);
    let factors = shading_factor(&mesh, &[Vec3::new(0.0, 0.0, 0.0)], &[Vec3::new(0.0, 0.0, 1.0)]);
    assert_eq!(factors.len(), 1);

    let npv_val = npv(0.05, &[-10000.0, 2500.0, 2500.0, 2500.0, 2500.0, 2500.0]);
    assert!(npv_val > 0.0);

    let lcoe_val = lcoe(10000.0, 200.0, 6000.0, 0.05, 25);
    assert!(lcoe_val > 0.0);
}
