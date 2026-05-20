const CATALOG_REPLICAS = (process.env.CATALOG_REPLICAS || 'http://localhost:5001').split(',');
const ORDER_REPLICAS = (process.env.ORDER_REPLICAS || 'http://localhost:5002').split(',');

let catalogIndex = 0;
let orderIndex = 0;

function getNextCatalogReplica() {
  const replica = CATALOG_REPLICAS[catalogIndex];
  catalogIndex = (catalogIndex + 1) % CATALOG_REPLICAS.length;
  return replica;
}

function getNextOrderReplica() {
  const replica = ORDER_REPLICAS[orderIndex];
  orderIndex = (orderIndex + 1) % ORDER_REPLICAS.length;
  return replica;
}

const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Simple in-memory cache for Lab 2
// Key example: "info:5"
// Value example: { title, quantity, price }
const cache = {};

// Search books
// For now, search still goes directly to catalog.
// We will focus caching on /info/:id first because the lab says cache stores lookup results.
app.get('/search/:topic', async (req, res) => {
  try {
    const topic = req.params.topic;

    const catalogReplica = getNextCatalogReplica();
    console.log(`Forwarding search request to ${catalogReplica}`);

    const result = await axios.get(`${catalogReplica}/search/${topic}`);

    console.log(`Search for topic: ${topic}`);
    console.log(result.data);

    res.json({
      source: "catalog",
      data: result.data
    });
  } catch (err) {
    res.status(err.response?.status || 500).json(
      err.response?.data || { error: "Service error" }
    );
  }
});

// Book info with cache
app.get('/info/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid item id" });
    }

    const cacheKey = `info:${id}`;

    // 1. Check cache first
    if (cache[cacheKey]) {
      console.log(`CACHE HIT for item ${id}`);
      return res.json({
        source: "cache",
        data: cache[cacheKey]
      });
    }

    // 2. If not in cache, ask catalog server
    console.log(`CACHE MISS for item ${id}`);
    const catalogReplica = getNextCatalogReplica();
    console.log(`Forwarding info request to ${catalogReplica}`);

    const result = await axios.get(`${catalogReplica}/info/${id}`);

    // 3. Save result in cache
    cache[cacheKey] = result.data;

    console.log(`Info request for item: ${id}`);
    console.log(result.data);

    res.json({
      source: "catalog",
      data: result.data
    });
  } catch (err) {
    res.status(err.response?.status || 500).json(
      err.response?.data || { error: "Service error" }
    );
  }
});

// Purchase book
// Purchase is a write request, so it must NOT be served from cache.
app.post('/purchase/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid item id" });
    }

    const orderReplica = getNextOrderReplica();
    console.log(`Forwarding purchase request to ${orderReplica}`);

    const result = await axios.post(`${orderReplica}/purchase/${id}`);

    console.log(`Purchase request for item: ${id}`);
    console.log(result.data);

    res.json(result.data);
  } catch (err) {
    res.status(err.response?.status || 500).json(
      err.response?.data || { error: "Service error" }
    );
  }
});

// Invalidate one item from cache
// Backend services call this before updating the database
app.post('/invalidate/:id', (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid item id" });
  }

  const cacheKey = `info:${id}`;

  if (cache[cacheKey]) {
    delete cache[cacheKey];
    console.log(`Cache invalidated for item ${id}`);
  } else {
    console.log(`Invalidate request for item ${id}, but item was not in cache`);
  }

  res.json({
    message: `Cache invalidated for item ${id}`
  });
});


// Endpoint to manually clear the whole cache
app.delete('/cache', (req, res) => {
  for (const key in cache) {
    delete cache[key];
  }

  console.log("Cache cleared");

  res.json({
    message: "Cache cleared successfully"
  });
});

// Endpoint to see what is currently inside the cache
app.get('/cache', (req, res) => {
  res.json(cache);
});

app.listen(5000, () => {
  console.log("Frontend running on port 5000");
});