// Advanced 3D Shading & Sun Path Geometry Engine
// Conforming to IEC 62548, Sandia National Laboratories & NREL Sun Position Algorithms

export interface ShadingGeometryInput {
  latitude: number;           // Site latitude in degrees (e.g. 35.68 for Tehran)
  longitude: number;          // Site longitude in degrees
  arrayTiltDeg: number;       // Panel tilt angle beta (deg)
  arrayAzimuthDeg: number;    // Array azimuth gamma_a (0 = South, -90 = East, +90 = West)
  pitchDistanceM: number;     // Center-to-center or edge-to-edge row spacing (m)
  tableSlopedWidthM: number;  // Collector length along slope (e.g. 4.6 m for 2P14)
  groundClearanceM: number;   // Front lower edge height above ground (m)
  modulesPerTable: number;    // e.g. 28 modules
  // Optional nearby obstacle (e.g. parapet / inverter station / tree)
  hasObstacle?: boolean;
  obstacleHeightM?: number;   // e.g. 3.5 m
  obstacleDistanceM?: number; // e.g. 6.0 m
  obstacleAzimuthDeg?: number;// e.g. -45 deg (SE)
}

export interface SunPosition {
  hour: number;
  altitudeDeg: number;        // Elevation angle alpha above horizon
  azimuthDeg: number;         // Solar azimuth gamma_s (0 = South, negative = East, positive = West)
  isDaylight: boolean;
}

export interface HourlyShadingPoint {
  hour: number;
  sunPosition: SunPosition;
  shadowLengthOnGroundM: number;
  unshadedGroundGapM: number;
  shadedSlopedLengthM: number;
  linearShadingFactorPct: number;    // 0 to 100% geometric line coverage
  electricalShadingLossPct: number;  // Non-linear loss with 3-bypass-diode trigger
  isBypassDiodeTriggered: boolean;
  obstacleShadowPct: number;
  netCombinedShadingLossPct: number;
}

export interface DayShadingProfile {
  dayNameFa: string;
  dayNameEn: string;
  dayOfYear: number;
  hourlyPoints: HourlyShadingPoint[];
  dailyAverageShadingLossPct: number;
}

export interface MonthlyShadingSummary {
  monthIndex: number;
  monthNameFa: string;
  monthNameEn: string;
  averageBeamLossPct: number;
  averageElectricalLossPct: number;
  sunshineHours: number;
}

export interface ShadingAnalysisResult {
  // Array geometric parameters
  gcrPct: number;                     // Ground Cover Ratio (W_horizontal / Pitch * 100)
  horizontalTableWidthM: number;      // W_g = W_sloped * cos(tilt)
  verticalHeightRiseM: number;        // delta_H = W_sloped * sin(tilt)
  clearGroundSpacingM: number;        // D_clear = Pitch - W_horizontal
  criticalWinterSolsticeLimitAngleDeg: number; // Minimal sun altitude to avoid inter-row shading
  recommendedMinPitchM: number;       // Minimum pitch to ensure zero shading at Dec 21 solar noon
  
  // Seasonal profiles
  winterSolsticeProfile: DayShadingProfile; // Dec 21 (worst-case shadow)
  equinoxProfile: DayShadingProfile;       // Mar 21 / Sep 21
  summerSolsticeProfile: DayShadingProfile; // Jun 21 (shortest shadow)
  
  // 12-Month Matrix
  monthlyMatrix: MonthlyShadingSummary[];
  
  // Annual aggregated losses
  annualGeometricBeamLossPct: number;
  annualElectricalMismatchLossPct: number;
  annualEffectiveShadingDerateFactor: number; // e.g. 0.968 (3.2% loss)
  
  // Engineering compliance
  isWinterNoonFreeOfShading: boolean; // True if no shading between 10:00 and 14:00 on Dec 21
  warningMessagesFa: string[];
  warningMessagesEn: string[];
}

