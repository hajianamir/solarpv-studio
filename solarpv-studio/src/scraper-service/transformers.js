export function normalizePanel(scrapedData) {
  return {
    id: scrapedData.id || undefined,
    manufacturer: scrapedData.brand || scrapedData.manufacturer || "Generic Solar",
    modelName: scrapedData.model || scrapedData.title || "Standard Module",
    pmpWatts: parseFloat(scrapedData.powerWatts || scrapedData.pmp || 575),
    vmpVolts: parseFloat(scrapedData.vmp || 42.2),
    impAmps: parseFloat(scrapedData.imp || 13.6),
    vocVolts: parseFloat(scrapedData.voc || 50.8),
    iscAmps: parseFloat(scrapedData.isc || 14.3),
    betaVocPerC: parseFloat(scrapedData.betaVoc || -0.0028)
  };
}

export function normalizeInverter(scrapedData) {
  return {
    id: scrapedData.id || undefined,
    manufacturer: scrapedData.brand || scrapedData.manufacturer || "Generic Inverter",
    modelName: scrapedData.model || scrapedData.title || "Standard Inverter",
    pnomAcKw: parseFloat(scrapedData.powerKw || 10.0),
    vdcMaxVolts: parseFloat(scrapedData.vdcMax || 1000.0),
    vmpptMinVolts: parseFloat(scrapedData.vmpptMin || 200.0),
    vmpptMaxVolts: parseFloat(scrapedData.vmpptMax || 800.0)
  };
}

export function normalizeBattery(scrapedData) {
  return {
    id: scrapedData.id || undefined,
    manufacturer: scrapedData.brand || scrapedData.manufacturer || "Generic Battery",
    modelName: scrapedData.model || scrapedData.title || "Storage Pack",
    capacityKwh: parseFloat(scrapedData.kwh || 10.2),
    nominalVoltageVolts: parseFloat(scrapedData.voltage || 400.0),
    depthOfDischargeMax: parseFloat(scrapedData.dod || 0.8)
  };
}
