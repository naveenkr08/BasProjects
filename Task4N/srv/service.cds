using {vehiclemanagement} from '../db/schema';

service MyService {

     entity Vehicles as projection on Vehiclesdata{
         key vehicleID
     }
    entity Vehiclesdata as projection on vehiclemanagement.Vehicles;
    entity Orders as projection on vehiclemanagement.Orders;
    entity States as projection on Statedata{
      stateName
    };
    entity Statedata as projection on vehiclemanagement.States;
    entity Dealers as projection on vehiclemanagement.Dealers;
    
    entity Customers as projection on vehiclemanagement.Customers;
 
    type Locations{
      latitude:Decimal(9,6);
      longitude:Decimal(9,6);
    }

    type totalAddress{
    latitude: Decimal(9,6);
    longitude: Decimal(9,6);
    address   : String;
    location  : String;
    district  : String;
    state     : String;
    pincode   : String;
    country   : String;
}

type City {
  name    : String;
  pincode : String;
}
  type Village {
  name    : String;
  
}     

    action updateStates(stateId:String(10), addstate:String) returns String;
    action updateprice(vehicleID:String(20), newValue:Decimal(15, 2)) returns String;
    action updateStatus(vehicleID:String(20)) returns String;
    action updateDealers(dealerID:UUID, newDealerName:String) returns String;
    function generateVehicleID(stateId: String(10)) returns String;
    function getVehiclesID() returns many String;
    function addLocation(dealerID:UUID) returns Locations;
    function getlocationdetails(dealerID:UUID) returns totalAddress;
    function getAllDistricts(stateId: String(10)) returns array of String;
    function getCitiesByDistrict(district: String) returns array of City;
    function getVillagesByDistrict(district: String) returns array of Village;
    
    

}