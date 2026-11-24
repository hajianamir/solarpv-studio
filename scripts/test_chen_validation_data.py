"""Integrity and semantics checks on actual published measurements, not model fit."""
import csv
import hashlib
import math
from pathlib import Path
import subprocess
import sys
import unittest
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'docs/reference-data/chen-validation'
EXPECTED={'02':(6313,'0bbf959cbfc367296ec69d7a74d2f5c1'),'03':(6315,'a09cbd8eff0af55dfe9bc8728fa89908'),'04':(6307,'f17615476283d2e15087165697ff9d7c')}

class ChenDataTests(unittest.TestCase):
    def test_original_publisher_checksum_and_offline_verifier(self):
        for cell,(_,md5) in EXPECTED.items():self.assertEqual(hashlib.md5((DATA/f'LGM50_cell{cell}.csv').read_bytes()).hexdigest(),md5)
        from scripts import acquire_chen_validation as acquisition
        with patch.object(sys,'argv',['acquire_chen_validation.py']),patch.object(subprocess,'check_output',side_effect=AssertionError('Offline verification must not invoke network')):acquisition.main()

    def test_original_rows_are_not_synthetic_signed_current(self):
        for cell,(count,_) in EXPECTED.items():
            with (DATA/f'LGM50_cell{cell}.csv').open(newline='') as f:
                metadata=[next(f) for _ in range(13)];rows=list(csv.DictReader(f))
            self.assertIn('Maccor',metadata[2]);self.assertEqual(len(rows),count)
            self.assertEqual(set(r['Md'] for r in rows),{'C','D','R','SBr','O'})
            for row in rows:
                self.assertNotIn(None,row)
                for key in ['Test Time [s]','Step Time [s]','Capacity [Ah]','Energy [Wh]','Current [A]','Voltage [V]','Temperature Cell [degC]','Temperature Chamber [degC]']:self.assertTrue(math.isfinite(float(row[key])))
                # Explicitly measured convention: charge and discharge are magnitudes.
                self.assertGreaterEqual(float(row['Current [A]']),0)
                if row['Md']=='R':self.assertEqual(float(row['Current [A]']),0)
            times=[float(r['Test Time [s]']) for r in rows]
            self.assertTrue(all(a<=b for a,b in zip(times,times[1:])));self.assertEqual(sum(a==b for a,b in zip(times,times[1:])),2)
            self.assertGreater(times[-1],170000)

if __name__=='__main__':unittest.main()
