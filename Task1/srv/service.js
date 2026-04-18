const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {

  const { Vechile } = this.entities;

  this.on('approveVechile', async (req) => {

    const { vechile_ID } = req.data;

    const data = await SELECT.one
      .from(Vechile)
      .where({ vechile_ID });
     
      

    if (!data) {
      return req.error(404, "Vehicle not found");
    }

    if (data.status !== "Approved") {

         await UPDATE(Vechile)
        .set({ status: "Approved" })
        .where({ vechile_ID });

      
      await this.emit('notifyDealer', { vechile_ID });
    }
       

    return `Status approved for ${data.modelName}`;
  });

  
  this.on('notifyDealer', async (req) => {

    const { vechile_ID } = req.data;

    const data = await SELECT.one
      .from(Vechile)
      .where({ vechile_ID });

    if (!data) {
      return req.error(404, "Vehicle not found");
    }

    console.log(`${data.dealerName} notified for ${data.modelName}`);

    return `Dealer notified for ${data.modelName}`;
  });

});