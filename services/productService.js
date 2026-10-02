const productDb = require('../database/productDb');

const productService = {
  async getAllProducts() {
    return await productDb.getAll();
  },

  async getProductById(id) {
    const numericId = Number(id);
    if (isNaN(numericId)) {
      return null;
    }
    return await productDb.getById(numericId);
  },

  async createProduct(data) {
    if (!data || !data.name) {
      const err = new Error('Product name is required');
      err.status = 400;
      throw err;
    }
    return await productDb.create(data);
  },

  async updateProduct(id, data) {
    const numericId = Number(id);
    if (isNaN(numericId)) {
      return null;
    }
    if (!data || !data.name) {
      const err = new Error('Product name is required');
      err.status = 400;
      throw err;
    }
    return await productDb.update(numericId, data);
  },

  async patchProduct(id, partialData) {
    const numericId = Number(id);
    if (isNaN(numericId)) {
      return null;
    }
    return await productDb.patch(numericId, partialData);
  },

  async deleteProduct(id) {
    const numericId = Number(id);
    if (isNaN(numericId)) {
      return null;
    }
    return await productDb.delete(numericId);
  }
};

module.exports = productService;
