"""Targeted equation-mutation witnesses; no formula hash/literal exemptions."""
import contextlib
import io
import types
import unittest
from pathlib import Path
from scripts.test_physical_models import DcTests, SpmTests, ControlTests
from services.power_dynamics import dc_coupled, electrochemistry, control


def main():
    mutations = [
        (dc_coupled, 'stored += (charge*cc*ec-discharge/(cd*ed))*dt',
         'stored -= (charge*cc*ec-discharge/(cd*ed))*dt', DcTests, 'test_decimal_clipping_all_modes'),
        (electrochemistry, "jn = current/(F*neg['area'])", "jn = current/(2*F*neg['area'])",
         SpmTests, 'test_independent_pybamm_oracle_and_mesh'),
        (control, '(applied-gg-effective_r*ii)/L', '(applied-gg-effective_r*ii)/(2*L)',
         ControlTests, 'test_grid_connected_plant_independent_exact_solution'),
        (control, "'normal_inverse': (.14, .02)", "'normal_inverse': (.15, .02)",
         ControlTests, 'test_idmt_published_table_and_variable_current'),
    ]
    for module, old, new, cls, name in mutations:
        source = Path(module.__file__).read_text()
        assert source.count(old) == 1, 'Mutation must identify exactly one equation'
        altered = types.ModuleType(module.__name__)
        altered.__package__ = module.__package__
        exec(compile(source.replace(old, new), module.__file__, 'exec'), altered.__dict__)
        original = module.simulate
        module.simulate = altered.simulate
        try:
            stream = io.StringIO()
            with contextlib.redirect_stdout(stream):
                outcome = unittest.TextTestRunner(stream=stream).run(unittest.TestSuite([cls(name)]))
            if outcome.wasSuccessful():
                raise AssertionError('Independent test failed to detect equation mutation: '+old)
            print('PASS sensitive independent witness:', module.__name__, old)
        finally:
            module.simulate = original


if __name__ == '__main__':
    # Individual suite construction does not run class fixtures; establish the
    # unmodified result before replacing the SPM implementation.
    SpmTests.setUpClass()
    main()
