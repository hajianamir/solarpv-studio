import assert from 'node:assert/strict';
import fs from 'node:fs';

const waterfallUi = fs.readFileSync('src/components/WaterfallLossTab.tsx', 'utf8');
assert.ok(!waterfallUi.includes('26.5'), 'Waterfall UI must not render the retired hard-coded 26.5% tracker gain');

for (const path of [
  'src/components/AdvancedFeaturesModal.tsx',
  'src/engine/core/featureFlags.ts',
  'src/engine/core/FeatureFlagContext.tsx',
]) {
  assert.ok(!fs.existsSync(path), `${path} is retired and must not reappear`);
}

console.log('Node-only source invariants passed (tracker UI is engine-driven; retired phantom feature files remain absent).');
