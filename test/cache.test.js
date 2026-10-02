const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('fs/promises');
const path = require('path');

// Disable artificial delay during test suite execution
process.env.DB_DELAY_MS = '0';

const app = require('../server');
const { getCache, clearCache, DEFAULT_TTL_MS } = require('../middleware/cacheMiddleware');

const dbPath = path.join(__dirname, '..', 'db.json');
let initialDbBackup = '';

test.before(async () => {
  initialDbBackup = await fs.readFile(dbPath, 'utf-8');
});

test.after(async () => {
  if (initialDbBackup) {
    await fs.writeFile(dbPath, initialDbBackup, 'utf-8');
  }
});

test.beforeEach(async () => {
  await fs.writeFile(dbPath, initialDbBackup, 'utf-8');
  clearCache();
});

function launchServer() {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      resolve({
        server,
        baseUrl: `http://localhost:${port}`
      });
    });
  });
}

test('Cache MISS on first GET /products and HIT on second GET /products', async () => {
  const { server, baseUrl } = await launchServer();
  try {
    // 1st request -> Cache MISS
    const res1 = await fetch(`${baseUrl}/products`);
    assert.equal(res1.status, 200);
    assert.equal(res1.headers.get('x-cache'), 'MISS');
    const data1 = await res1.json();
    assert.equal(data1.length, 4);

    // Verify cache map has entry with timestamp
    const cacheMap = getCache();
    const entry = cacheMap.get('/products');
    assert.ok(entry, 'Cache entry should exist for /products');
    assert.ok(typeof entry.createdAt === 'number', 'Cache entry must have a createdAt timestamp');
    assert.ok(Date.now() - entry.createdAt < 1000);

    // 2nd request -> Cache HIT
    const res2 = await fetch(`${baseUrl}/products`);
    assert.equal(res2.status, 200);
    assert.equal(res2.headers.get('x-cache'), 'HIT');
    const data2 = await res2.json();
    assert.deepEqual(data2, data1);
  } finally {
    server.close();
  }
});

test('Cache MISS on first GET /products/:id and HIT on second GET /products/:id', async () => {
  const { server, baseUrl } = await launchServer();
  try {
    // 1st request -> Cache MISS
    const res1 = await fetch(`${baseUrl}/products/1`);
    assert.equal(res1.status, 200);
    assert.equal(res1.headers.get('x-cache'), 'MISS');
    const data1 = await res1.json();
    assert.equal(data1.id, 1);
    assert.equal(data1.name, 'Keyboard');

    // 2nd request -> Cache HIT
    const res2 = await fetch(`${baseUrl}/products/1`);
    assert.equal(res2.status, 200);
    assert.equal(res2.headers.get('x-cache'), 'HIT');
    const data2 = await res2.json();
    assert.deepEqual(data2, data1);
  } finally {
    server.close();
  }
});

test('Cache invalidation on POST /products', async () => {
  const { server, baseUrl } = await launchServer();
  try {
    // Prime the cache
    const res1 = await fetch(`${baseUrl}/products`);
    assert.equal(res1.headers.get('x-cache'), 'MISS');
    const res2 = await fetch(`${baseUrl}/products`);
    assert.equal(res2.headers.get('x-cache'), 'HIT');

    // Create a new product
    const postRes = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Webcam', price: 79.99 })
    });
    assert.equal(postRes.status, 201);
    const created = await postRes.json();
    assert.equal(created.name, 'Webcam');

    // Wait for response finish event
    await new Promise((r) => setTimeout(r, 50));

    // Next GET /products must be a fresh MISS containing the new product
    const res3 = await fetch(`${baseUrl}/products`);
    assert.equal(res3.headers.get('x-cache'), 'MISS');
    const data3 = await res3.json();
    assert.equal(data3.length, 5);
    assert.ok(data3.some((p) => p.name === 'Webcam'));
  } finally {
    server.close();
  }
});

