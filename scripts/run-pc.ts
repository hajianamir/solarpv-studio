#!/usr/bin/env node
/**
 * SolarPV Studio — Complete PC Launcher
 * Cross-platform runner for Windows, macOS, and Linux PCs.
 *
 * Responsibilities:
 * 1. Checks Node.js runtime requirements (>= 18.0.0).
 * 2. Checks and initializes .env configuration if not present.
 * 3. Detects available TCP port (default: 3000, fallback: 3001-3010).
 * 4. Spawns the SolarPV Studio application server (server.ts).
 * 5. Polls the backend health check (/api/health) until active.
 * 6. Automatically opens the default web browser to the application URL.
 * 7. Manages clean process termination and terminal signals.
 */

import { spawn, exec, execSync, type ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import http from 'http';
import net from 'net';

const MIN_NODE_MAJOR = 18;
const DEFAULT_PORT = Number(process.env.PORT) || 3000;
const ROOT_DIR = process.cwd();

// --- ANSI Colors ---
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
};

function printBanner(port: number, isProd: boolean) {
  console.log(`
${c.cyan}${c.bold}================================================================================${c.reset}
${c.yellow}${c.bold}       SolarPV Studio v1.0.3 — پلتفرم جامع مهندسی و شبیه‌سازی خورشیدی${c.reset}
${c.cyan}              Cross-Platform Solar PV Engineering & Simulation Desktop${c.reset}
${c.cyan}${c.bold}================================================================================${c.reset}

  ${c.green}✔${c.reset} پلتفرم:              ${c.bold}${process.platform} (${process.arch})${c.reset}
  ${c.green}✔${c.reset} نگارش نود:           ${c.bold}${process.version}${c.reset}
  ${c.green}✔${c.reset} حالت اجرا:           ${c.bold}${isProd ? 'Production (پیش‌ساخته)' : 'Development (محیط توسعه زنده)'}${c.reset}
  ${c.green}✔${c.reset} پورت شبکه:           ${c.bold}${port}${c.reset}
  ${c.green}✔${c.reset} آدرس محلی:           ${c.bold}${c.cyan}http://localhost:${port}/${c.reset}

  ${c.dim}--------------------------------------------------------------------------------${c.reset}
  ${c.yellow}نکته:${c.reset} برای خروج از برنامه، در این پنجره کلیدهای ${c.bold}Ctrl + C${c.reset} را فشار دهید.
  ${c.dim}Press Ctrl+C at any time to shut down the server gracefully.${c.reset}
${c.cyan}${c.bold}================================================================================${c.reset}
`);
}

/**
 * Validates that current Node version meets requirements.
 */
function checkNodeVersion(): void {
  const currentMajor = parseInt(process.versions.node.split('.')[0], 10);
  if (currentMajor < MIN_NODE_MAJOR) {
    console.error(`
${c.red}${c.bold}خطا: نگارش Node.js قدیمی است!${c.reset}
SolarPV Studio نیازمند Node.js نسخه ${MIN_NODE_MAJOR} یا بالاتر است.
نسخه فعلی شما: ${process.version}
لطفاً آخرین نسخه LTS را از https://nodejs.org دریافت و نصب فرمایید.
`);
    process.exit(1);
  }
}

/**
 * Ensures node_modules are installed.
 */
function ensureDependencies(): void {
  const nodeModulesPath = path.join(ROOT_DIR, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.log(`${c.yellow}⚙ وابستگی‌های پروژه یافت نشد. در حال نصب خودکار (npm install)...${c.reset}`);
    try {
      execSync('npm install', { stdio: 'inherit', cwd: ROOT_DIR });
      console.log(`${c.green}✔ وابستگی‌ها با موفقیت نصب شدند.${c.reset}`);
    } catch (err) {
      console.error(`${c.red}خطا در نصب بسته‌ها با npm install:${c.reset}`, err);
      process.exit(1);
    }
  }
}

/**
 * Ensures .env exists, copying from .env.example if missing.
 */
function ensureEnvFile(): void {
  const envPath = path.join(ROOT_DIR, '.env');
  const examplePath = path.join(ROOT_DIR, '.env.example');

  if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
    try {
      fs.copyFileSync(examplePath, envPath);
      console.log(`${c.green}✔${c.reset} فایل پیکربندی محیطی ${c.dim}.env${c.reset} از روی ${c.dim}.env.example${c.reset} ساخته شد.`);
    } catch {
      // Non-fatal fallback
    }
  }
}

/**
 * Checks if a given TCP port is available on localhost.
 */
function checkPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          resolve(false);
        } else {
          resolve(false);
        }
      })
      .once('listening', () => {
        tester.once('close', () => resolve(true)).close();
      })
      .listen(port, '0.0.0.0');
  });
}

