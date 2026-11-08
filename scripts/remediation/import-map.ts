/**
 * SolarPV Studio - Baseline Import Graph & Equipment Catalog Analyzer
 * Measures: M-H1, M-H2, M-H3, M-H4, M-H5
 */

import fs from 'fs';
import path from 'path';
import {
  CATALOG_MODULES,
  CATALOG_INVERTERS,
  CATALOG_BATTERIES,
} from '../../src/engine/equipmentCatalogData';

export interface CatalogStats {
  moduleCount: number;
  inverterCount: number;
  batteryCount: number;
  modulesWithNoctCount: number;
  modulesWithNoctPct: number;
}

export interface ImportGraphNode {
  filePath: string;
  relativePath: string;
  importedBy: string[];
  imports: string[];
}

export interface ImportMapReport {
  catalog: CatalogStats;
  orphans: string[];
  uncalledExportedFunctions: { name: string; file: string }[];
  duplicatedPhysicalModules: {
    domain: string;
    description: string;
    modules: string[];
  }[];
  allEngineModules: string[];
  importGraph: Record<string, { importedBy: string[]; imports: string[] }>;
}

export function analyzeCatalog(): CatalogStats {
  const moduleCount = CATALOG_MODULES.length;
  const inverterCount = CATALOG_INVERTERS.length;
  const batteryCount = CATALOG_BATTERIES.length;
  const modulesWithNoctCount = CATALOG_MODULES.filter((m) => {
    const rawNoct = (m as unknown as Record<string, unknown>).noctC;
    return typeof rawNoct === 'number' && Number.isFinite(rawNoct) && rawNoct > 0;
  }).length;
  const modulesWithNoctPct = Number(((modulesWithNoctCount / moduleCount) * 100).toFixed(2));

  return {
    moduleCount,
    inverterCount,
    batteryCount,
    modulesWithNoctCount,
    modulesWithNoctPct,
  };
}

function getAllFiles(dir: string, ext = ['.ts', '.tsx']): string[] {
  let files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getAllFiles(fullPath, ext));
    } else if (ext.some((e) => entry.name.endsWith(e))) {
      files.push(fullPath);
    }
  }
  return files;
}

