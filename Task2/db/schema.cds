namespace proj;

entity Dealers {
    key ID  : Integer;
    dealer_name    : String;
    location       : String;
}

entity Vehicles {
    key vehicle_ID : String;
    modelname : String;
    baseprice :Decimal(10,2);
    price     : Decimal(10,2);
    state    :String(2);
    status   : String;
    
    dealer : Association to Dealers;

    orders : Composition of many Orders
        on orders.vehicle = $self;
}

entity Orders {
    key order_ID : Integer;
    quantity     : Integer;

    vehicle : Association to Vehicles;
}