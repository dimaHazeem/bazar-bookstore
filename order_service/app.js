const CATALOG_URL = process.env.CATALOG_URL || 'http://localhost:5001';
const dayjs = require('dayjs');
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
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid item id" });
  }
  try {
    // 1. Get book info from Catalog
    const catalogResp = await axios.get(`${CATALOG_URL}/info/${id}`);
    const book = catalogResp.data;
    if (book.quantity <= 0) {
      return res.status(409).json({ error: "Out of stock" });
    }
    // 2. Decrement stock in Catalog
    await axios.put(`${CATALOG_URL}/update/${id}`, { quantity: book.quantity - 1 });
    // 3. Insert order into SQLite
    const time = dayjs().format('MMM DD, YYYY, hh:mm:ss A');
    orderDb.run(
      `INSERT INTO orders (item_id, title, time) VALUES (?, ?, ?)`,
      [id, book.title, time],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });

        console.log(`Purchase request received for item ${id}`);
        console.log(`bought book ${book.title}`);

        res.json({
          message: `Bought book: ${book.title}`,
          order_id: this.lastID,
          item_id: id,
          time: time
        });
      }
    );
  } catch (err) {
    res.status(err.response?.status || 500).json(
      err.response?.data || { error: err.message || "Service error" }
    );
  }
});

app.listen(5002, () => {
  console.log("Order service running on port 5002");
});