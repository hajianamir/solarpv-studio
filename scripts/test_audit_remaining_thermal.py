"""Real subprocess delayed-read/EOF, output budgets, cancellation and cleanup.
Synthetic transport regression, not independent thermal or field validation.
"""
import json
from pathlib import Path
import subprocess
import tempfile
import time
import unittest
from unittest.mock import patch
from services.pvlib_research import thermal

class Transport(unittest.TestCase):
    def child(self, script, rows=None, timeout=3, cancel=lambda: False):
        real = subprocess.Popen
        children = []
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/'delayed.py'
            path.write_text(script)
            def launch(args, **kwargs):
                p = real([*args[:-1], str(path)], **kwargs)
                children.append(p)
                return p
            try:
                with patch.object(thermal.subprocess, 'Popen', launch):
                    return thermal.predict(rows or [{'x': 1}], 25, 6.84, timeout=timeout, cancel=cancel)
            finally:
                self.assertTrue(children)
                self.assertTrue(all(p.poll() is not None for p in children), 'No child may survive success/failure')

    def test_large_delayed_read_and_eof(self):
        rows = [{'poaWm2': 800, 'tempAirC': 25, 'windSpeedMs': 1, 'padding': 'x'*200} for _ in range(4000)]
        self.assertGreater(len(json.dumps(rows)), 65536)
        result = self.child("import time,json,sys\ntime.sleep(.2)\nr=json.load(sys.stdin)\nprint(json.dumps({'moduleBackC':[42.0]*len(r['rows'])}))\n", rows)
        self.assertEqual(result, [42.0]*4000)

    def test_timeout_cancel_and_size_limits(self):
        with self.assertRaises(TimeoutError):
            self.child('import time;time.sleep(20)', timeout=.1)
        start = time.monotonic()
        with self.assertRaisesRegex(RuntimeError, 'Cancelled'):
            self.child('import time;time.sleep(20)', cancel=lambda: time.monotonic()-start>.1)
        with self.assertRaisesRegex(RuntimeError, 'output budget'):
            self.child("import sys;sys.stdout.write('x'*(5*1024*1024));sys.stdout.flush()")
        for script in ["print('{bad')", "print('{\"moduleBackC\":[NaN]}')", "print('{\"moduleBackC\":[]}')"]:
            with self.assertRaises((ValueError, KeyError)):
                self.child(script)

    def test_real_pinned_worker(self):
        result=thermal.predict([dict(poaWm2=800,tempAirC=25,windSpeedMs=1)],25,6.84)
        self.assertAlmostEqual(result[0],25+800/(25+6.84),places=10)

if __name__ == '__main__':
    unittest.main(verbosity=2)
