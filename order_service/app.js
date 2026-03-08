const express = require('express');
const fs = require('fs');
const axios = require('axios');

const app = express();
app.use(express.json());

const ordersFile = __dirname + '/orders.json';

app.post('/purchase/:id', async (req, res) => {

  const id = parseInt(req.params.id);

  try {

    const catalogResp = await axios.get(`http://localhost:5001/info/${id}`);
    const book = catalogResp.data;

    if (book.quantity <= 0) {
      return res.json({ message: "Out of stock" });
    }

    await axios.put(
      `http://localhost:5001/update/${id}`,
      { quantity: book.quantity - 1 }
    );

    let orders = [];

    if (fs.existsSync(ordersFile)) {
      orders = JSON.parse(fs.readFileSync(ordersFile));
    }

    const newOrder = {
      order_id: orders.length + 1,
      item_id: id,
      time: new Date().toISOString()
    };

    orders.push(newOrder);

    fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));

    res.json({
      message: `Bought book: ${book.title}`
    });

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