test('Cache invalidation on PUT /products/:id', async () => {
  const { server, baseUrl } = await launchServer();
  try {
    // Prime cache
    const res1 = await fetch(`${baseUrl}/products/1`);
    assert.equal(res1.headers.get('x-cache'), 'MISS');
    const res2 = await fetch(`${baseUrl}/products/1`);
    assert.equal(res2.headers.get('x-cache'), 'HIT');

    // Update product
    const putRes = await fetch(`${baseUrl}/products/1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Mechanical Keyboard RGB', price: 99.99 })
    });
    assert.equal(putRes.status, 200);

    await new Promise((r) => setTimeout(r, 50));

    // GET /products/1 must be a MISS with updated data
    const res3 = await fetch(`${baseUrl}/products/1`);
    assert.equal(res3.headers.get('x-cache'), 'MISS');
    const data3 = await res3.json();
    assert.equal(data3.name, 'Mechanical Keyboard RGB');
  } finally {
    server.close();
  }
});

test('Cache invalidation on PATCH /products/:id', async () => {
  const { server, baseUrl } = await launchServer();
  try {
    // Prime cache
    await fetch(`${baseUrl}/products/2`);
    const hitRes = await fetch(`${baseUrl}/products/2`);
    assert.equal(hitRes.headers.get('x-cache'), 'HIT');

    // Patch product
    const patchRes = await fetch(`${baseUrl}/products/2`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: 24.99 })
    });
    assert.equal(patchRes.status, 200);

    await new Promise((r) => setTimeout(r, 50));

    // GET /products/2 must be a MISS with updated price
    const resAfter = await fetch(`${baseUrl}/products/2`);
    assert.equal(resAfter.headers.get('x-cache'), 'MISS');
    const dataAfter = await resAfter.json();
    assert.equal(dataAfter.price, 24.99);
  } finally {
    server.close();
  }
});

test('Cache invalidation on DELETE /products/:id', async () => {
  const { server, baseUrl } = await launchServer();
  try {
    // Prime cache
    await fetch(`${baseUrl}/products`);
    await fetch(`${baseUrl}/products/4`);

    // Delete product 4
    const delRes = await fetch(`${baseUrl}/products/4`, {
      method: 'DELETE'
    });
    assert.equal(delRes.status, 200);

    await new Promise((r) => setTimeout(r, 50));

    // Deleted product lookup must be 404
    const resAfter = await fetch(`${baseUrl}/products/4`);
    assert.equal(resAfter.status, 404);

    // List of products must reflect removal
    const allRes = await fetch(`${baseUrl}/products`);
    assert.equal(allRes.headers.get('x-cache'), 'MISS');
    const allData = await allRes.json();
    assert.equal(allData.length, 3);
  } finally {
    server.close();
  }
});

test('TTL expiration: cached entry older than 1 minute (60s) is evicted and refetched', async () => {
  const { server, baseUrl } = await launchServer();
  try {
    // Initial fetch to cache
    const res1 = await fetch(`${baseUrl}/products/1`);
    assert.equal(res1.headers.get('x-cache'), 'MISS');

    // Verify cache entry
    const cacheMap = getCache();
    const entry = cacheMap.get('/products/1');
    assert.ok(entry);

    // Simulate TTL expiration (> 60s)
    entry.createdAt = Date.now() - (DEFAULT_TTL_MS + 5000);

    // Expired entry should cause MISS and refresh cache
    const resExpired = await fetch(`${baseUrl}/products/1`);
    assert.equal(resExpired.headers.get('x-cache'), 'MISS');

    // Fresh entry verified
    const freshEntry = cacheMap.get('/products/1');
    assert.ok(freshEntry);
    assert.ok(Date.now() - freshEntry.createdAt < 1000, 'Fresh entry timestamp should be current');

    // Subsequent request should HIT
    const resHit = await fetch(`${baseUrl}/products/1`);
    assert.equal(resHit.headers.get('x-cache'), 'HIT');
  } finally {
    server.close();
  }
});
