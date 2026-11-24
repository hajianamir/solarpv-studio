"""Replay manifest regression for stages 50–52; synthetic inputs only."""
import copy
import unittest
from services.pvlib_research.thermal import digest
from services.pvlib_research.electrical import solve
from services.pvlib_research.transient import simulate
from services.pvlib_research.tracker import simulate_tracker
from services.pvlib_research.tests.test_electrical import plan as electrical_plan
from services.pvlib_research.tests.test_transient import plan as transient_plan
from services.pvlib_research.tests.test_tracker import plan as tracker_plan


class ReplayTests(unittest.TestCase):
    def test_all_plans_replay_and_sensitive_hash(self):
        for fun, factory in [(solve,electrical_plan),(simulate,transient_plan),(simulate_tracker,tracker_plan)]:
            with self.subTest(function=fun.__name__):
                p=factory();r=fun(p)
                self.assertEqual(r['plan'],p)
                self.assertEqual(r['planSha256'],digest(p))
                self.assertEqual(fun(copy.deepcopy(r['plan'])),r)
                other=copy.deepcopy(p);other['source']+=' revised'
                self.assertNotEqual(fun(other)['planSha256'],r['planSha256'])
                self.assertEqual(r['projectApproval'],'blocked')
