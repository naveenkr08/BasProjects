namespace mapAPI.srv;

using { hello } from '../db/schema';

service MapService {
  entity ApiLogs as projection on hello.ApiLogs;
  type Locations {
    latitude  : Decimal(9,6);
    longitude : Decimal(9,6);
    address   : String;
    location  : String;
    district  : String;
    state     : String;
    pincode   : String;
    country   : String;
}
type LatAndLong{
  latitude:String;
  longitude:String;
}
type District{
   name:String;
}
type City {
  name    : String;
  pincode : String;
}
type Village {
  name    : String;
  
}

function getDistricts(state:String) returns array of District;
function getlatitudeAndLongitude(cityname:String) returns LatAndLong;
function getLocationInDetail(address: String) returns Locations;
function getAddressFromCoordinates(latitude: Decimal, longitude: Decimal) returns Locations;
function getCitiesByDistrict(district: String) returns array of City;
function getVillagesByDistrict(district: String) returns array of Village;

  
}