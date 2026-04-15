const express = require('express');
const sqlite3 = require('sqlite3').verbose();
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
(4,'Cooking for the Impatient Undergrad','undergraduate school',20,5)
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
app.put('/update/:id', (req, res) => {
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
      res.json({ message: "Book updated successfully" });
    }
  );
});

app.listen(5001, () => console.log('Catalog service running on port 5001'));