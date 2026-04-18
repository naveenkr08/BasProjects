const cds = require('@sap/cds');
const { SELECT, UPDATE, DELETE, INSERT } = require('@sap/cds/lib/ql/cds-ql');

module.exports = cds.service.impl(async function () {

   const { Vehicles, States, Dealers, Customers, Orders } = this.entities;
    const MAP_API = await cds.connect.to('MAP_API');
    function getCurrentTimestamp() {
        console.log( new Date().toLocaleString("en-IN",{
            timeZone: "Asia/kolkata"
        }));
    return new Date().toLocaleString("en-IN",{
            timeZone: "Asia/kolkata"
        });
}

    this.on('generateVehicleID', async (req) => {
        const { stateId } = req.data;

        if (!stateId) return req.error(400, "stateId is required");

        const state = await SELECT.one.from(States).where({ stateId });
        if (!state) return req.error(404, "State does not exist");

        const random = Math.floor(1000 + Math.random() * 9000);
        return `${state.stateCode}${random}`;
    });

    this.on('CREATE', Vehicles, async (req) => {
        const { state_stateId, dealer_dealerID, modelName, oldPrice, newPrice, statuss } = req.data;

        if (!state_stateId) return req.error(400, "State is required");

        const vehicleID = await this.send('generateVehicleID', { stateId: state_stateId });

        const user = req.user.id;
        const now = getCurrentTimestamp();
        console.log(now);
        
        const newVehicle = {
            vehicleID: vehicleID,
            modelName: modelName ?? null,
            oldPrice: oldPrice ?? null,
            newPrice: newPrice ?? null,
            statuss: statuss ?? "Pending",
            state_stateId: state_stateId,
            dealer_dealerID: dealer_dealerID ?? null,
            createdAt: now,
            createdBy: user,
            readAt: null,
            readBy: null,
            modifiedAt: null,
            modifiedBy: null
        };

        await INSERT.into(Vehicles).entries(newVehicle);
        return newVehicle;
    });


    // this.on('READ', Vehicles, async (req) => {
    //     const data = await SELECT.from(Vehicles).columns('vehicle_ID');
    //     if (!data.length) return req.error(404, "No data found");

    //     const user = req.user.id;
    //     const now = getCurrentTimestamp();

    //     for (let v of data) {
    //         await UPDATE(Vehicles).set({
    //             readAt: now,
    //             readBy: user
    //         }).where({ vehicleID: v.vehicleID });
    //     }

    //     return await SELECT.from(Vehicles);
    // });
   this.on('getVehiclesID', async (req) => {
    const data = await SELECT.from(Vehicles).columns('vehicleID');
    return data;
});

    this.on('updateprice', async (req) => {
        const { vehicleID, newValue } = req.data;

        const data = await SELECT.one.from(Vehicles).where({ vehicleID });
        if (!data) return req.error(404, "Vehicle not found");

        const user = req.user.id;
        const now = getCurrentTimestamp();

        await UPDATE(Vehicles).set({
            oldPrice: data.newPrice,
            newPrice: newValue,
            modifiedAt: now,
            modifiedBy: user
        }).where({ vehicleID });

        return "Price updated";
    });


    this.on('updateStatus', async (req) => {
        const { vehicleID } = req.data;

        const data = await SELECT.one.from(Vehicles).where({ vehicleID });
        if (!data) return req.error(404, "Vehicle not found");

        if (data.statuss === "Approve") return "Already approved";

        const user = req.user.id;
        const now = getCurrentTimestamp();

        await UPDATE(Vehicles).set({
            statuss: "Approve",
            modifiedAt: now,
            modifiedBy: user
        }).where({ vehicleID });

        return "Status updated";
    });

    this.on('DELETE', Vehicles, async (req) => {
        const { vehicleID } = req.data;

        const data = await SELECT.one.from(Vehicles).where({ vehicleID });
        if (!data) return req.error(404, "Vehicle not found");

        await DELETE.from(Vehicles).where({ vehicleID });

        return "Vehicle deleted";
    });

    this.before('CREATE', States, (req) => {

        if (!req.data.stateName) 
            req.error(400, "State name required");
        if (!req.data.country) 
            req.error(400, "Country required");
    });

    this.on('CREATE', States, async (req) => {
        const user = req.user.id;
        const now = getCurrentTimestamp();

        return INSERT.into(States).entries({
            stateId: req.data.stateId,
            stateName: req.data.stateName,
            country: req.data.country,
            stateCode: req.data.stateCode,
            createdAt: now,
            createdBy: user
        });
    });

    // this.on('READ', States, async (req) => {
    //     const data = await SELECT.from(States);
    //     if (!data.length) return req.error(400, "No states");

    //     const user = req.user.id;
    //     const now = getCurrentTimestamp();

    //     for (let s of data) {
    //         await UPDATE(States).set({
    //             readAt: now,
    //             readBy: user
    //         }).where({ stateId: s.stateId });
    //     }

    //     return await SELECT.from(States);
    // });

    this.on('updateStates', async (req) => {
        const { stateId, addstate } = req.data;

        const user = req.user.id;
        const now = getCurrentTimestamp();

        await UPDATE(States).set({
            stateName: addstate,
            modifiedAt: now,
            modifiedBy: user
        }).where({ stateId });

        return "State updated";
    });

    this.before('CREATE', Dealers, (req) => {
        if (!req.data.dealerName) req.error(400, "Dealer name required");
        if (!req.data.location) req.error(400, "Location required");
    });

    this.on('CREATE', Dealers, async (req) => {
        const user = req.user.id;
        const now = getCurrentTimestamp();

        return INSERT.into(Dealers).entries({
            dealerID: req.data.dealerID,
            dealerName: req.data.dealerName,
            location: req.data.location,
            createdAt: now,
            createdBy: user
        });
    });

    this.on('updateDealers', async (req) => {
        const { dealerID, newDealerName } = req.data;

        const user = req.user.id;
        const now = getCurrentTimestamp();

        await UPDATE(Dealers).set({
            dealerName: newDealerName,
            modifiedAt: now,
            modifiedBy: user
        }).where({ dealerID });

        return "Dealer updated";
    });

    this.on('DELETE', Dealers, async (req) => {
        return DELETE.from(Dealers).where({ dealerID: req.data.dealerID });
    });

    this.before('CREATE', Customers, (req) => {
        if (!req.data.name) req.error(400, "Name required");
        if (!req.data.email || !req.data.email.includes("@")) req.error(400, "Valid email required");
    });

    this.on('CREATE', Customers, async (req) => {
        const user = req.user.id;
        const now = getCurrentTimestamp();

        return INSERT.into(Customers).entries({
            customerID: req.data.customerID,
            name: req.data.name,
            email: req.data.email,
            createdAt: now,
            createdBy: user
        });
    });

    this.on('READ', Customers, async (req) => {
        const data = await SELECT.from(Customers);
        if (!data.length) return req.error(404, "No customers");

        const user = req.user.id;
        const now = getCurrentTimestamp();

        for (let c of data) {
            await UPDATE(Customers).set({
                readAt: now,
                readBy: user
            }).where({ customerID: c.customerID });
        }

        return await SELECT.from(Customers);
    });

    this.on('UPDATE', Customers, async (req) => {
        const user = req.user.id;
        const now = getCurrentTimestamp();

        return UPDATE(Customers).set({
            name: req.data.name,
            email: req.data.email,
            modifiedAt: now,
            modifiedBy: user
        }).where({ customerID: req.data.customerID });
    });

    this.on('DELETE', Customers, async (req) => {
        return DELETE.from(Customers).where({ customerID: req.data.customerID });
    });


    this.before('CREATE', Orders, (req) => {
        if (!req.data.vehicle) req.error(400, "Vehicle required");
        if (!req.data.customer) req.error(400, "Customer required");
        if (req.data.quantity <= 0) req.error(400, "Quantity must be > 0");
    });

    this.on('CREATE', Orders, async (req) => {
        const user = req.user.id;
        const now = getCurrentTimestamp();

        return INSERT.into(Orders).entries({
            orderID: req.data.orderID,
            quantity: req.data.quantity,
            vehicle: req.data.vehicle,
            customer: req.data.customer,
            createdAt: now,
            createdBy: user
        });
    });

    this.on('addLocation', async (req) => {
        const { dealerID } = req.data;
        if (!dealerID) return req.error(400, "dealerID is required");

        try {
            const dealer = await SELECT.one.from(Dealers).where({ dealerID });

            if (!dealer) return req.error(404, "Dealer not found");

            const city = dealer.location;

            if (!city) return req.error(400, "Dealer location not defined");

            const response = await MAP_API.get(`/odata/v4/map/getlatitudeAndLongitude(cityname='${city}')`);

            return { latitude: response.latitude ?? response.lat, longitude: response.longitude ?? response.lon };

        } catch (err) {
            return req.error(500, `Failed to fetch coordinates: ${err.message}`);
        }
    });

    this.on('getlocationdetails', async (req) => {
        const { dealerID } = req.data;
        if (!dealerID) return req.error(400, "dealerID is required");

        try {
            const dealer = await SELECT.one.from(Dealers).where({ dealerID });

            if (!dealer) return req.error(404, "Dealer not found");

            const city = dealer.location;

            if (!city) return req.error(400, "Dealer location not defined");

            const response = await
             MAP_API.get(`/odata/v4/map/getLocationInDetail(address='${city}')`);

            return { latitude: response.latitude, longitude: response.longitude, address: response.address, location: response.location, district: response.district, state: response.state, pincode: response.pincode, country: response.country };
        } catch (err) {
            return req.error(500, `Failed to fetch location details: ${err.message}`);
        }
    });

    this.on('getAllDistricts', async (req) => {
        const { stateId } = req.data;
        if (!stateId) return req.error(400, "stateId is required");
        try {
            const state = await SELECT.one.from(States).where({ stateId });
            if (!state) return req.error(404, "State not found");
            const response = await MAP_API.get(`/odata/v4/map/getDistricts(state='${state.stateName}')`);
            return (response?.value || response).map(d => ({ name: d.name }));
        } catch (err) {
            return req.error(500, `Failed to fetch districts: ${err.message}`);
        }
    });

    this.on('getCitiesByDistrict', async (req) => {
        const { district } = req.data;
        if (!district) return req.error(400, "District name is required");
        try {
            const response = await MAP_API.get(`/odata/v4/map/getCitiesByDistrict(district='${district}')`);
            return (response?.value || response).map(c => ({ name: c.name, pincode: c.pincode }));
        } catch (err) {
            return req.error(500, `Failed to fetch cities: ${err.message}`);
        }
    });

    this.on('getVillagesByDistrict', async (req) => {
        const { district } = req.data;
        if (!district) return req.error(400, "District name is required");
        try {
            const response = await MAP_API.get(`/odata/v4/map/getVillagesByDistrict(district='${district}')`);
            return (response?.value || response).map(v => ({ name: v.name, pincode: v.pincode, block: v.block }));
        } catch (err) {
            return req.error(500, `Failed to fetch villages: ${err.message}`);
        }
    });

    
    
});