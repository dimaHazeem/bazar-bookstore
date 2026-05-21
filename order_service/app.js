const CATALOG_URL = process.env.CATALOG_URL || 'http://localhost:5001';
const ORDER_REPLICA_URL = process.env.ORDER_REPLICA_URL || '';

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

    // 3. Insert order into this order replica database
    const time = dayjs().format('MMM DD, YYYY, hh:mm:ss A');

    orderDb.run(
      `INSERT INTO orders (item_id, title, time) VALUES (?, ?, ?)`,
      [id, book.title, time],
      async function (err) {
        if (err) return res.status(500).json({ error: err.message });

        const orderData = {
          item_id: id,
          title: book.title,
          time: time
        };

        // 4. Sync the same order to the other order replica
        if (ORDER_REPLICA_URL) {
          try {
            await axios.post(`${ORDER_REPLICA_URL}/sync/order`, orderData);
            console.log(`Synced order for item ${id} to replica ${ORDER_REPLICA_URL}`);
          } catch (syncErr) {
            console.log(`Could not sync order to replica: ${syncErr.message}`);
          }
        }

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

// POST /sync/order
// This endpoint is used by the other order replica.
// It stores the synced order without sending it back again.
// This avoids an infinite replication loop.
app.post('/sync/order', (req, res) => {
  const { item_id, title, time } = req.body;

  if (!item_id || !title || !time) {
    return res.status(400).json({ error: "Missing order fields" });
  }

  orderDb.run(
    `INSERT INTO orders (item_id, title, time) VALUES (?, ?, ?)`,
    [item_id, title, time],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      console.log(`Replica synchronized order for item ${item_id}`);

      res.json({
        message: "Order synchronized successfully",
        order_id: this.lastID,
        item_id,
        title,
        time
      });
    }
  );
});

app.listen(5002, () => {
  console.log("Order service running on port 5002");
});