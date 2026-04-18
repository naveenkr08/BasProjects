const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {

  const { Vehicles, Orders } = this.entities;

 
  this.before('CREATE', Vehicles, async (req) => {

    const { state, baseprice } = req.data;
    const stateTaxMap = {
      TN: 0.10,
      KA: 0.15,
      MH: 0.12,
      KL: 0.08
    };
    if (!stateTaxMap[state]) {
      req.error(400, 'Invalid State. Allowed: TN, KA, MH, KL');
    }
    if (!baseprice || baseprice <= 0) {
      req.error(400, 'Base Price must be greater than zero');
    }
    const random = Math.floor(Math.random() * 10000);
    req.data.vehicle_ID = `${state}-${random}`;

   
    const taxRate = stateTaxMap[state]; 
   
   
    req.data.price = baseprice + (baseprice * taxRate);

  });
 
  this.on('approveVehicle', async (req) => {

    const { vehicle_ID } = req.data;

    const vehicle = await SELECT.one
      .from(Vehicles)
      .where({ vehicle_ID });

    if (!vehicle) {
      return req.error(404, 'Vehicle not found');
    }

    if (vehicle.status !== 'Approved') {
      await UPDATE(Vehicles)
        .set({ status: 'Approved' })
        .where({ vehicle_ID });
    }

    return `Vehicle ${vehicle_ID} Approved Successfully`;
  });

  this.on('getTotalOrderValue', async (req) => {

    const { vehicle_ID } = req.data;

    const vehicle = await SELECT.one 
      .from(Vehicles)
      .where({ vehicle_ID });

    if (!vehicle) {
      return req.error(404, "Vehicle not found");
    }
    const orders = await SELECT
      .from(Orders)
      .where({ vehicle_vehicle_ID: vehicle_ID });

    let total = 0;

    for (const order of orders) {
      total += order.quantity * vehicle.price;
    }
    const taxMap = {
      TN: 0.10,
      KA: 0.15,
      MH: 0.12,
      KL: 0.08
    };

    const taxRate = taxMap[vehicle.state] || 0;

    return {
      totalValue: total,
      taxRate: taxRate
    };

  });
});