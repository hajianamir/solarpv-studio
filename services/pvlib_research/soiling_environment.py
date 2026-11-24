"""Assumed optical-depth deposition/wash, NOT Kimber or calibrated dust mass.

Tau is dimensionless, deposition tau/h, wash 1/mm rain, rain mm/h.
"""
import math


def advance(tau, deposition_per_h, wash_per_mm, rain_mm_h, duration_s):
    hours=duration_s/3600;k=wash_per_mm*rain_mm_h
    if k==0:
        end=tau+deposition_per_h*hours
    else:
        x=k*hours
        # Stable phi(x)=(1-exp(-x))/x, including subnormal k*hours.
        phi=1-x/2+x*x/6 if x<1e-8 else -math.expm1(-x)/x
        end=tau*math.exp(-x)+deposition_per_h*hours*phi
    removed=tau+deposition_per_h*hours-end
    return dict(opticalDepth=end,depositedTau=deposition_per_h*hours,
                washedTau=max(0.,removed),balanceResidualTau=end-tau-deposition_per_h*hours+max(0.,removed))


def transmission(tau):
    return math.exp(-tau)
