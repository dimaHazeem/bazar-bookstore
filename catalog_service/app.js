const express = require('express');
const fs = require('fs');
const app = express();
app.use(express.json());

const catalogFile = __dirname + '/catalog.json';

// GET /search/:topic
app.get('/search/:topic', (req, res) => {
  const catalog = JSON.parse(fs.readFileSync(catalogFile));
  const searchTopic = req.params.topic.replace(/-/g, ' ').toLowerCase();
  const result = catalog.filter(book => book.topic.toLowerCase() === searchTopic);
  res.json(result);
});

// GET /info/:id
app.get('/info/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const catalog = JSON.parse(fs.readFileSync(catalogFile));
  const book = catalog.find(b => b.id === id);
  if (!book) return res.status(404).json({message:"Book not found"});
});

// PUT /update/:id
app.put('/update/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const catalog = JSON.parse(fs.readFileSync(catalogFile));
  const book = catalog.find(b => b.id === id);
  if (book) {
    book.quantity = req.body.quantity;
    fs.writeFileSync(catalogFile, JSON.stringify(catalog, null, 2));
    res.json({ message: 'Quantity updated' });
  } else {
    res.status(404).json({ message: 'Book not found' });
  }
});

app.listen(5001, () => console.log('Catalog service running on port 5001'));