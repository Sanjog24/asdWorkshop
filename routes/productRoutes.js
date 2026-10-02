const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { cacheMiddleware, invalidateCacheMiddleware } = require('../middleware/cacheMiddleware');

// Architecture: Route -> Middleware -> Controller -> Service -> Database

// Read routes with caching
router.get('/', cacheMiddleware(), productController.getAllProducts);
router.get('/:id', cacheMiddleware(), productController.getProductById);

// Write routes with cache invalidation
router.post('/', invalidateCacheMiddleware, productController.createProduct);
router.put('/:id', invalidateCacheMiddleware, productController.updateProduct);
router.patch('/:id', invalidateCacheMiddleware, productController.patchProduct);
router.delete('/:id', invalidateCacheMiddleware, productController.deleteProduct);

module.exports = router;
