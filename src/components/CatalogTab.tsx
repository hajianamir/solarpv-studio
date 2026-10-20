import React, { useState } from 'react';
import { Database, Search, Filter, Plus, Check } from 'lucide-react';
import {
  CATALOG_MODULES,
  CATALOG_INVERTERS,
  CATALOG_BATTERIES,
  CatalogPvModule,
  CatalogInverter,
  CatalogBattery,
} from '../engine/equipmentCatalogData';

export const CatalogTab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'modules' | 'inverters' | 'batteries'>('modules');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');

  const [customModules, setCustomModules] = useState<CatalogPvModule[]>(CATALOG_MODULES);
  const [customInverters, setCustomInverters] = useState<CatalogInverter[]>(CATALOG_INVERTERS);
  const [customBatteries, setCustomBatteries] = useState<CatalogBattery[]>(CATALOG_BATTERIES);

  // Filter modules
  const filteredModules = customModules.filter((m) => {
    const matchesSearch =
      m.modelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.manufacturer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBrand = selectedBrand === 'all' || m.manufacturer === selectedBrand;
    return matchesSearch && matchesBrand;
  });

  // Filter inverters
  const filteredInverters = customInverters.filter((i) => {
    const matchesSearch =
      i.modelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.manufacturer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBrand = selectedBrand === 'all' || i.manufacturer === selectedBrand;
    return matchesSearch && matchesBrand;
  });

  // Filter batteries
  const filteredBatteries = customBatteries.filter((b) => {
    const matchesSearch =
      b.modelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.manufacturer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBrand = selectedBrand === 'all' || b.manufacturer === selectedBrand;
    return matchesSearch && matchesBrand;
  });

  // Unique brand lists
  const moduleBrands = ['all', ...Array.from(new Set(customModules.map((m) => m.manufacturer)))];
  const inverterBrands = ['all', ...Array.from(new Set(customInverters.map((i) => i.manufacturer)))];
  const batteryBrands = ['all', ...Array.from(new Set(customBatteries.map((b) => b.manufacturer)))];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="studio-card">
        <h1 className="text-xl font-bold text-sky-400 mb-1 flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-400" />
          کتابخانه جامع تجهیزات خورشیدی و ادوات بازار ایران و جهان (Equipment Catalog)
        </h1>
        <p className="text-slate-400 text-xs">
          بانک اطلاعاتی بیش از ۱۰۰ تجهیز فتوولتائیک، اینورترهای هیبرید/آفگرید و باتری‌های ذخیره‌ساز لیتیوم و ژل معتبر
        </p>
      </div>

      {/* Tabs & Search Header */}
      <div className="studio-card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex border-b border-slate-700">
            <button
              onClick={() => {
                setActiveTab('modules');
                setSelectedBrand('all');
              }}
              className={`py-2 px-4 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'modules'
                  ? 'border-sky-400 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              پنل‌های خورشیدی ({customModules.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('inverters');
                setSelectedBrand('all');
              }}
              className={`py-2 px-4 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'inverters'
                  ? 'border-sky-400 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              اینورترها ({customInverters.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('batteries');
                setSelectedBrand('all');
              }}
              className={`py-2 px-4 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'batteries'
                  ? 'border-sky-400 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              باتری‌ها ({customBatteries.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
              <input
                type="text"
                placeholder="جستجوی مدل یا برند..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="studio-input pr-8 text-xs py-1.5 w-48"
              />
            </div>

            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="studio-input text-xs py-1.5 w-auto"
            >
              {(activeTab === 'modules'
                ? moduleBrands
                : activeTab === 'inverters'
                ? inverterBrands
                : batteryBrands
              ).map((b) => (
                <option key={b} value={b}>
                  {b === 'all' ? 'همه برندها' : b}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Table */}
        <div className="overflow-x-auto">
          {activeTab === 'modules' && (
            <table className="w-full text-right text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="p-2.5">سازنده</th>
                  <th className="p-2.5">مدل ماژول</th>
                  <th className="p-2.5">فناوری سلول</th>
                  <th className="p-2.5">توان (Pmp)</th>
                  <th className="p-2.5">Voc (V)</th>
                  <th className="p-2.5">Vmp (V)</th>
                  <th className="p-2.5">Isc (A)</th>
                  <th className="p-2.5">بازدهی (%)</th>
                  <th className="p-2.5">وزن</th>
                  <th className="p-2.5">گارانتی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredModules.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-850/60">
                    <td className="p-2.5 font-bold text-white">{m.manufacturer}</td>
                    <td className="p-2.5 text-sky-300 font-mono">{m.modelName}</td>
                    <td className="p-2.5 text-[11px] text-slate-300">{m.cellType}</td>
                    <td className="p-2.5 font-mono font-bold text-emerald-400">{m.pmpWatts} W</td>
                    <td className="p-2.5 font-mono">{m.vocVolts} V</td>
                    <td className="p-2.5 font-mono">{m.vmpVolts} V</td>
                    <td className="p-2.5 font-mono">{m.iscAmps} A</td>
                    <td className="p-2.5 font-mono text-amber-300 font-bold">{m.efficiencyPct}%</td>
                    <td className="p-2.5 font-mono text-slate-400">{m.weightKg} kg</td>
                    <td className="p-2.5 text-slate-300">{m.warrantyYears} سال</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'inverters' && (
            <table className="w-full text-right text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="p-2.5">سازنده</th>
                  <th className="p-2.5">مدل اینورتر</th>
                  <th className="p-2.5">توان نامی AC</th>
                  <th className="p-2.5">نوع دستگاه</th>
                  <th className="p-2.5">ولتاژ ماکزیمم DC</th>
                  <th className="p-2.5">محدوده MPPT</th>
                  <th className="p-2.5">ولتاژ باتری</th>
                  <th className="p-2.5">فاز</th>
                  <th className="p-2.5">پارالل</th>
                  <th className="p-2.5">بازدهی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredInverters.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-850/60">
                    <td className="p-2.5 font-bold text-white">{i.manufacturer}</td>
                    <td className="p-2.5 text-sky-300 font-mono">{i.modelName}</td>
                    <td className="p-2.5 font-mono font-bold text-emerald-400">{i.pnomKw} kW</td>
                    <td className="p-2.5 text-[11px] text-slate-300">
                      {i.type === 'hybrid_offgrid' ? 'هیبرید / آف‌گرید' : 'متصل به شبکه (On-Grid)'}
                    </td>
                    <td className="p-2.5 font-mono text-red-300">{i.vdcMaxVolts} V</td>
                    <td className="p-2.5 font-mono text-[11px]">
                      {i.vmpptMinVolts}V - {i.vmpptMaxVolts}V ({i.mpptCount} MPPT)
                    </td>
                    <td className="p-2.5 font-mono text-purple-300">{i.batteryVoltageVdc ? `${i.batteryVoltageVdc}V` : '-'}</td>
                    <td className="p-2.5 text-slate-300">{i.isThreePhase ? 'سه فاز' : 'تک فاز'}</td>
                    <td className="p-2.5 text-slate-300">{i.parallelCapable ? `بله (تا ${i.maxParallelUnits})` : 'خیر'}</td>
                    <td className="p-2.5 font-mono text-amber-300 font-bold">{i.efficiencyMaxPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'batteries' && (
            <table className="w-full text-right text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="p-2.5">سازنده</th>
                  <th className="p-2.5">مدل باتری</th>
                  <th className="p-2.5">شیمی باتری</th>
                  <th className="p-2.5">ظرفیت ناخالص</th>
                  <th className="p-2.5">ولتاژ نامی</th>
                  <th className="p-2.5">آمپر ساعت (Ah)</th>
                  <th className="p-2.5">عمق دشارژ (DoD)</th>
                  <th className="p-2.5">طول عمر سیکلی</th>
                  <th className="p-2.5">حداکثر دشارژ</th>
                  <th className="p-2.5">BMS هوشمند</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredBatteries.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-850/60">
                    <td className="p-2.5 font-bold text-white">{b.manufacturer}</td>
                    <td className="p-2.5 text-sky-300 font-mono">{b.modelName}</td>
                    <td className="p-2.5 text-[11px] text-slate-300">{b.chemistry}</td>
                    <td className="p-2.5 font-mono font-bold text-emerald-400">{b.capacityKwh} kWh</td>
                    <td className="p-2.5 font-mono">{b.nominalVoltageVolts} V</td>
                    <td className="p-2.5 font-mono">{b.nominalCapacityAh} Ah</td>
                    <td className="p-2.5 font-mono text-sky-400 font-bold">{b.recommendedDoDPct}%</td>
                    <td className="p-2.5 font-mono text-purple-300">{b.cycleLifeAt80DoD} سیکل</td>
                    <td className="p-2.5 font-mono">{b.maxContinuousDischargeA} A</td>
                    <td className="p-2.5 text-slate-300">
                      {b.hasIntegratedBms ? (
                        <span className="text-emerald-400">دارد (CAN/RS485)</span>
                      ) : (
                        <span className="text-slate-500">ندارد (آنالوگ)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
