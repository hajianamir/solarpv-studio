"""Scheduled tightly/loosely DC-coupled hybrid with shared bidirectional inverter.
PV input is available DC BEFORE shared-inverter clipping. Never accepts an AC ledger.
"""
from .common import header, keys, number, positive, efficiency, boolean, intervals, result


def simulate(plan):
    header(plan, 'dc-coupled-plan-v1', ('mode', 'equipment', 'battery', 'allowGridCharging',
                                      'islandCapable', 'dcChargingWhenIslanded', 'intervals'))
    mode = plan['mode']
    if mode not in ('powerplant', 'ongrid', 'offgrid'):
        raise ValueError('Invalid operating mode')
    allow_grid = boolean(plan['allowGridCharging'], 'allowGridCharging')
    island = boolean(plan['islandCapable'], 'islandCapable')
    charge_island = boolean(plan['dcChargingWhenIslanded'], 'dcChargingWhenIslanded')
    if mode == 'offgrid' and allow_grid:
        raise ValueError('Offgrid cannot charge from grid')
    e = plan['equipment']
    keys(e, ('pvMpptEfficiency', 'inverterEfficiency', 'rectifierEfficiency', 'inverterAcRatingW',
             'inverterDcLimitW', 'converterBusLimitW', 'chargeConverterEfficiency', 'dischargeConverterEfficiency'))
    eta = {k: efficiency(e[k], k) for k in ('pvMpptEfficiency', 'inverterEfficiency', 'rectifierEfficiency',
                                           'chargeConverterEfficiency', 'dischargeConverterEfficiency')}
    ratings = {k: positive(e[k], k) for k in ('inverterAcRatingW', 'inverterDcLimitW', 'converterBusLimitW')}
    b = plan['battery']
    keys(b, ('capacityKwh', 'initialKwh', 'minimumKwh', 'maximumChargeW', 'maximumDischargeW',
             'storageChargeEfficiency', 'storageDischargeEfficiency'))
    cap = number(b['capacityKwh'], 0, 1e12, 'capacityKwh')
    stored = number(b['initialKwh'], 0, cap, 'initialKwh')
    minimum = number(b['minimumKwh'], 0, stored, 'minimumKwh')
    charge_max = number(b['maximumChargeW'], 0, 1e12, 'maximumChargeW')
    discharge_max = number(b['maximumDischargeW'], 0, 1e12, 'maximumDischargeW')
    ec = efficiency(b['storageChargeEfficiency'], 'storageChargeEfficiency')
    ed = efficiency(b['storageDischargeEfficiency'], 'storageDischargeEfficiency')
    cc, cd = eta['chargeConverterEfficiency'], eta['dischargeConverterEfficiency']
    inv, rect = eta['inverterEfficiency'], eta['rectifierEfficiency']
    rows = plan['intervals']
    intervals(rows, ('pvAvailableDcW', 'loadAcW', 'batteryBusCommandW', 'gridAvailable',
                     'gridImportLimitW', 'exportLimitW'), 17568)
    trace = []
    for r in rows:
        dt = r['durationS']/3600000
        pv_raw = number(r['pvAvailableDcW'], 0, 1e12, 'pvAvailableDcW')
        load = number(r['loadAcW'], 0, 1e12, 'loadAcW')
        command = number(r['batteryBusCommandW'], -1e12, 1e12, 'batteryBusCommandW')
        grid = boolean(r['gridAvailable'], 'gridAvailable')
        if mode == 'offgrid' and grid:
            raise ValueError('Offgrid interval declares a grid connection')
        import_limit = number(r['gridImportLimitW'], 0, 1e12, 'gridImportLimitW') if grid else 0
        export_limit = number(r['exportLimitW'], 0, 1e12, 'exportLimitW')
        if mode == 'offgrid' and export_limit != 0:
            raise ValueError('Offgrid export limit must be zero')
        if not grid:
            export_limit = 0
        pv = pv_raw*eta['pvMpptEfficiency']
        ac_use = min(ratings['inverterAcRatingW'], load+export_limit) if grid or island else 0
        inv_limit = min(ratings['inverterDcLimitW'], ac_use/inv)
        before = stored
        charge = discharge = rect_dc = rect_ac = 0.
        if command < 0 and (grid or charge_island):
            desired = min(-command, ratings['converterBusLimitW'], charge_max/cc,
                          (cap-stored)/(dt*cc*ec))
            charge = min(pv, desired)
            # Rectification and forward inversion cannot occur simultaneously.
            if grid and allow_grid and desired > pv:
                ac_headroom = max(0., import_limit-min(load, import_limit))
                rect_dc = min(desired-charge, ratings['inverterDcLimitW'],
                              min(ratings['inverterAcRatingW'], ac_headroom)*rect)
                charge += rect_dc
                rect_ac = rect_dc/rect
        elif command > 0:
            discharge = min(command, ratings['converterBusLimitW'], discharge_max*cd,
                            (stored-minimum)*ed*cd/dt, max(0., inv_limit-pv))
        forward_dc = min(max(0., pv-charge)+discharge, inv_limit) if rect_dc == 0 else 0.
        forward_ac = forward_dc*inv
        served_from_inverter = min(load, forward_ac)
        export = min(export_limit, max(0., forward_ac-load))
        grid_load = min(max(0., load-served_from_inverter), max(0., import_limit-rect_ac))
        served = served_from_inverter+grid_load
        grid_import = grid_load+rect_ac
        curtailed = max(0., pv+discharge+rect_dc-charge-forward_dc)
        stored += (charge*cc*ec-discharge/(cd*ed))*dt
        converter_loss = charge*(1-cc)+discharge*(1/cd-1)
        storage_loss = charge*cc*(1-ec)+discharge/cd*(1/ed-1)
        inverter_loss = forward_dc-forward_ac+rect_ac-rect_dc
        pv_loss = pv_raw-pv
        losses = converter_loss+storage_loss+inverter_loss+pv_loss
        dc_residual = pv+discharge+rect_dc-charge-forward_dc-curtailed
        ac_residual = forward_ac+grid_import-served-export-rect_ac
        balance = (pv_raw+grid_import-served-export-curtailed-losses)*dt - (stored-before)
        if abs(balance) > max(1e-8, (pv_raw+grid_import)*dt*1e-9) or abs(dc_residual)+abs(ac_residual) > max(1e-6, pv_raw*1e-10):
            raise RuntimeError('DC/AC/storage energy balance failure')
        if stored < minimum-1e-8 or stored > cap+1e-8 or (grid_import > 1e-7 and export > 1e-7):
            raise RuntimeError('Hybrid physical constraint failure')
        trace.append(dict(start=r['start'], durationS=r['durationS'], initialStoredKwh=before, finalStoredKwh=stored,
            pvAvailableDcW=pv_raw, pvBusW=pv, batteryChargeBusW=charge, batteryDischargeBusW=discharge,
            inverterDcW=forward_dc, inverterAcW=forward_ac, rectifierAcW=rect_ac, rectifierDcW=rect_dc,
            gridImportW=grid_import, exportW=export, servedLoadW=served, unmetLoadW=load-served,
            curtailedDcW=curtailed, pvConversionLossW=pv_loss, converterLossW=converter_loss,
            storageLossW=storage_loss, inverterLossW=inverter_loss,
            recoveredClippingToBatteryW=min(charge-rect_dc, max(0., pv-inv_limit)),
            unsatisfiedBusCommandW=abs(command)-(charge if command < 0 else discharge),
            dcResidualW=dc_residual, acResidualW=ac_residual, energyResidualKwh=balance))
    return result(plan, 'dc-coupled-result-v1', [
        'Scheduled DC-bus commands, not an optimal dispatch algorithm',
        'Explicit constant efficiencies and ideal regulated DC bus, not switch-level converter dynamics',
        'Battery energy state here is not the electrochemical SPM state',
        'Island capability is a declared equipment capability, not grid-forming validation',
        'Pre-inverter available DC only; do not re-invert a previous AC result',
        'No automatic annual energy or finance adoption'], status='completed', trace=trace,
        finalStoredKwh=stored, mode=mode,
        maxEnergyResidualKwh=max(abs(r['energyResidualKwh']) for r in trace))
