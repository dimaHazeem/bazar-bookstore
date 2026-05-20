const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5000';
const REPLICA_URL = process.env.REPLICA_URL || '';

const app = express();
const db = new sqlite3.Database('./catalog.db', (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log("Connected to catalog database.");
  }
});
db.serialize(() => {

db.run(`
CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY,
  title TEXT,
  topic TEXT,
  price INTEGER,
  quantity INTEGER
)
`);
 db.run(`
    INSERT OR IGNORE INTO books VALUES
    (1,'How to get a good grade in DOS in 40 minutes a day','distributed systems',60,5),
    (2,'RPCs for Noobs','distributed systems',50,5),
    (3,'Xen and the Art of Surviving Undergraduate School','undergraduate school',30,5),
    (4,'Cooking for the Impatient Undergrad','undergraduate school',20,5),
    (5,'How to finish Project 3 on time','undergraduate school',45,5),
    (6,'Why theory classes are so hard','undergraduate school',35,5),
    (7,'Spring in the Pioneer Valley','undergraduate school',25,5)
  `);
});

app.use(express.json());

// GET /search/:topic
app.get('/search/:topic', (req, res) => {
  const topic = req.params.topic;
  db.all(
    "SELECT id, title FROM books WHERE topic = ?",
    [topic],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// GET /info/:id
app.get('/info/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid item id" });
  }
  db.get(
    "SELECT title, quantity, price FROM books WHERE id = ?",
    [id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: "Book not found" });
      res.json(row);
    }
  );
});

// PUT /update/:id
// This endpoint is used for normal catalog updates.
// It invalidates the frontend cache, updates the local database,
// then sends the same update to the other catalog replica.
app.put('/update/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid item id" });
  }

  const { quantity, price } = req.body;

  try {
    // 1. Invalidate cache before writing to database
    try {
      await axios.post(`${FRONTEND_URL}/invalidate/${id}`);
      console.log(`Sent cache invalidation request for item ${id}`);
    } catch (invalidateErr) {
      console.log(`Could not invalidate cache for item ${id}: ${invalidateErr.message}`);
    }

    // 2. Update local database
    db.run(
      "UPDATE books SET quantity = COALESCE(?, quantity), price = COALESCE(?, price) WHERE id = ?",
      [quantity, price, id],
      async function (err) {
        if (err) return res.status(500).json({ error: err.message });

        if (this.changes === 0) {
          return res.status(404).json({ error: "Book not found" });
        }

        // 3. Send same update to the other catalog replica
        if (REPLICA_URL) {
          try {
            await axios.put(`${REPLICA_URL}/sync/update/${id}`, { quantity, price });
            console.log(`Synced update for item ${id} to replica ${REPLICA_URL}`);
          } catch (syncErr) {
            console.log(`Could not sync item ${id} to replica: ${syncErr.message}`);
          }
        }

        res.json({ message: "Book updated successfully and replica sync attempted" });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /sync/update/:id
// This endpoint is used only by the other catalog replica.
// It updates this replica without sending the update back again.
// This avoids an infinite sync loop.
app.put('/sync/update/:id', (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid item id" });
  }

  const { quantity, price } = req.body;

  db.run(
    "UPDATE books SET quantity = COALESCE(?, quantity), price = COALESCE(?, price) WHERE id = ?",
    [quantity, price, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      if (this.changes === 0) {
        return res.status(404).json({ error: "Book not found" });
      }

      console.log(`Replica synchronized item ${id}`);
      res.json({ message: "Replica synchronized successfully" });
    }
  );
});

app.listen(5001, () => console.log('Catalog service running on port 5001'));