"""Assumed on-module SWE inventory, NOT structural snow or Marion model.

Rates: SWE mm/h, melt coefficient mm/(h degC). Constant conditions per call.
No latent-heat coupling to the module thermal node; empirical optical cover only.
"""


def advance(swe_mm, snowfall_mm_h, air_c, melt_mm_h_c, duration_s):
    hours=duration_s/3600
    added=snowfall_mm_h*hours
    potential=max(0.,air_c)*melt_mm_h_c*hours
    end=max(0.,swe_mm+added-potential)
    melted=swe_mm+added-end
    return dict(sweMm=end,addedMm=added,meltedMm=melted,
                balanceResidualMm=end-swe_mm-added+melted)


def transmission(swe_mm, full_coverage_swe_mm, covered_transmission):
    coverage=min(1.,swe_mm/full_coverage_swe_mm)
    return 1-coverage*(1-covered_transmission)