export function buildImportGraph(): ImportMapReport {
  const rootDir = process.cwd();
  const srcDir = path.join(rootDir, 'src');
  const engineDir = path.join(srcDir, 'engine');
  const allSrcFiles = getAllFiles(srcDir);
  const serverFile = path.join(rootDir, 'server.ts');
  const allTrackedFiles = [...allSrcFiles, ...(fs.existsSync(serverFile) ? [serverFile] : [])];

  const engineFiles = getAllFiles(engineDir);
  const relEngineFiles = engineFiles.map((f) => path.relative(rootDir, f).replace(/\\/g, '/')).sort();

  // Map relative file path -> list of files that import it
  const importedByMap: Record<string, Set<string>> = {};
  const importsMap: Record<string, Set<string>> = {};

  for (const f of relEngineFiles) {
    importedByMap[f] = new Set();
    importsMap[f] = new Set();
  }

  // Parse imports across allTrackedFiles
  const importRegex = /(?:import|export)\s+(?:[\w*\s{},]*\s+from\s+)?['"]([^'"]+)['"]/g;

  for (const filePath of allTrackedFiles) {
    const relFromRoot = path.relative(rootDir, filePath).replace(/\\/g, '/');
    const content = fs.readFileSync(filePath, 'utf-8');
    let match: RegExpExecArray | null;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath.startsWith('.')) {
        const fileDir = path.dirname(filePath);
        let resolved = path.resolve(fileDir, importPath);

        // Try extensions
        const candidates = [
          resolved,
          `${resolved}.ts`,
          `${resolved}.tsx`,
          `${resolved}/index.ts`,
          `${resolved}/index.tsx`,
          resolved.replace(/\.js$/, '.ts'),
          resolved.replace(/\.js$/, '.tsx'),
        ];

        let matchedCandidate: string | null = null;
        for (const cand of candidates) {
          if (fs.existsSync(cand) && !fs.statSync(cand).isDirectory()) {
            matchedCandidate = cand;
            break;
          }
        }

        if (matchedCandidate) {
          const relCandidate = path.relative(rootDir, matchedCandidate).replace(/\\/g, '/');
          if (relEngineFiles.includes(relCandidate)) {
            importedByMap[relCandidate]?.add(relFromRoot);
            if (relEngineFiles.includes(relFromRoot)) {
              importsMap[relFromRoot]?.add(relCandidate);
            }
          }
        }
      }
    }
  }

  // Identify orphan engine files (not imported by any other file, excluding benchmark/test suites)
  const orphans = relEngineFiles.filter((f) => {
    // Exclude benchmarks / test vectors themselves as they are entry points
    if (f.includes('benchmarks/')) return false;
    const importers = Array.from(importedByMap[f] || []);
    return importers.length === 0;
  });

  // Physical duplication analysis
  const duplicatedPhysicalModules = [
    {
      domain: 'Thermal Derate Model',
      description: 'Unified calculateThermalDerate vs legacy in-engine NOCT approximations',
      modules: ['src/engine/core/thermalDerate.ts', 'src/engine/pvEngineAdvanced.ts', 'src/engine/waterfallLossEngine.ts'],
    },
    {
      domain: 'Bifacial Gain Evaluation',
      description: 'First-order proxy rearGainFraction vs 2D view-factor calculateBifacialViewFactor',
      modules: ['src/engine/bifacialGain.ts', 'src/engine/bifacial/bifacial2dViewFactor.ts'],
    },
    {
      domain: 'Solar Position & Sun Path',
      description: 'Astronomical calculateSolarPosition vs shadingSunPathEngine vs buildClearSkySunPath',
      modules: ['src/engine/solarPvEngine.ts', 'src/engine/shadingSunPathEngine.ts', 'src/engine/waterfallLossEngine.ts'],
    },
    {
      domain: 'Annual Yield & Generation Estimation',
      description: '14-stage Waterfall model vs designPvArray PSH multiplication vs quick-sizing 0.78 derate',
      modules: ['src/engine/waterfallLossEngine.ts', 'src/engine/pvEngineAdvanced.ts', 'src/engine/solarPvEngine.ts'],
    },
    {
      domain: 'Foundation & Geotechnical Recommendation',
      description: 'recommendFoundation vs recommendSharedFoundation dual dispatch',
      modules: ['src/engine/geotech/foundationRecommendationEngine.ts', 'src/engine/structuralEngine.ts'],
    },
  ];

  const serializedGraph: Record<string, { importedBy: string[]; imports: string[] }> = {};
  for (const f of relEngineFiles) {
    serializedGraph[f] = {
      importedBy: Array.from(importedByMap[f] || []).sort(),
      imports: Array.from(importsMap[f] || []).sort(),
    };
  }

  // Uncalled exported functions analysis (M-H4)
  const exportedFunctions: { name: string; file: string }[] = [];
  const fnRegex = /export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(/g;

  for (const f of engineFiles) {
    const content = fs.readFileSync(f, 'utf-8');
    let match: RegExpExecArray | null;
    while ((match = fnRegex.exec(content)) !== null) {
      exportedFunctions.push({ name: match[1], file: path.relative(rootDir, f).replace(/\\/g, '/') });
    }
  }

  const uncalledExportedFunctions: { name: string; file: string }[] = [];
  for (const fn of exportedFunctions) {
    let calls = 0;
    const nameRegex = new RegExp('\\b' + fn.name + '\\b', 'g');
    for (const file of allTrackedFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const matches = content.match(nameRegex) || [];
      calls += matches.length;
    }
    if (calls <= 1) {
      uncalledExportedFunctions.push(fn);
    }
  }

  return {
    catalog: analyzeCatalog(),
    orphans,
    uncalledExportedFunctions,
    duplicatedPhysicalModules,
    allEngineModules: relEngineFiles,
    importGraph: serializedGraph,
  };
}

// CLI execution
if (process.argv[1]?.endsWith('import-map.ts') || process.argv[1]?.endsWith('import-map.js')) {
  const result = buildImportGraph();
  console.log('=== CATALOG STATS (M-H1) ===');
  console.log(JSON.stringify(result.catalog, null, 2));
  console.log('\n=== ORPHAN ENGINE MODULES (M-H3) ===');
  console.log(JSON.stringify(result.orphans, null, 2));
  console.log('\n=== DUPLICATED PHYSICAL DOMAINS (M-H5) ===');
  console.log(JSON.stringify(result.duplicatedPhysicalModules, null, 2));
}
