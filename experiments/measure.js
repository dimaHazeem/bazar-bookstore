const axios = require("axios");

const BASE_URL = "http://localhost:5000";
const ITERATIONS = 20;

async function measureRequest(name, requestFunction) {
  const times = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const start = process.hrtime.bigint();

    try {
      await requestFunction();
    } catch (err) {
      console.log(`${name} request failed:`, err.response?.data || err.message);
    }

    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;
    times.push(durationMs);
  }

  const average = times.reduce((sum, value) => sum + value, 0) / times.length;

  return {
    name,
    average: average.toFixed(2),
    min: Math.min(...times).toFixed(2),
    max: Math.max(...times).toFixed(2)
  };
}

async function clearCache() {
  try {
    await axios.delete(`${BASE_URL}/cache`);
  } catch (err) {
    console.log("Could not clear cache:", err.message);
  }
}

async function runExperiments() {
  console.log("Starting performance experiments...\n");

  // Experiment 1: Info request without cache
  // We clear cache before each request to force cache miss.
  const noCacheResult = await measureRequest("Info without cache", async () => {
    await clearCache();
    await axios.get(`${BASE_URL}/info/5`);
  });

  // Experiment 2: Info request with cache
  // First request fills cache, then repeated requests should be cache hits.
  await clearCache();
  await axios.get(`${BASE_URL}/info/5`);

  const withCacheResult = await measureRequest("Info with cache", async () => {
    await axios.get(`${BASE_URL}/info/5`);
  });

  // Experiment 3: Purchase request
  const purchaseResult = await measureRequest("Purchase request", async () => {
    await axios.post(`${BASE_URL}/purchase/7`);
  });

  // Experiment 4: Cache invalidation + following cache miss
  await clearCache();

  // Put item 6 in cache
  await axios.get(`${BASE_URL}/info/6`);

  const invalidationStart = process.hrtime.bigint();

  // Purchase invalidates item 6
  await axios.post(`${BASE_URL}/purchase/6`);

  const invalidationEnd = process.hrtime.bigint();
  const invalidationMs = Number(invalidationEnd - invalidationStart) / 1_000_000;

  // Next info request should be cache miss because item 6 was invalidated
  const missStart = process.hrtime.bigint();
  await axios.get(`${BASE_URL}/info/6`);
  const missEnd = process.hrtime.bigint();
  const cacheMissAfterInvalidationMs = Number(missEnd - missStart) / 1_000_000;

  console.log("\nResults:");
  console.table([
    noCacheResult,
    withCacheResult,
    purchaseResult,
    {
      name: "Cache invalidation write",
      average: invalidationMs.toFixed(2),
      min: invalidationMs.toFixed(2),
      max: invalidationMs.toFixed(2)
    },
    {
      name: "Cache miss after invalidation",
      average: cacheMissAfterInvalidationMs.toFixed(2),
      min: cacheMissAfterInvalidationMs.toFixed(2),
      max: cacheMissAfterInvalidationMs.toFixed(2)
    }
  ]);
}

runExperiments();