const CATALOG_URL = process.env.CATALOG_URL || 'http://localhost:5001';
const ORDER_URL = process.env.ORDER_URL || 'http://localhost:5002';

const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// Search books
app.get('/search/:topic', async (req, res) => {
  try {
    const topic = req.params.topic;
    const result = await axios.get(`${CATALOG_URL}/search/${topic}`);
    console.log(`Search for topic: ${topic}`);
    console.log(result.data);
    res.json(result.data);
  } catch (err) {
    res.status(err.response?.status || 500).json(
      err.response?.data || { error: "Service error" }
    );
  }
});

// Book info
app.get('/info/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid item id" });
    }
    const result = await axios.get(`${CATALOG_URL}/info/${id}`);
    console.log(`Info request for item: ${id}`);
    console.log(result.data);
    res.json(result.data);
  } catch (err) {
    res.status(err.response?.status || 500).json(
      err.response?.data || { error: "Service error" }
    );
  }
});

// Purchase book
app.post('/purchase/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid item id" });
    }
    const result = await axios.post(`${ORDER_URL}/purchase/${id}`);
    console.log(`Purchase request for item: ${id}`);
    console.log(result.data);
    res.json(result.data);
  } catch (err) {
    res.status(err.response?.status || 500).json(
      err.response?.data || { error: "Service error" }
    );
  }
});

app.listen(5000, () => {
  console.log("Frontend running on port 5000");
});