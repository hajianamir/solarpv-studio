"""Synthetic tracker geometry/motion oracles; no field measurements."""
import copy
import math
import unittest
from services.pvlib_research.tracker import simulate_tracker


def plan():
    return dict(schemaVersion='tracker-motion-plan-v1',source='Synthetic geometry and movement fixture',
        terrain=dict(datum='Synthetic local ENU, metres',source='Synthetic plane, not survey',slopeTiltDeg=0,slopeAzimuthDeg=270),
        layout=dict(axisAzimuthDeg=180,widthM=2,pitchM=6,backtrack=False),
        actuator=dict(source='Synthetic constant-speed motor',minPhysicalDeg=-60,maxPhysicalDeg=60,
                      encoderOffsetDeg=14,slewDegPerS=2,windStowDeg=0,nightStowDeg=-10,movingW=120,idleW=3,count=4),
        wind=dict(source='Synthetic wind, no operational telemetry',heightM=3,triggerMps=15,releaseMps=10),
        initial=dict(encoderDeg=-14,windLatched=False),
        intervals=[dict(start='2026-01-01T00:00:00Z',durationS=30,solarZenithDeg=45,solarAzimuthDeg=270,windMps=0)])


class TrackerTests(unittest.TestCase):
    def test_flat_vector_oracle_east_west_offset(self):
        for az,expected in [(90,-45),(270,45),(180,0)]:
            p=plan();p['intervals'][0]['solarAzimuthDeg']=az
            before=copy.deepcopy(p);r=simulate_tracker(p);row=r['trace'][0]
            self.assertEqual(p,before)
            self.assertAlmostEqual(row['endPhysicalDeg'],expected)
            self.assertAlmostEqual(row['endEncoderDeg'],expected-14)
            # Independent ENU normal for horizontal south axis.
            normal=[-math.sin(math.radians(expected)),0,math.cos(math.radians(expected))]
            for x,y in zip(row['endNormalENU'],normal):self.assertAlmostEqual(x,y,places=10)
            if az in (90,270):
                self.assertAlmostEqual(sum(x*y for x,y in zip(normal,[math.sin(math.radians(az))/math.sqrt(2),math.cos(math.radians(az))/math.sqrt(2),1/math.sqrt(2)])),1)

    def test_offset_reparameterization_and_initial_wind_latch(self):
        for offset in (0,6.5,14):
            p=plan();p['actuator']['encoderOffsetDeg']=offset
            p['initial']['encoderDeg']=-offset
            r=simulate_tracker(p)
            self.assertAlmostEqual(r['trace'][0]['endPhysicalDeg'],45)
            self.assertAlmostEqual(r['trace'][0]['endEncoderDeg'],45-offset)
        p=plan();p['initial']['windLatched']=True;p['intervals'][0]['windMps']=12
        self.assertEqual(simulate_tracker(p)['trace'][0]['mode'],'wind_stow')

    def test_flat_backtracking_independent_formula(self):
        p=plan();p['layout']['backtrack']=True;p['intervals'][0]['solarZenithDeg']=80
        ideal=80;distance=3;correction=math.degrees(math.acos(distance*math.cos(math.radians(ideal))))
        r=simulate_tracker(p);row=r['trace'][0]
        self.assertAlmostEqual(row['targetPhysicalDeg'],ideal-correction,places=9)
        self.assertLess(row['targetPhysicalDeg'],60)
        p['layout']['backtrack']=False
        self.assertAlmostEqual(simulate_tracker(p)['trace'][0]['targetPhysicalDeg'],60)

    def test_planar_slope_axes_and_orthogonality(self):
        for az in (180,270,90):
            p=plan();p['terrain'].update(slopeTiltDeg=10,slopeAzimuthDeg=az)
            r=simulate_tracker(p)
            if az==180:
                self.assertAlmostEqual(r['axisTiltDeg'],10)
                self.assertAlmostEqual(r['crossAxisTiltDeg'],0)
            else:
                self.assertAlmostEqual(r['axisTiltDeg'],0)
                self.assertAlmostEqual(r['crossAxisTiltDeg'],10 if az==270 else -10)
            # Tracker surface normal must be perpendicular to the surveyed axis.
            tilt=math.radians(r['axisTiltDeg'])
            axis=[0,-math.cos(tilt),-math.sin(tilt)]
            self.assertAlmostEqual(sum(a*b for a,b in zip(axis,r['trace'][0]['endNormalENU'])),0,places=10)

    def test_slew_motor_units_and_log_comparison(self):
        p=plan();p['intervals'][0].update(durationS=10,observedEndEncoderDeg=6)
        r=simulate_tracker(p);row=r['trace'][0]
        self.assertEqual(row['endPhysicalDeg'],20)
        self.assertFalse(row['targetReached'])
        self.assertAlmostEqual(r['motorEnergyWh'],4*120*10/3600)
        self.assertEqual(r['movementComparison']['rmseDeg'],0)
        p['intervals'][0]['durationS']=30
        r=simulate_tracker(p)
        self.assertAlmostEqual(r['motorEnergyWh'],4*(120*22.5+3*7.5)/3600)
        self.assertAlmostEqual(r['travelDegPerActuator'],45)
        self.assertEqual(r['projectApproval'],'blocked')

    def test_wind_hysteresis_priority_night_and_offset_once(self):
        p=plan();p['initial']['encoderDeg']=16  # physical=30
        rows=[]
        for i,(wind,zen) in enumerate([(15,100),(12,45),(10,100),(0,90),(0,45)]):
            row=copy.deepcopy(p['intervals'][0]);row.update(start=f'2026-01-01T00:0{i}:00Z',durationS=60,windMps=wind,solarZenithDeg=zen)
            rows.append(row)
        p['intervals']=rows;r=simulate_tracker(p)
        self.assertEqual([x['mode'] for x in r['trace']],['wind_stow','wind_stow','night_stow','night_stow','tracking'])
        self.assertEqual([x['endPhysicalDeg'] for x in r['trace']], [0,0,-10,-10,45])
        self.assertEqual(r['trace'][1]['movingS'],0)
        self.assertAlmostEqual(r['trace'][1]['motorEnergyWh'],4*3*60/3600)
        self.assertAlmostEqual(r['trace'][0]['endEncoderDeg'],-14)

    def test_time_boundary_continuity_cancel_and_limits(self):
        p=plan();row=copy.deepcopy(p['intervals'][0]);row['start']='2026-01-01T01:00:30+01:00';p['intervals'].append(row)
        self.assertEqual(len(simulate_tracker(p)['trace']),2)
        p['intervals'][1]['start']='2026-01-01T00:00:31Z'
        with self.assertRaisesRegex(ValueError,'Gap'):simulate_tracker(p)
        p=plan();p['intervals'][0]['start']='2026-01-01T00:00:00'
        with self.assertRaisesRegex(ValueError,'offset'):simulate_tracker(p)
        with self.assertRaisesRegex(RuntimeError,'cancelled'):simulate_tracker(plan(),cancel=lambda:True)
        p=plan();p['intervals']=p['intervals']*10001
        with self.assertRaises(ValueError):simulate_tracker(p)

    def test_strict_missing_wind_geometry_and_units(self):
        for group,key,value in [('terrain','datum',''),('terrain','slopeTiltDeg',float('nan')),
            ('layout','pitchM',1),('layout','backtrack',1),('actuator','count',True),
            ('actuator','slewDegPerS',0),('actuator','windStowDeg',100),('wind','heightM',None),
            ('wind','releaseMps',15),('initial','encoderDeg',90)]:
            p=plan();p[group][key]=value
            with self.subTest(key=key),self.assertRaises(ValueError):simulate_tracker(p)
        p=plan();del p['intervals'][0]['windMps']
        with self.assertRaises(ValueError):simulate_tracker(p)
        p=plan();p['intervals'][0]['durationS']=3600
        with self.assertRaises(ValueError):simulate_tracker(p)


if __name__=='__main__':unittest.main()
