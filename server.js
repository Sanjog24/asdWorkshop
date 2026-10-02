const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(express.json());

// Helper to load product records from db.json
function loadProducts() {
  const fileData = fs.readFileSync(DB_FILE, 'utf-8');
  return JSON.parse(fileData);
}

// Helper to save product records to db.json
function saveProducts(products) {
  fs.writeFileSync(DB_FILE, JSON.stringify(products, null, 2), 'utf-8');
}

// GET /products - List all products
app.get('/products', (req, res) => {
  const products = loadProducts();
  res.json(products);
});

// GET /products/:id - Retrieve product by ID
app.get('/products/:id', (req, res) => {
  const products = loadProducts();
  const targetId = Number(req.params.id);
  const foundProduct = products.find((item) => item.id === targetId);

  if (!foundProduct) {
    return res.status(404).json({ message: 'Product not found' });
  }

  res.json(foundProduct);
});

// POST /products - Create a new product
app.post('/products', (req, res) => {
  const products = loadProducts();
  const { name, price } = req.body;

  const newProduct = {
    id: products.length + 1,
    name,
    price: Number(price)
  };

  products.push(newProduct);
  saveProducts(products);

  res.status(201).json(newProduct);
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
