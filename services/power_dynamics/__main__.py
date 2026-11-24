"""Strict JSON CLI for optional physical models; no fallback or finance mutation."""
import argparse
from services.pvlib_research.__main__ import strict_json, write_result
from services.pvlib_research.electrical import keys
from . import dc_coupled, electrochemistry, control


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    req = strict_json(args.input, 8*1024*1024)
    keys(req, ('operation', 'plan'))
    functions = {'dc_coupled': dc_coupled.simulate, 'electrochemical_spm': electrochemistry.simulate,
                 'dq_protection_control': control.simulate}
    if req['operation'] not in functions:
        raise ValueError('Unknown physical operation')
    out = functions[req['operation']](req['plan'])
    write_result(args.output, out, max_bytes=32*1024*1024)


if __name__ == '__main__':
    main()
