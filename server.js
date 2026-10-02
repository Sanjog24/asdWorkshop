const express = require('express');
const path = require('path');
const fs = require('fs/promises');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

// Async helper to read products from db.json
async function readProductsFromFile() {
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading db.json:', err);
    throw err;
  }
}

// Simulates database delay (1.5 seconds)
async function fetchProductsWithDelay() {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return await readProductsFromFile();
}

// GET all products asynchronously
app.get('/products', async (req, res) => {
  try {
    const products = await fetchProductsWithDelay();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET product by ID asynchronously
app.get('/products/:id', async (req, res) => {
  try {
    const products = await fetchProductsWithDelay();
    const id = Number(req.params.id);

    const product = products.find((item) => item.id === id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
