const express = require('express');
const axios = require('axios');
const app = express();
const sqlite3 = require('sqlite3').verbose();
const orderDb = new sqlite3.Database('./orders.db', (err) => {
  if (err) console.error(err.message);
  else console.log("Connected to orders database.");
});
orderDb.run(`
  CREATE TABLE IF NOT EXISTS orders (
    order_id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER,
    title TEXT,
    time TEXT
  )
`);
app.use(express.json());

app.post('/purchase/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    // 1. Get book info from Catalog
    const catalogResp = await axios.get(`http://localhost:5001/info/${id}`);
    const book = catalogResp.data;
    if (book.quantity <= 0) {
      return res.json({ message: "Out of stock" });
    }
    // 2. Decrement stock in Catalog
    await axios.put(`http://localhost:5001/update/${id}`, { quantity: book.quantity - 1 });
    // 3. Insert order into SQLite
    const dayjs = require('dayjs');
    const time = dayjs().format('MMM DD, YYYY, hh:mm:ss A');
    orderDb.run(
      `INSERT INTO orders (item_id, title, time) VALUES (?, ?, ?)`,
      [id, book.title, time],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });

        // Return structured response
        res.json({
          message: `Bought book: ${book.title}`,
          order_id: this.lastID,
          item_id: id,
          time: time
        });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search proxy
app.get('/search/:topic', async (req, res) => {
  try {
    const topic = req.params.topic;
    const response = await axios.get(`http://localhost:5001/search/${topic}`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Info proxy
app.get('/info/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const response = await axios.get(`http://localhost:5001/info/${id}`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/update/:id', async (req, res) => {

  const id = req.params.id;

  try {

    const response = await axios.put(
      `http://localhost:5001/update/${id}`,
      req.body
    );

    res.json(response.data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }

});

app.listen(5002, () => {
  console.log("Order service running on port 5002");
});