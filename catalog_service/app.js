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

  if (!book) {
    return res.status(404).json({ message: "Book not found" });
  }

  res.json(book);
});

// PUT /update/:id
app.put('/update/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const catalog = JSON.parse(fs.readFileSync(catalogFile));
  const book = catalog.find(b => b.id === id);

  if (!book) return res.status(404).json({ message: 'Book not found' });

  // Only update the fields sent in the request
  const allowedFields = ['title', 'topic', 'price', 'quantity'];
  let updated = false;

  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      //Validate fields
      if (field === 'quantity' && (!Number.isInteger(req.body[field]) || req.body[field] < 0)) {
        return res.status(400).json({ message: 'Quantity must be a positive integer' });
      }
      if (field === 'price' && req.body[field] < 0) {
        return res.status(400).json({ message: 'Price must be positive' });
      }
      book[field] = req.body[field];
      updated = true;
    }
  });

  if (!updated) {
    return res.status(400).json({ message: 'No valid fields to update' });
  }

  fs.writeFileSync(catalogFile, JSON.stringify(catalog, null, 2));
  res.json({ message: 'Book updated successfully', book });
});

/*// Frontend Service
app.put('/update/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const response = await axios.put(`http://localhost:5001/update/${id}`, req.body, {
      headers: { 'Content-Type': 'application/json' }
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ message: 'Failed to update book' });
    }
  }
});*/

app.listen(5001, () => console.log('Catalog service running on port 5001'));