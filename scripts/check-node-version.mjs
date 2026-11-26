import {fileURLToPath} from 'node:url';
import path from 'node:path';

// Mirrors package.json engines and ESLint 10's supported runtimes.
export function isSupportedNode(version) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) return false;
  const [major, minor] = version.split('.').map(Number);
  return (major === 20 && minor >= 19) || (major === 22 && minor >= 13) || major >= 24;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!isSupportedNode(process.versions.node)) {
    console.error(`Unsupported Node.js ${process.versions.node}. Install Node.js 20.19+, 22.13+, or 24+ (current LTS recommended).`);
    process.exitCode = 1;
  }
}
