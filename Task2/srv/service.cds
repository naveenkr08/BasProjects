using proj from '../db/schema';

service MyService{
    entity Dealers  as projection on proj.Dealers;
    entity Orders   as projection on proj.Orders;
    entity Vehicles as projection on proj.Vehicles;
    
    action approveVehicle(vehicle_ID:String) returns String;
    function getTotalOrderValue(vehicle_ID: String) returns Integer;
}