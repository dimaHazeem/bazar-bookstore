const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Search books
app.get('/search/:topic', async (req, res) => {
  try {
    const topic = req.params.topic;
    const result = await axios.get(`http://localhost:5001/search/${topic}`);
    res.json(result.data);
  } catch (err) {
    res.status(500).json({ error: "Service error" });
  }
});

// Book info
app.get('/info/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const result = await axios.get(`http://localhost:5001/info/${id}`);
    res.json(result.data);
  } catch (err) {
    res.status(500).json({ error: "Service error" });
  }
});

// Purchase book
app.post('/purchase/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const result = await axios.post(`http://localhost:5002/purchase/${id}`);
    res.json(result.data);
  } catch (err) {
    res.status(500).json({ error: "Service error" });
  }
});

// Update book
app.put('/update/:id', async (req, res) => {
  try {
    const id = req.params.id;

    const result = await axios.put(
      `http://localhost:5001/update/${id}`,
      req.body
    );

    res.json(result.data);

  } catch (err) {
    res.status(500).json({ error: "Service error" });
  }
});

app.listen(5000, () => {
  console.log("Frontend running on port 5000");
});