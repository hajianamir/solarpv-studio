import axios from 'axios';
import Redis from 'ioredis';
import { normalizePanel, normalizeInverter, normalizeBattery } from './transformers.js';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';

const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  lazyConnect: true
});

async function processScrapeTask(task) {
  console.log(`[ScraperWorker] Processing scrape task for vendor: ${task.vendor}, type: ${task.category}`);
  
  if (task.category === 'panel') {
    const normalized = normalizePanel(task.data || {});
    await axios.post(`${API_BASE_URL}/api/v1/catalog/modules`, normalized);
    console.log(`[ScraperWorker] Ingested PV Module: ${normalized.manufacturer} ${normalized.modelName}`);
  } else if (task.category === 'inverter') {
    const normalized = normalizeInverter(task.data || {});
    await axios.post(`${API_BASE_URL}/api/v1/catalog/inverters`, normalized);
    console.log(`[ScraperWorker] Ingested Inverter: ${normalized.manufacturer} ${normalized.modelName}`);
  } else if (task.category === 'battery') {
    const normalized = normalizeBattery(task.data || {});
    await axios.post(`${API_BASE_URL}/api/v1/catalog/batteries`, normalized);
    console.log(`[ScraperWorker] Ingested Battery: ${normalized.manufacturer} ${normalized.modelName}`);
  }
}

async function startWorker() {
  console.log(`[ScraperWorker] SolarPV Scraper Service Starting...`);
  try {
    await redis.connect();
    console.log(`[ScraperWorker] Connected to Redis queue at ${REDIS_HOST}:${REDIS_PORT}`);

    while (true) {
      try {
        const item = await redis.blpop('scraper:queue', 5);
        if (item) {
          const task = JSON.parse(item[1]);
          await processScrapeTask(task);
        }
      } catch (err) {
        console.error(`[ScraperWorker] Error processing queue job:`, err.message);
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  } catch (err) {
    console.log(`[ScraperWorker] Running in standalone trigger mode (Redis offline)`);
  }
}

startWorker();
