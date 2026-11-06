// Iranian Renewable Energy Regulations, SATBA PPA, Article 16 & IRENEX Green Board Financial Engine

export type IranianRegulationFramework =
  | 'article_16'     // ماده ۱۶ قانون جهش تولید دانش‌بنیان
  | 'green_exchange' // تابلو سبز بورس انرژی (IRENEX)
  | 'satba_fit_ppa'  // خرید تضمینی ۲۰ ساله ساتبا
  | 'self_generation';// خودتامین صنایع و جلوگیری از خاموشی پیک تابستان

export interface CashFlowYear {
  year: number;
  generationMwh: number;
  revenueMillionToman: number;
  opexMillionToman: number;
  debtServiceMillionToman: number;
  netCashFlowMillionToman: number;
  cumulativeCashFlowMillionToman: number;
  dscr: number | null; // Debt Service Coverage Ratio (null if no debt service)
}

export interface IranianFinancialModelResult {
  frameworkNameFa: string;
  tariffPerKwhToman: number;
  totalCapexMillionToman: number;
  equityContributionMillionToman: number;
  bankLoanMillionToman: number;
  projectIrrPct: number | null;
  equityIrrPct: number | null;
  npvMillionToman: number;
  simplePaybackYears: number;
  discountedPaybackYears: number;
  lcoeTomanPerKwh: number;
  article16PenaltyAvoidedMillionToman: number;
  summerBlackoutLossPreventedMillionToman: number;
  cashFlow25Years: CashFlowYear[];
}

