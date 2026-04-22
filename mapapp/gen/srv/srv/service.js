const cds = require('@sap/cds');
const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');
require('dotenv').config();
const axios = require('axios'); 

module.exports = cds.service.impl(async function () {

  const DESTINATION = 'LocationIQ_API';
  const API_KEY = process.env.API_KEY || 'pk.1daf6c54201af8e8df066cd3893406d4'
  console.log("API_KEY:", API_KEY);

  if (!API_KEY) {
    console.error("API_KEY is missing in Cloud Foundry environment");
  }

 
  this.on('getlatitudeAndLongitude', async (req) => {

    const cityname = req.data.cityname;

    if (!cityname) {
      return req.error(400, "City is not available");
    }

    try {
      const response = await executeHttpRequest(
        { destinationName: DESTINATION },
        {
          method: 'GET',
          url: '/v1/search',
          params: {
            key: API_KEY,
            q: cityname,
            format: 'json'
          }
        }
      );

      if (!response?.data || response.data.length === 0) {
        return req.error(404, "Latitude and Longitude not found");
      }

      return {
        latitude: parseFloat(response.data[0].lat),
        longitude: parseFloat(response.data[0].lon)
      };

    } catch (error) {
      console.error("ERROR:", error.message);
      return req.error(500, "External API Error");
    }
  });

  this.on('getLocationInDetail', async (req) => {

    const address = req.data.address;

    if (!address) {
      return req.error(400, "Address is required");
    }
    

    try {
      const geoResponse = await executeHttpRequest(
        { destinationName: DESTINATION },
        {
          method: 'GET',
          url: '/v1/search',
          params: {
            key: API_KEY,
            q: address,
            format: 'json'
          }
        }
      );

      if (!geoResponse?.data || geoResponse.data.length === 0) {
        return req.error(404, "Location not found");
      }

      const latitude = parseFloat(geoResponse.data[0].lat);
      const longitude = parseFloat(geoResponse.data[0].lon);

      const reverseResponse = await executeHttpRequest(
        { destinationName: DESTINATION },
        {
          method: 'GET',
          url: '/v1/reverse',
          params: {
            key: API_KEY,
            lat: latitude,
            lon: longitude,
            format: 'json'
          }
        }
      );

      const data = reverseResponse.data;
      const addr = data.address || {};

      return {
        latitude,
        longitude,
        address: data.display_name || "",
        location: addr.road || addr.neighbourhood || "",
        district: addr.suburb || addr.county || "",
        city: addr.city || addr.town || addr.village || "",
        state: addr.state || "",
        pincode: addr.postcode || "",
        country: addr.country || ""
      };

    } catch (error) {
      console.error("ERROR:", error.message);
      return req.error(500, "External API Error");
    }
  });

  this.on('getAddressFromCoordinates', async (req) => {

    const { latitude, longitude } = req.data;

    if (!latitude || !longitude) {
      return req.error(400, "Latitude and Longitude are required");
    }

    try {

      const response = await executeHttpRequest(
        { destinationName: DESTINATION },
        {
          method: 'GET',
          url: '/v1/reverse',
          params: {
            key: API_KEY,
            lat: latitude,
            lon: longitude,
            format: 'json'
          }
        }
      );

      const data = response.data;
      // console.log(data);
      
      const addr = data.address || {};

      return {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address: data.display_name || "",
        location: addr.road || "",
        district: addr.suburb || "",
        city: addr.city || addr.town || addr.village || "",
        state: addr.state || "",
        pincode: addr.postcode || "",
        country: addr.country || ""
      };

    } catch (error) {
      console.error("ERROR:", error.message);
      return req.error(500, "Reverse API Error");
    }
  });

  this.on('getDistricts', async(req)=>{
     const stateName = req.data.state;
         
     if (!stateName) {
       return [{ name: "Please provide state name" }];
     }
            try {
         
              const response = await axios.post(
                "https://countriesnow.space/api/v0.1/countries/state/cities",
                {
                  country: "India",
                  state: stateName
                }
              );
         
              const districts = response.data.data.map(name => ({
                name: name
              }));
         
              return districts;
         
            } catch (error) {
              console.error("API ERROR:", error.message);
              return [{ name: "Error fetching data" }];
            }
         
          })
  
  this.on('getCitiesByDistrict', async (req) => {
  const district = req.data.district;
  if (!district) return req.error(400, "District name is required");

  try {
    const response = await axios.get(
      `https://api.postalpincode.in/postoffice/${district}`
    );

    if (!response.data || response.data[0].Status === "Error") {
      return req.error(404, `No cities found for district "${district}"`);
    }
   console.log(response);
  //  console.log(response.data[0].PostOffice);
   
    const seen = new Set();
    return response.data[0].PostOffice
      .filter(po => {
        if (!seen.has(po.Name)) {
          seen.add(po.Name);
          return true;
        }
        return false;
      })
      .map(po => ({
        name: po.Name,
        pincode: po.Pincode
      }));

  } catch (error) {
    console.error("API ERROR:", error.message);
    return req.error(500, "External API Error");
  }
});

this.on('getVillagesByDistrict', async (req) => {
  const district = req.data.district;
  if (!district) return req.error(400, "District name is required");

  try {
    const response = await axios.get(
      `https://api.postalpincode.in/postoffice/${district}`
    );

    if (!response.data || response.data[0].Status === "Error") {
      return req.error(404, `No villages found for district "${district}"`);
    }

    const seen = new Set();
    return response.data[0].PostOffice
      .filter(po => {
        const isVillage = po.BranchType === "Sub Post Office" || 
                          po.BranchType === "Branch Post Office";
        if (isVillage && !seen.has(po.Name)) {
          seen.add(po.Name);
          return true;
        }else{
          return false;

        }
      })
      .map(po => ({
        name: po.Name,
        
      }));

  } catch (error) {
    console.error("API ERROR:", error.message);
    return req.error(500, "External API Error");
  }
});

        
  })



