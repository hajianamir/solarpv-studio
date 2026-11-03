#!/usr/bin/env python3
"""Generate pvlib reference fixtures for the SolarPV Studio tracker engine.

Reference implementation: pvlib 0.16.1 (pvlib.tracking.singleaxis,
pvlib.shading.projected_solar_zenith_angle, pvlib.solarposition,
pvlib.irradiance.get_total_irradiance with isotropic sky model).

Outputs JSON to stdout: point fixtures (5 sites x 4 dates x 3 times + slope
cases) and annual representative-day fixtures (5 sites x 12 days x 24 h).

Run:  python3 scripts/generate-pvlib-fixtures.py > /tmp/tracker-fixtures.json
"""
import json
import math

import numpy as np
import pandas as pd
import pvlib
from pvlib import solarposition, tracking, irradiance, clearsky

PVLIB_VERSION = pvlib.__version__

SITES = {
    "Tehran": (35.69, 51.39),
    "Munich": (48.13, 11.61),
    "Berlin": (52.52, 13.40),
    "Phoenix": (33.45, -112.07),
    "Singapore": (1.35, 103.82),
}
DATES = ["2024-03-21", "2024-06-21", "2024-09-23", "2024-12-21"]
SOLAR_TIMES = [9.0, 12.0, 15.0]
GCR = 0.33
MAX_ANGLE = 60.0
AXIS_TILT = 0.0
AXIS_AZIMUTH = 0.0  # pvlib default: axis along N-S (y-axis points north)
ALBEDO = 0.20
DNI = 900.0
DHI = 120.0
DNI_EXTRA = 1367.0


def f(v):
    return float(np.atleast_1d(v)[0])


def solar_pos(lat, lon, utc_dt):
    sp = solarposition.get_solarposition(utc_dt, lat, lon)
    return f(sp["apparent_zenith"]), f(sp["azimuth"])


def point_fixture(site, lat, lon, date, solar_time, axis_tilt):
    # schedule in UTC so that local apparent solar time ~= solar_time
    utc_hour = solar_time - lon / 15.0
    utc_dt = pd.Timestamp(f"{date} {int(utc_hour):02d}:{int(round((utc_hour % 1) * 60)):02d}", tz="UTC")
    zen, az = solar_pos(lat, lon, utc_dt)
    out = tracking.singleaxis(
        apparent_zenith=zen, solar_azimuth=az,
        axis_tilt=axis_tilt, axis_azimuth=AXIS_AZIMUTH,
        max_angle=MAX_ANGLE, backtrack=True, gcr=GCR,
    )
    theta_raw = f(out["tracker_theta"])
    theta = None if math.isnan(theta_raw) else theta_raw
    stilt = f(out["surface_tilt"])
    saz = f(out["surface_azimuth"])
    aoi = f(out["aoi"])
    ghi = DNI * math.cos(math.radians(zen)) + DHI
    if zen > 90:
        ghi = 0.0
    tot = irradiance.get_total_irradiance(
        stilt, saz, zen, az, DNI, ghi, DHI,
        dni_extra=DNI_EXTRA, albedo=ALBEDO, model="isotropic",
    )
    poa = f(tot["poa_global"])
    return {
        "site": site, "date": date, "solarTime": solar_time,
        "axisTiltDeg": axis_tilt, "gcr": GCR, "maxAngleDeg": MAX_ANGLE,
        "zenithDeg": round(zen, 6), "azimuthDeg": round(az, 6),
        "expectedRotationDeg": None if theta is None else round(theta, 6),
        "expectedSurfaceTiltDeg": round(stilt, 6),
        "expectedSurfaceAzimuthDeg": round(saz, 6),
        "expectedAoiDeg": None if math.isnan(aoi) else round(aoi, 6),
        "expectedPoaWm2": round(poa, 6),
        "pvlibVersion": PVLIB_VERSION,
        "referenceScript": "scripts/generate-pvlib-fixtures.py",
    }


