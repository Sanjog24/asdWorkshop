const fs = require('fs/promises');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db.json');

// Low-level database read helper
async function readDb() {
  try {
    const raw = await fs.readFile(dbPath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

// Low-level database write helper
async function writeDb(records) {
  await fs.writeFile(dbPath, JSON.stringify(records, null, 2), 'utf-8');
}

// Simulated latency helper with DB_DELAY_MS env toggle
async function simulateLatency() {
  const latency = process.env.DB_DELAY_MS !== undefined ? Number(process.env.DB_DELAY_MS) : 1500;
  if (latency > 0) {
    await new Promise((resolve) => setTimeout(resolve, latency));
  }
  return await readDb();
}

const productDb = {
  async getAll() {
    return await simulateLatency();
  },

  async getById(id) {
    const products = await simulateLatency();
    return products.find((item) => item.id === id) || null;
  },

  async create(data) {
    const products = await readDb();
    const highestId = products.reduce((max, item) => (item.id > max ? item.id : max), 0);
    const newRecord = {
      id: highestId + 1,
      ...data
    };
    products.push(newRecord);
    await writeDb(products);
    return newRecord;
  },

  async update(id, data) {
    const products = await readDb();
    const index = products.findIndex((item) => item.id === id);
    if (index === -1) {
      return null;
    }
    products[index] = { id, ...data };
    await writeDb(products);
    return products[index];
  },

  async patch(id, partialData) {
    const products = await readDb();
    const index = products.findIndex((item) => item.id === id);
    if (index === -1) {
      return null;
    }
    products[index] = { ...products[index], ...partialData, id };
    await writeDb(products);
    return products[index];
  },

  async delete(id) {
    const products = await readDb();
    const index = products.findIndex((item) => item.id === id);
    if (index === -1) {
      return null;
    }
    const [deletedItem] = products.splice(index, 1);
    await writeDb(products);
    return deletedItem;
  }
};

module.exports = productDb;