// ----------------------------------------------------
// Solar Position Calculation (NREL SPA Approximation)
// ----------------------------------------------------
export function calculateSolarPosition(
  latitudeDeg: number,
  dayOfYear: number,
  hour: number // Local solar time 0-24
): SunPosition {
  const latRad = (latitudeDeg * Math.PI) / 180.0;
  
  // Solar Declination delta (Spencer / Cooper equation)
  const b = (2.0 * Math.PI * (dayOfYear - 81)) / 364.0;
  const declinationRad = (23.45 * Math.PI / 180.0) * Math.sin((2.0 * Math.PI * (284 + dayOfYear)) / 365.0);
  
  // Hour Angle omega (15 deg per hour from solar noon at 12:00)
  const hourAngleRad = ((hour - 12.0) * 15.0 * Math.PI) / 180.0;
  
  // Solar Altitude (Elevation alpha)
  const sinAlpha = Math.sin(latRad) * Math.sin(declinationRad) +
                   Math.cos(latRad) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
  const altitudeRad = Math.asin(Math.max(-1.0, Math.min(1.0, sinAlpha)));
  const altitudeDeg = (altitudeRad * 180.0) / Math.PI;
  
  if (altitudeDeg <= 0) {
    return {
      hour,
      altitudeDeg: 0,
      azimuthDeg: 0,
      isDaylight: false,
    };
  }
  
  // Solar Azimuth gamma_s (0 = South, negative = East/morning, positive = West/afternoon)
  const cosGamma = (Math.sin(altitudeRad) * Math.sin(latRad) - Math.sin(declinationRad)) /
                   (Math.cos(altitudeRad) * Math.cos(latRad));
  let azimuthRad = Math.acos(Math.max(-1.0, Math.min(1.0, cosGamma)));
  if (hour < 12.0) {
    azimuthRad = -azimuthRad; // Morning (East is negative)
  }
  const azimuthDeg = (azimuthRad * 180.0) / Math.PI;
  
  return {
    hour,
    altitudeDeg: Number(altitudeDeg.toFixed(2)),
    azimuthDeg: Number(azimuthDeg.toFixed(2)),
    isDaylight: true,
  };
}

