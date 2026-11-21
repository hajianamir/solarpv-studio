"""Executable evidence links for the versioned direct-study gap inventory.

This checks named evidence and executes it, not physical coverage completeness.
It deliberately does not classify same-library comparisons as independent.
"""
import ast
import json
from pathlib import Path
import unittest
from test_worker import worker

ROOT = Path(__file__).resolve().parents[3]
AUDIT = ROOT / 'docs/reference/study-model-gap-audit-v2.json'


class ModelGapAuditTests(unittest.TestCase):
    def test_inventory_contract_and_evidence(self):
        audit = json.loads(AUDIT.read_text())
        self.assertEqual(audit['schemaVersion'], 'study-model-gap-audit-v2')
        self.assertFalse(audit['fieldValidation'])
        self.assertEqual(audit['engineVersion'],worker.ENGINE_VERSION)
        self.assertEqual(audit['completedEngineeringSteps'],list(range(30,47)))
        self.assertEqual(audit['pendingSteps'],[])
        self.assertEqual(len({m['id'] for m in audit['models']}), 18)
        for model in audit['models']:
            with self.subTest(model=model['id']):
                for field in ('modeled','domain','tolerance','source'):self.assertTrue(model[field].strip())
                self.assertTrue(model['gap'].strip())
                path = ROOT / model['callsite']['path']
                self.assertTrue(path.resolve().is_relative_to(ROOT))
                tree = ast.parse(path.read_text())
                self.assertIn(model['callsite']['symbol'], {
                    node.name for node in tree.body if isinstance(node, ast.FunctionDef)
                })
                self.assertIn(model['evidence']['kind'], {
                    'independent_equation', 'published_point',
                    'published_coefficients_independent_equation',
                })
                self.assertNotEqual(model['evidence']['test'], audit['separateSameLibraryCrosscheck'])
                suite = unittest.defaultTestLoader.loadTestsFromName(model['evidence']['test'])
                result = unittest.TestResult()
                suite.run(result)
                self.assertTrue(result.wasSuccessful(), result.errors + result.failures)
                self.assertEqual(result.testsRun, 1)
                self.assertFalse(result.skipped)
        suite = unittest.defaultTestLoader.loadTestsFromName(audit['separateSameLibraryCrosscheck'])
        result = unittest.TestResult()
        suite.run(result)
        self.assertTrue(result.wasSuccessful(), result.errors + result.failures)
        self.assertEqual(result.testsRun, 1)
        self.assertFalse(result.skipped)
