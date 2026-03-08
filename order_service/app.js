const express = require('express');
const fs = require('fs');
const axios = require('axios');
const app = express();
app.use(express.json());

const ordersFile = __dirname + '/orders.json';

// POST /purchase/:id
app.post('/purchase/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const catalogResp = await axios.get(`http://localhost:5001/info/${id}`);
    const book = catalogResp.data;

    if (book.quantity > 0) {
      await axios.put(`http://localhost:5001/update/${id}`, { quantity: book.quantity - 1 });
      const orders = JSON.parse(fs.readFileSync(ordersFile));
      const newOrder = { order_id: orders.length + 1, item_id: id, time: new Date().toISOString() };
      orders.push(newOrder);
      fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));

      res.json({ message: `Bought book: ${book.title}` });
    } else {
      res.json({ message: 'Out of stock' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(5002, () => console.log('Order service running on port 5002'));