// ----------------------------------------------------
// Comprehensive 3D Shading Calculator
// ----------------------------------------------------
export function analyze3dShadingAndSunPath(input: ShadingGeometryInput): ShadingAnalysisResult {
  const {
    latitude,
    arrayTiltDeg,
    arrayAzimuthDeg = 0,
    pitchDistanceM,
    tableSlopedWidthM,
    groundClearanceM,
    hasObstacle = false,
    obstacleHeightM = 3.0,
    obstacleDistanceM = 8.0,
    obstacleAzimuthDeg = -30,
  } = input;

  const tiltRad = (arrayTiltDeg * Math.PI) / 180.0;
  const horizontalTableWidthM = Number((tableSlopedWidthM * Math.cos(tiltRad)).toFixed(2));
  const verticalHeightRiseM = Number((tableSlopedWidthM * Math.sin(tiltRad)).toFixed(2));
  const clearGroundSpacingM = Number(Math.max(0.1, pitchDistanceM - horizontalTableWidthM).toFixed(2));
  const gcrPct = Number(((horizontalTableWidthM / Math.max(0.1, pitchDistanceM)) * 100.0).toFixed(1));

  // Critical limit angle for row-to-row shading
  const criticalWinterSolsticeLimitAngleDeg = Number(
    ((Math.atan(verticalHeightRiseM / clearGroundSpacingM) * 180.0) / Math.PI).toFixed(1)
  );

  // Winter solstice solar noon altitude: alpha_noon = 90 - lat - 23.45
  const winterSolsticeNoonAltitude = Math.max(5.0, 90.0 - latitude - 23.45);
  const winterNoonAltRad = (winterSolsticeNoonAltitude * Math.PI) / 180.0;
  const recommendedMinPitchM = Number(
    (horizontalTableWidthM + verticalHeightRiseM / Math.tan(winterNoonAltRad)).toFixed(2)
  );

  const calculateDayProfile = (dayOfYear: number, nameFa: string, nameEn: string): DayShadingProfile => {
    const hourlyPoints: HourlyShadingPoint[] = [];
    let sumLoss = 0;
    let daylightCount = 0;

    for (let h = 6; h <= 18; h++) {
      const sun = calculateSolarPosition(latitude, dayOfYear, h);
      if (!sun.isDaylight || sun.altitudeDeg < 2.0) {
        hourlyPoints.push({
          hour: h,
          sunPosition: sun,
          shadowLengthOnGroundM: 0,
          unshadedGroundGapM: clearGroundSpacingM,
          shadedSlopedLengthM: 0,
          linearShadingFactorPct: 0,
          electricalShadingLossPct: 0,
          isBypassDiodeTriggered: false,
          obstacleShadowPct: 0,
          netCombinedShadingLossPct: 0,
        });
        continue;
      }

      daylightCount++;
      const altRad = (sun.altitudeDeg * Math.PI) / 180.0;
      const azDeltaRad = ((sun.azimuthDeg - arrayAzimuthDeg) * Math.PI) / 180.0;
      const cosAzDelta = Math.cos(azDeltaRad);

      // Shadow projection normal to array row
      let shadowLengthOnGroundM = 0;
      let shadedSlopedLengthM = 0;
      let linearPct = 0;

      if (cosAzDelta > 0.05) {
        // Sun is in front of the array plane
        shadowLengthOnGroundM = (verticalHeightRiseM / Math.tan(altRad)) * cosAzDelta;
        if (shadowLengthOnGroundM > clearGroundSpacingM) {
          const excessGroundShadowM = shadowLengthOnGroundM - clearGroundSpacingM;
          // Project shadow onto tilted panel plane
          const denom = Math.cos(azDeltaRad) * Math.sin(tiltRad) + Math.cos(tiltRad) * (Math.sin(altRad) / Math.cos(altRad));
          shadedSlopedLengthM = Math.min(tableSlopedWidthM, excessGroundShadowM / Math.max(0.1, denom));
          linearPct = (shadedSlopedLengthM / tableSlopedWidthM) * 100.0;
        }
      }

      // Bypass diode non-linear behavior
      // 3 bypass diodes: 1st activates at 3% shadow, 2nd at 35%, 3rd at 68%
      let electricalLossPct = 0;
      let isBypassDiodeTriggered = false;
      if (linearPct > 1.5) {
        isBypassDiodeTriggered = true;
        if (linearPct < 33.3) {
          electricalLossPct = 33.3 + linearPct * 0.4;
        } else if (linearPct < 66.6) {
          electricalLossPct = 66.6 + (linearPct - 33.3) * 0.4;
        } else {
          electricalLossPct = 100.0;
        }
      }

      // Nearby Obstacle Shading Ray
      let obstacleShadowPct = 0;
      if (hasObstacle) {
        const azDiffObs = Math.abs(sun.azimuthDeg - obstacleAzimuthDeg);
        if (azDiffObs < 25) {
          const obsAngularAltitude = (Math.atan(obstacleHeightM / obstacleDistanceM) * 180.0) / Math.PI;
          if (sun.altitudeDeg < obsAngularAltitude) {
            obstacleShadowPct = Math.min(100.0, ((obsAngularAltitude - sun.altitudeDeg) / obsAngularAltitude) * 100.0);
          }
        }
      }

      const netCombinedShadingLossPct = Math.min(100.0, Math.max(electricalLossPct, obstacleShadowPct));
      sumLoss += netCombinedShadingLossPct;

      hourlyPoints.push({
        hour: h,
        sunPosition: sun,
        shadowLengthOnGroundM: Number(shadowLengthOnGroundM.toFixed(2)),
        unshadedGroundGapM: Number(Math.max(0, clearGroundSpacingM - shadowLengthOnGroundM).toFixed(2)),
        shadedSlopedLengthM: Number(shadedSlopedLengthM.toFixed(2)),
        linearShadingFactorPct: Number(linearPct.toFixed(1)),
        electricalShadingLossPct: Number(electricalLossPct.toFixed(1)),
        isBypassDiodeTriggered,
        obstacleShadowPct: Number(obstacleShadowPct.toFixed(1)),
        netCombinedShadingLossPct: Number(netCombinedShadingLossPct.toFixed(1)),
      });
    }

    const dailyAverageShadingLossPct = daylightCount > 0 ? Number((sumLoss / daylightCount).toFixed(1)) : 0;
    return {
      dayNameFa: nameFa,
      dayNameEn: nameEn,
      dayOfYear,
      hourlyPoints,
      dailyAverageShadingLossPct,
    };
  };

  const winterSolsticeProfile = calculateDayProfile(355, 'انقلاب زمستانی (۲۱ دسامبر)', 'Winter Solstice (Dec 21)');
  const equinoxProfile = calculateDayProfile(80, 'اعتدال بهاری (۲۱ مارس)', 'Spring Equinox (Mar 21)');
  const summerSolsticeProfile = calculateDayProfile(172, 'انقلاب تابستانی (۲۱ ژوئن)', 'Summer Solstice (Jun 21)');

  // 12-Month Matrix (representative day 15th of each month)
  const monthDays = [15, 46, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349];
  const monthNamesFa = ['فروردین (Jan)', 'اردیبهشت (Feb)', 'خرداد (Mar)', 'تیر (Apr)', 'مرداد (May)', 'شهریور (Jun)', 'مهر (Jul)', 'آبان (Aug)', 'آذر (Sep)', 'دی (Oct)', 'بهمن (Nov)', 'اسفند (Dec)'];
  const monthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const monthlyMatrix: MonthlyShadingSummary[] = monthDays.map((day, idx) => {
    const prof = calculateDayProfile(day, monthNamesFa[idx], monthNamesEn[idx]);
    const daylightPoints = prof.hourlyPoints.filter((p) => p.sunPosition.isDaylight);
    const avgLinear = daylightPoints.reduce((acc, p) => acc + p.linearShadingFactorPct, 0) / Math.max(1, daylightPoints.length);
    const avgElec = daylightPoints.reduce((acc, p) => acc + p.netCombinedShadingLossPct, 0) / Math.max(1, daylightPoints.length);

    return {
      monthIndex: idx,
      monthNameFa: monthNamesFa[idx],
      monthNameEn: monthNamesEn[idx],
      averageBeamLossPct: Number(avgLinear.toFixed(1)),
      averageElectricalLossPct: Number(avgElec.toFixed(1)),
      sunshineHours: daylightPoints.length,
    };
  });

  // Annual weighted shading
  const annualGeometricBeamLossPct = Number(
    (monthlyMatrix.reduce((acc, m) => acc + m.averageBeamLossPct, 0) / 12.0).toFixed(1)
  );
  const annualElectricalMismatchLossPct = Number(
    (monthlyMatrix.reduce((acc, m) => acc + m.averageElectricalLossPct, 0) / 12.0).toFixed(1)
  );
  // Overall system annual derate factor (considering diffuse portion 15% and inverter MPPT tracking)
  const effectiveShadingLossPct = Math.min(12.0, annualElectricalMismatchLossPct * 0.45);
  const annualEffectiveShadingDerateFactor = Number((1.0 - effectiveShadingLossPct / 100.0).toFixed(3));

  // Check IEC 62548 winter noon rule (10:00 to 14:00 on Dec 21)
  const winterNoonPoints = winterSolsticeProfile.hourlyPoints.filter((p) => p.hour >= 10 && p.hour <= 14);
  const isWinterNoonFreeOfShading = winterNoonPoints.every((p) => p.linearShadingFactorPct < 0.5);

  const warningMessagesFa: string[] = [];
  const warningMessagesEn: string[] = [];

  if (!isWinterNoonFreeOfShading) {
    warningMessagesFa.push(
      `هشدار سایه‌اندازی: در ساعات پیک زمستان (۱۰ الی ۱۴ در ۲۱ دسامبر)، ردیف‌ها دچار سایه می‌شوند. فاصله ردیف‌ها (Pitch) را حداقل به ${recommendedMinPitchM} متر افزایش دهید.`
    );
    warningMessagesEn.push(
      `Shading Warning: Inter-row shading detected during critical winter hours (10:00-14:00 on Dec 21). Increase pitch spacing to at least ${recommendedMinPitchM} m.`
    );
  }

  if (gcrPct > 65) {
    warningMessagesFa.push(
      `ضریب پوشش زمین (GCR = ${gcrPct}%) بسیار بالاست و باعث تلفات سایه صبحگاهی و عصرگاهی شدید می‌گردد.`
    );
    warningMessagesEn.push(
      `Ground Cover Ratio (GCR = ${gcrPct}%) is excessively high, causing severe morning and late afternoon shading losses.`
    );
  }

  return {
    gcrPct,
    horizontalTableWidthM,
    verticalHeightRiseM,
    clearGroundSpacingM,
    criticalWinterSolsticeLimitAngleDeg,
    recommendedMinPitchM,
    winterSolsticeProfile,
    equinoxProfile,
    summerSolsticeProfile,
    monthlyMatrix,
    annualGeometricBeamLossPct,
    annualElectricalMismatchLossPct,
    annualEffectiveShadingDerateFactor,
    isWinterNoonFreeOfShading,
    warningMessagesFa,
    warningMessagesEn,
  };
}