export function runIranianRegulationFinancialModel(
  capacityKwp: number,
  annualGenerationMwh: number,
  framework: IranianRegulationFramework,
  customTariffTomanPerKwh: number = 4200,
  loanSharePct: number = 70, // 70% debt financing
  loanInterestPct: number = 23.0, // 23% Iranian bank loan interest
  loanTermYears: number = 5,
  inflationPct: number = 25.0
): IranianFinancialModelResult {
  // 1. Determine tariff and framework details
  let tariffPerKwhToman = customTariffTomanPerKwh;
  let frameworkNameFa = '';

  if (framework === 'article_16') {
    frameworkNameFa = 'ماده ۱۶ قانون جهش تولید دانش‌بنیان (الزام صنایع به تامین برق سبز)';
    tariffPerKwhToman = Math.max(3800, customTariffTomanPerKwh);
  } else if (framework === 'green_exchange') {
    frameworkNameFa = 'تابلو سبز بورس انرژی ایران (IRENEX Green Board)';
    tariffPerKwhToman = Math.max(4500, customTariffTomanPerKwh);
  } else if (framework === 'satba_fit_ppa') {
    frameworkNameFa = 'قرارداد خرید تضمینی ۲۰ ساله ساتبا (SATBA FIT PPA)';
    tariffPerKwhToman = Math.max(3200, customTariffTomanPerKwh);
  } else {
    frameworkNameFa = 'نیروگاه خورشیدی خودتامین صنایع (جلوگیری از قطعی برق تابستان)';
    tariffPerKwhToman = Math.max(5000, customTariffTomanPerKwh);
  }

  // 2. CAPEX benchmark in Million Toman
  // Utility / C&I rate: ~$350/kWp = ~31.5 Million Toman per kWp
  const totalCapexMillionToman = Math.round((capacityKwp * 31.5));
  const bankLoanMillionToman = Math.round((totalCapexMillionToman * loanSharePct) / 100.0);
  const equityContributionMillionToman = totalCapexMillionToman - bankLoanMillionToman;

  // Annual loan annuity payment (Equal Installments)
  const r = loanInterestPct / 100.0;
  const annuityFactor = (r * Math.pow(1 + r, loanTermYears)) / (Math.pow(1 + r, loanTermYears) - 1);
  const annualLoanAnnuity = bankLoanMillionToman > 0 ? bankLoanMillionToman * annuityFactor : 0;

  // 3. 25-Year Cash Flow Projection
  const cashFlows: CashFlowYear[] = [];
  let cumulativeCash = -equityContributionMillionToman;
  const degradationRate = 0.0045; // 0.45% per year for N-Type TOPCon
  let initialOpex = totalCapexMillionToman * 0.015; // 1.5% of capex per year

  let simplePaybackYears = 25.0;
  let discountedPaybackYears = 25.0;
  let cumulativeDiscounted = -equityContributionMillionToman;
  const discountRate = 0.20; // 20% cost of capital in IRR

  for (let yr = 1; yr <= 25; yr++) {
    const genMwh = annualGenerationMwh * Math.pow(1.0 - degradationRate, yr - 1);

    // Tariff escalation with partial inflation indexing (typically ~15% annual step in green board / SATBA adjustment)
    const escalatedTariff = tariffPerKwhToman * Math.pow(1.0 + 0.12, yr - 1);
    const revenueMillion = Math.round((genMwh * 1000 * escalatedTariff) / 1e6);

    const opexMillion = Math.round(initialOpex * Math.pow(1.0 + 0.15, yr - 1));
    const debtService = yr <= loanTermYears ? Math.round(annualLoanAnnuity) : 0;

    const netOperatingIncome = revenueMillion - opexMillion;
    const dscr = debtService > 0 ? Math.round((netOperatingIncome / debtService) * 100) / 100 : null;

    const netCashFlow = netOperatingIncome - debtService;
    cumulativeCash += netCashFlow;

    // Simple payback detection
    if (cumulativeCash >= 0 && simplePaybackYears === 25.0) {
      simplePaybackYears = Math.round((yr - 1 + (Math.abs(cumulativeCash - netCashFlow) / netCashFlow)) * 10) / 10;
    }

    // Discounted payback detection
    const discountedCash = netCashFlow / Math.pow(1.0 + discountRate, yr);
    cumulativeDiscounted += discountedCash;
    if (cumulativeDiscounted >= 0 && discountedPaybackYears === 25.0) {
      discountedPaybackYears = Math.round((yr - 1 + (Math.abs(cumulativeDiscounted - discountedCash) / discountedCash)) * 10) / 10;
    }

    cashFlows.push({
      year: yr,
      generationMwh: Math.round(genMwh),
      revenueMillionToman: revenueMillion,
      opexMillionToman: opexMillion,
      debtServiceMillionToman: debtService,
      netCashFlowMillionToman: netCashFlow,
      cumulativeCashFlowMillionToman: Math.round(cumulativeCash),
      dscr,
    });
  }

  // 4. Calculate Internal Rate of Return (IRR) via robust hybrid root-finder
  const equityCashFlowSeries = [-equityContributionMillionToman, ...cashFlows.map(c => c.netCashFlowMillionToman)];
  const projectCashFlowSeries = [-totalCapexMillionToman, ...cashFlows.map(c => c.revenueMillionToman - c.opexMillionToman)];

  const calcIrr = (series: number[]): number | null => {
    const hasPos = series.some(c => c > 0);
    const hasNeg = series.some(c => c < 0);
    if (!hasPos || !hasNeg) return null;

    const npv = (r: number): number => {
      let sum = 0;
      for (let t = 0; t < series.length; t++) {
        sum += series[t] / Math.pow(1.0 + r, t);
      }
      return sum;
    };

    // Multi-guess Newton-Raphson
    const guesses = [0.20, 0.35, 0.10, 0.50, -0.10, 0.80];
    for (const guess of guesses) {
      let rate = guess;
      for (let i = 0; i < 40; i++) {
        if (rate <= -0.99 || rate > 10.0) break;
        let val = 0;
        let dVal = 0;
        for (let t = 0; t < series.length; t++) {
          const denom = Math.pow(1.0 + rate, t);
          val += series[t] / denom;
          dVal += (-t * series[t]) / (denom * (1.0 + rate));
        }
        if (Math.abs(dVal) < 1e-9) break;
        const next = rate - val / dVal;
        if (Math.abs(next - rate) < 1e-5 && Math.abs(val) < 1e-2) {
          if (next > -0.99 && next < 10.0) {
            return Math.round(next * 1000) / 10;
          }
        }
        rate = next;
      }
    }

    // Bounded Bolzano bisection fallback on [-0.95, +5.0]
    const low = -0.95;
    const high = 5.0;
    const npvLow = npv(low);
    const npvHigh = npv(high);
    if (npvLow * npvHigh <= 0) {
      let a = low;
      let b = high;
      for (let iter = 0; iter < 70; iter++) {
        const mid = (a + b) / 2.0;
        const npvMid = npv(mid);
        if (npvMid * npvLow > 0) {
          a = mid;
        } else {
          b = mid;
        }
      }
      const root = (a + b) / 2.0;
      return Math.round(root * 1000) / 10;
    }

    return null;
  };

  const equityIrrPct = calcIrr(equityCashFlowSeries);
  const projectIrrPct = calcIrr(projectCashFlowSeries);

  // NPV calculation at 20% discount
  const npvMillionToman = Math.round(
    equityCashFlowSeries.reduce((acc, val, t) => acc + val / Math.pow(1.0 + discountRate, t), 0)
  );

  // Article 16 penalty avoidance (typically ~4,000 Toman/kWh penalty for deficit)
  const article16PenaltyAvoidedMillionToman = Math.round((annualGenerationMwh * 1000 * 4200) / 1e6);

  // Summer blackout loss prevented (for factories: 1 day of summer blackout = billions of Tomans in idle production loss!)
  const summerBlackoutLossPreventedMillionToman = Math.round(capacityKwp * 8.5);

  const lcoeTomanPerKwh = Math.round((totalCapexMillionToman * 1e6) / (annualGenerationMwh * 1000 * 20));

  return {
    frameworkNameFa,
    tariffPerKwhToman,
    totalCapexMillionToman,
    equityContributionMillionToman,
    bankLoanMillionToman,
    projectIrrPct,
    equityIrrPct,
    npvMillionToman,
    simplePaybackYears,
    discountedPaybackYears,
    lcoeTomanPerKwh,
    article16PenaltyAvoidedMillionToman,
    summerBlackoutLossPreventedMillionToman,
    cashFlow25Years: cashFlows,
  };
}
