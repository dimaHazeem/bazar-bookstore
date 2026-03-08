const express = require('express');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const db = new sqlite3.Database('./catalog.db', (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log("Connected to catalog database.");
  }
});
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
(1,'Advanced DOS Systems','distributed systems',60,0),
(2,'Advanced DOS Systems','distributed systems',40,1),
(3,'Xen and the Art of Surviving Undergraduate School','undergraduate school',30,2),
(4,'Cooking for the Impatient Undergrad','undergraduate school',20,5)
`);

app.use(express.json());

// GET /search/:topic
app.get('/search/:topic', (req, res) => {
  const topic = req.params.topic;
  db.all(
    "SELECT * FROM books WHERE topic=?",
    [topic],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

// GET /info/:id
app.get('/info/:id', (req, res) => {

  const id = parseInt(req.params.id);

  db.get(
    "SELECT * FROM books WHERE id=?",
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ message: "Book not found" });
      }
      res.json(row);
    }
  );

});

// PUT /update/:id
app.put('/update/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const quantity = req.body.quantity;
  db.run(
    "UPDATE books SET quantity=? WHERE id=?",
    [quantity, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({
        message: "Book updated successfully"
      });
    }
  );
});

app.post('/purchase/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const response = await axios.post(`http://localhost:5002/purchase/${id}`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(5001, () => console.log('Catalog service running on port 5001'));