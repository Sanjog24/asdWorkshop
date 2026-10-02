const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(express.json());

// Read product records from db.json
function loadProducts() {
  const fileData = fs.readFileSync(DB_FILE, 'utf-8');
  return JSON.parse(fileData);
}

// GET all products
// http://localhost:3000/products
app.get('/products', (req, res) => {
  const products = loadProducts();
  res.json(products);
});

// GET product by ID
// http://localhost:3000/products/1
// http://localhost:3000/products/2
// http://localhost:3000/products/3
app.get('/products/:id', (req, res) => {
  const products = loadProducts();
  const targetId = Number(req.params.id);

  const product = products.find((p) => p.id === targetId);

  if (!product) {
    return res.status(404).json({
      message: 'Product not found'
    });
  }

  res.json(product);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
