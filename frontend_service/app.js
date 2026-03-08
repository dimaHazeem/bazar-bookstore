const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// Forward requests
app.get('/search/:topic', async (req, res) => {
  const topic = req.params.topic;
  try {
    const result = await axios.get(`http://localhost:5001/search/${topic}`);
    res.json(result.data)
  } catch (err) {
    res.status(500).json({ error: "service error" })
  }
});

app.get('/info/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const result = await axios.get(`http://localhost:5001/info/${id}`);
    res.json(result.data)
  } catch (err) {
    res.status(500).json({ error: "service error" })
  }
});

app.post('/purchase/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const result = await axios.post(`http://localhost:5002/purchase/${id}`);
    res.json(result.data)
  } catch (err) {
    res.status(500).json({ error: "service error" })
  }
});

app.listen(5000, () => console.log('Frontend running on port 5000'));