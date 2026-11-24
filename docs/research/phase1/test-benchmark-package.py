"""Negative and leakage checks for research tooling, not the product."""
import importlib.util
import json
import tempfile
import unittest
import warnings
from pathlib import Path
import numpy as np
import pandas as pd
from pvlib.temperature import prilliman

folder = Path(__file__).parent
spec = importlib.util.spec_from_file_location('benchmark_package', folder/'run-benchmark-package.py')
bench = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bench)
assets = json.loads(Path('docs/audit/PHASE1-BENCHMARK-ASSETS.json').read_text())['assets']
lab = next(a for a in assets if a['path'].endswith('/xSi12922.txt'))

class BenchmarkTests(unittest.TestCase):
    def altered(self, transform):
        text = Path(lab['localPath']).read_text(encoding='utf-8-sig')
        start = text.index('seqno,date,temperature,irradiance,')
        frame = pd.read_csv(bench.io.StringIO(text[start:]))
        frame = transform(frame.copy())
        return text[:start] + frame.to_csv(index=False)

    def with_lab(self, text):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/'case.txt'
            path.write_text(text)
            return bench.lab_case(dict(lab, localPath=str(path)))

    def test_holdout_power_never_changes_training_fit(self):
        before = bench.lab_case(lab)
        def change(frame):
            frame.loc[frame.irradiance.isin([600,800]), 'p_mp'] *= 1.25
            return frame
        after = self.with_lab(self.altered(change))
        for model in before['models']:
            self.assertEqual(before['models'][model]['train'], after['models'][model]['train'])
            self.assertGreater(after['models'][model]['holdout']['rmse_W'], before['models'][model]['holdout']['rmse_W'])

    def test_duplicate_operating_point_rejected(self):
        with self.assertRaises(AssertionError):
            self.with_lab(self.altered(lambda df: pd.concat([df,df.iloc[[0]]])))

    def test_missing_stc_rejected_not_filled(self):
        with self.assertRaises(AssertionError):
            self.with_lab(self.altered(lambda df: df[~((df.temperature==25)&(df.irradiance==1000))]))

    def test_negative_lab_power_rejected(self):
        def change(frame):
            frame.loc[0,'p_mp'] = -9999
            return frame
        with self.assertRaises(AssertionError):
            self.with_lab(self.altered(change))

    def test_prilliman_constant_input_invariant(self):
        index = pd.date_range('2025-01-01T00:00:00Z', periods=10, freq='5min')
        output = prilliman(pd.Series(30.,index=index),pd.Series(2.,index=index))
        np.testing.assert_allclose(output,30.)

    def test_prilliman_missing_wind_not_zero_filled(self):
        index = pd.date_range('2025-01-01T00:00:00Z', periods=10, freq='5min')
        wind = pd.Series(2.,index=index)
        wind.iloc[4] = np.nan
        output = prilliman(pd.Series(30.,index=index),wind)
        self.assertTrue(np.isnan(output.iloc[4]))
        self.assertTrue(np.isfinite(output.iloc[5]))

    def test_prilliman_hourly_not_fake_dynamic_improvement(self):
        index = pd.date_range('2025-01-01T00:00:00Z', periods=10, freq='h')
        temp = pd.Series(np.arange(10.)+20,index=index)
        with warnings.catch_warnings(record=True) as seen:
            warnings.simplefilter('always')
            output=prilliman(temp,pd.Series(2.,index=index))
        pd.testing.assert_series_equal(output,temp)
        self.assertTrue(any('unchanged' in str(item.message) for item in seen))

    def test_prilliman_irregular_cadence_rejected(self):
        index = pd.DatetimeIndex(['2025-01-01T00:00:00Z','2025-01-01T00:05:00Z','2025-01-01T00:11:00Z'])
        with self.assertRaisesRegex(NotImplementedError, 'unequal time intervals'):
            prilliman(pd.Series(30.,index=index),pd.Series(2.,index=index))

if __name__ == '__main__':
    unittest.main(verbosity=2)