/**
 * Finds the first available port starting from the requested one.
 */
async function findAvailablePort(startPort: number): Promise<number> {
  for (let p = startPort; p < startPort + 20; p++) {
    const available = await checkPortAvailable(p);
    if (available) return p;
  }
  return startPort;
}

/**
 * Polls the HTTP health endpoint until server responds.
 */
function waitForServerReady(port: number, timeoutMs = 45000): Promise<boolean> {
  const startTime = Date.now();
  const url = `http://localhost:${port}/api/health`;

  return new Promise((resolve) => {
    const check = () => {
      if (Date.now() - startTime > timeoutMs) {
        resolve(false);
        return;
      }

      const req = http.get(url, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          setTimeout(check, 500);
        }
      });

      req.on('error', () => {
        setTimeout(check, 500);
      });

      req.setTimeout(1500, () => {
        req.destroy();
        setTimeout(check, 500);
      });
    };

    check();
  });
}

/**
 * Cross-platform browser launcher (Windows, macOS, Linux).
 */
function openBrowser(url: string): void {
  const platform = process.platform;
  let command = '';

  if (platform === 'win32') {
    command = `start "" "${url}" 2>nul || powershell -NoProfile -Command "Start-Process '${url}'"`;
  } else if (platform === 'darwin') {
    command = `open "${url}"`;
  } else {
    // Linux / BSD
    command = `xdg-open "${url}" || sensible-browser "${url}" || x-www-browser "${url}"`;
  }

  exec(command, (err) => {
    if (err) {
      console.log(`\n${c.yellow}مرورگر خودکار باز نشد. لطفاً آدرس زیر را در مرورگر وارد کنید:${c.reset}`);
      console.log(`${c.bold}${c.cyan}${url}${c.reset}\n`);
    } else {
      console.log(`\n${c.green}✔${c.reset} مرورگر اینترنت سیستم با آدرس ${c.bold}${url}${c.reset} باز شد.`);
    }
  });
}

/**
 * Main launcher function.
 */
async function main() {
  checkNodeVersion();
  ensureDependencies();
  ensureEnvFile();

  const isProd = process.env.NODE_ENV === 'production';
  const port = await findAvailablePort(DEFAULT_PORT);

  printBanner(port, isProd);

  console.log(`${c.cyan}⚙${c.reset} در حال راه‌اندازی سرور اختصاصی برنامه...`);

  // Set PORT for the server process
  const childEnv = {
    ...process.env,
    PORT: String(port),
  };

  // Run server using tsx
  const isWindows = process.platform === 'win32';
  const tsxBin = path.join(ROOT_DIR, 'node_modules', '.bin', isWindows ? 'tsx.cmd' : 'tsx');
  const serverScript = path.join(ROOT_DIR, 'server.ts');

  let serverProcess: ChildProcess;

  if (fs.existsSync(tsxBin)) {
    serverProcess = spawn(tsxBin, [serverScript], {
      cwd: ROOT_DIR,
      env: childEnv,
      stdio: 'inherit',
      shell: isWindows,
    });
  } else {
    // Fallback to npx tsx
    serverProcess = spawn(isWindows ? 'npx.cmd' : 'npx', ['tsx', serverScript], {
      cwd: ROOT_DIR,
      env: childEnv,
      stdio: 'inherit',
      shell: isWindows,
    });
  }

  serverProcess.on('error', (err) => {
    console.error(`${c.red}خطا در راه‌اندازی فرآیند سرور:${c.reset}`, err);
  });

  // Handle termination signals
  const cleanup = () => {
    console.log(`\n${c.yellow}در حال توقف امن سرور SolarPV Studio...${c.reset}`);
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill('SIGINT');
    }
    setTimeout(() => {
      process.exit(0);
    }, 500);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  serverProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`\n${c.red}سرور با کد خطای ${code} متوقف شد.${c.reset}`);
      process.exit(code);
    }
  });

  // Wait for health check, then open browser
  const isReady = await waitForServerReady(port);

  if (isReady) {
    const targetUrl = `http://localhost:${port}/`;
    console.log(`${c.green}✔${c.reset} سرور آماده پاسخ‌گویی است.`);
    openBrowser(targetUrl);
  } else {
    console.log(`\n${c.yellow}سرور در حال راه‌اندازی است؛ در صورت باز نشدن خودکار، به آدرس زیر بروید:${c.reset}`);
    console.log(`${c.bold}${c.cyan}http://localhost:${port}/${c.reset}\n`);
  }
}

main().catch((err) => {
  console.error(`\n${c.red}خطای پیش‌بینی‌نشده در راه‌اندازی:${c.reset}`, err);
  process.exit(1);
});
