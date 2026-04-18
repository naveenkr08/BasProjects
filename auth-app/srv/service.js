const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {

  const { Products } = this.entities;

  this.on('READ', Products, async (req) => {
    console.log("User:", req.user.id); 
    const products = await SELECT.from(Products);
    if (!products || products.length === 0) {
      return req.error(404, "No products found");
    }
    return products;
  });

  this.before('CREATE', Products, async (req) => {
    if (!req.data.productName) return req.error(400, "Product name is required");
    if (!req.data.price) return req.error(400, "Price is required");
  });

  this.on('CREATE', Products, async (req) => {
    return await INSERT.into(Products).entries({
      productID: req.data.productID,
      productName: req.data.productName,
      price: req.data.price,
      category: req.data.category
    });
  });

  this.on('UPDATE', Products, async (req) => {
    const { productID } = req.data;
    const exists = await SELECT.one.from(Products).where({ productID });
    if (!exists) return req.error(404, "Product not found");
    return await UPDATE(Products).set({
      productName: req.data.productName,
      price: req.data.price,
      category: req.data.category
    }).where({ productID });
  });

  this.on('DELETE', Products, async (req) => {
    const { productID } = req.data;
    const exists = await SELECT.one.from(Products).where({ productID });
    if (!exists) return req.error(404, "Product not found");
    return await DELETE.from(Products).where({ productID });
  });

});