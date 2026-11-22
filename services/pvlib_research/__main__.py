"""python -m services.pvlib_research --help"""
import argparse
import json
import os
import tempfile
from pathlib import Path
from .thermal import fit_research, operational_blockers, parse_excerpt, parse_xlsx
from .uncertainty import review


def strict_json(path, max_bytes=64000):
    def pairs(values):
        out = {}
        for key, value in values:
            if key in out:
                raise ValueError('Duplicate JSON key: '+key)
            out[key] = value
        return out
    with Path(path).open('rb') as stream:
        raw = stream.read(max_bytes+1)
    if len(raw) > max_bytes:
        raise ValueError(f'Plan exceeds {max_bytes} bytes')
    def floating(value):
        import math
        out=float(value)
        if not math.isfinite(out):raise ValueError('Nonfinite JSON number')
        return out
    return json.loads(raw,object_pairs_hook=pairs,parse_float=floating,parse_constant=lambda v: (_ for _ in ()).throw(ValueError('Nonfinite JSON number')))


def write_result(path, result, compact=False, max_bytes=None):
    options={'separators':(',', ':')} if compact else {'indent':2}
    raw=(json.dumps(result,ensure_ascii=False,allow_nan=False,**options)+'\n').encode('utf-8')
    if max_bytes is not None and len(raw)>max_bytes:
        raise ValueError('Serialized result exceeds output byte budget')
    target=Path(path);target.parent.mkdir(parents=True,exist_ok=True)
    temporary=None
    try:
        with tempfile.NamedTemporaryFile(dir=target.parent,prefix='.'+target.name+'.',suffix='.tmp',delete=False) as stream:
            temporary=Path(stream.name);stream.write(raw);stream.flush();os.fsync(stream.fileno())
        os.replace(temporary,target)
    finally:
        if temporary is not None:temporary.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description='Isolated research only; never changes StudyResult, energy or finance')
    sub = parser.add_subparsers(dest='command',required=True)
    p = sub.add_parser('thermal',help='Parse original DTU v3 or explicitly labeled tool-rendered subset')
    source = p.add_mutually_exclusive_group(required=True)
    source.add_argument('--xlsx')
    source.add_argument('--excerpt')
    p.add_argument('--research-fit-plan',help='Opt-in research-only bounded fit, NOT operational approval')
    p.add_argument('--cancel-file',help='Existence cancels between/during worker calls')
    p.add_argument('--output',required=True)
    u = sub.add_parser('uncertainty',help='Conditional sourced energy budget, not verified project P50/P90')
    u.add_argument('--plan',required=True)
    u.add_argument('--output',required=True)
    e = sub.add_parser('electrical', help='Conditional balanced radial AC snapshot, not safety approval')
    e.add_argument('--plan', required=True)
    e.add_argument('--output', required=True)
    t = sub.add_parser('transient', help='Assumed subinterval dynamics, not validated controller')
    t.add_argument('--plan', required=True)
    t.add_argument('--output', required=True)
    t.add_argument('--cancel-file')
    k = sub.add_parser('tracker', help='Conditional planar tracker motion, not stow safety certification')
    k.add_argument('--plan', required=True)
    k.add_argument('--output', required=True)
    k.add_argument('--cancel-file')
    s = sub.add_parser('shading', help='Finite triangle optics and assumed linear-IV bypass research')
    s.add_argument('--plan', required=True)
    s.add_argument('--output', required=True)
    s.add_argument('--cancel-file')
    env = sub.add_parser('environment', help='Conditional module-back inertia and separate assumed snow/soil')
    env.add_argument('--plan', required=True)
    env.add_argument('--output', required=True)
    env.add_argument('--cancel-file')
    integrated = sub.add_parser('integrated', help='Versioned independent DC workers and one shared Sandia multi inverter')
    integrated.add_argument('--plan', required=True)
    integrated.add_argument('--output', required=True)
    integrated.add_argument('--cancel-file')
    integrated.add_argument('--timeout-s', type=float, default=120)
    args = parser.parse_args()
    if args.command == 'thermal':
        data = parse_xlsx(args.xlsx) if args.xlsx else parse_excerpt(args.excerpt)
        result = dict(data=data,operationalStatus='blocked',blockers=operational_blockers(data))
        if args.research_fit_plan:
            result['researchFit'] = fit_research(data,strict_json(args.research_fit_plan),cancel=lambda: bool(args.cancel_file and Path(args.cancel_file).exists()))
    elif args.command == 'integrated':
        from .integrated import run_integrated
        result = run_integrated(strict_json(args.plan, 8*1024*1024), cancel=lambda: bool(args.cancel_file and Path(args.cancel_file).exists()), timeout_s=args.timeout_s)
    elif args.command == 'environment':
        from .environment import simulate_environment
        result = simulate_environment(strict_json(args.plan), cancel=lambda: bool(args.cancel_file and Path(args.cancel_file).exists()))
    elif args.command == 'shading':
        from .shading import review_shading
        result = review_shading(strict_json(args.plan), cancel=lambda: bool(args.cancel_file and Path(args.cancel_file).exists()))
    elif args.command == 'tracker':
        from .tracker import simulate_tracker
        result = simulate_tracker(strict_json(args.plan), cancel=lambda: bool(args.cancel_file and Path(args.cancel_file).exists()))
    elif args.command == 'transient':
        from .transient import simulate
        result = simulate(strict_json(args.plan), cancel=lambda: bool(args.cancel_file and Path(args.cancel_file).exists()))
    elif args.command == 'electrical':
        from .electrical import solve
        result = solve(strict_json(args.plan))
    else:
        result = review(strict_json(args.plan))
    write_result(args.output,result,compact=args.command=='integrated',max_bytes=32*1024*1024 if args.command=='integrated' else None)


if __name__ == '__main__':
    main()