def annual_site_fixture(site, lat, lon):
    """Representative-day annual model: 21st of each month x 24 h, clear sky
    (pvlib ineichen), scaled by 365/12. Sun path is emitted so the TS engine
    can reproduce the identical annual simulation."""
    days = [f"2024-{m:02d}-21" for m in range(1, 13)]
    sun_path = []
    ann_tracker = 0.0
    ann_fixed = 0.0
    fixed_tilt = abs(lat)
    fixed_az = 180.0 if lat >= 0 else 0.0
    for date in days:
        for h in range(24):
            utc_hour = h - lon / 15.0
            utc_dt = pd.Timestamp(date, tz="UTC") + pd.Timedelta(hours=utc_hour)
            zen, az = solar_pos(lat, lon, utc_dt)
            am = pvlib.atmosphere.get_absolute_airmass(pvlib.atmosphere.get_relative_airmass(zen))
            cs = clearsky.ineichen(zen, airmass_absolute=am, linke_turbidity=3.0, altitude=500.0)
            ghi = f(cs["ghi"]); dni = f(cs["dni"]); dhi = f(cs["dhi"])
            sun_path.append([round(zen, 4), round(az, 4), round(ghi, 3), round(dni, 3), round(dhi, 3)])
            if zen < 90:
                tr = tracking.singleaxis(apparent_zenith=zen, solar_azimuth=az,
                                         axis_tilt=0.0, axis_azimuth=AXIS_AZIMUTH,
                                         max_angle=MAX_ANGLE, backtrack=True, gcr=GCR)
                tot = irradiance.get_total_irradiance(
                    f(tr["surface_tilt"]), f(tr["surface_azimuth"]),
                    zen, az, dni, ghi, dhi, dni_extra=DNI_EXTRA, albedo=ALBEDO, model="isotropic")
                ann_tracker += f(tot["poa_global"])
                totf = irradiance.get_total_irradiance(
                    fixed_tilt, fixed_az, zen, az, dni, ghi, dhi,
                    dni_extra=DNI_EXTRA, albedo=ALBEDO, model="isotropic")
                ann_fixed += f(totf["poa_global"])
    scale = 365.0 / 12.0
    return {
        "site": site, "latitude": lat, "longitude": lon,
        "gcr": GCR, "maxAngleDeg": MAX_ANGLE, "axisTiltDeg": 0.0,
        "sunPath": sun_path,  # 288 entries: [zenithDeg, azimuthDeg, ghi, dni, dhi]
        "annualTrackerPoaKwhPerM2": round(ann_tracker * scale / 1000.0, 3),
        "annualFixedPoaKwhPerM2": round(ann_fixed * scale / 1000.0, 3),
        "pvlibVersion": PVLIB_VERSION,
        "referenceScript": "scripts/generate-pvlib-fixtures.py",
    }


def main():
    points = []
    for site, (lat, lon) in SITES.items():
        for date in DATES:
            for st in SOLAR_TIMES:
                points.append(point_fixture(site, lat, lon, date, st, AXIS_TILT))
    # slope-aware fixtures (axis_tilt = +/-5 deg)
    for site, (lat, lon) in [("Tehran", SITES["Tehran"]), ("Munich", SITES["Munich"])]:
        for date in ["2024-06-21", "2024-12-21"]:
            for st in [9.0, 15.0]:
                for tilt in [5.0, -5.0]:
                    points.append(point_fixture(site, lat, lon, date, st, tilt))
    annual = [annual_site_fixture(s, lat, lon) for s, (lat, lon) in SITES.items()]
    print(json.dumps({
        "generator": "scripts/generate-pvlib-fixtures.py",
        "pvlibVersion": PVLIB_VERSION,
        "python": "3.11.2",
        "points": points,
        "annual": annual,
    }, indent=1))


if __name__ == "__main__":
    main()
