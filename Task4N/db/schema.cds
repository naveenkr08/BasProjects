namespace vehiclemanagement;

entity States {
    key stateId   : String(10);
        stateName : String(100);
        country   : String(50);
        stateCode : String;

        createdAt  : String;
        createdBy  : String;
        readAt     : String;
        readBy     : String;
        modifiedAt : String;
        modifiedBy : String;

        vehicles  : Association to many Vehicles
                        on vehicles.state = $self;
}

entity Vehicles {
    key vehicleID : String(20);
        modelName : String(100);
        oldPrice  : Decimal(15, 2);
        newPrice  : Decimal(15, 2);
        statuss   : String(30);

        createdAt  : String;
        createdBy  : String;
        readAt     : String;
        readBy     : String;
        modifiedAt : String;
        modifiedBy : String;

        state   : Association to States;
        dealer  : Association to Dealers;

        orders  : Composition of many Orders
                      on orders.vehicle = $self;
}

entity Dealers {
    key dealerID : UUID;
        dealerName : String(100);
        location   : String(100);

        createdAt  : String;
        createdBy  : String;
        readAt     : String;
        readBy     : String;
        modifiedAt : String;
        modifiedBy : String;

        vehicles : Association to many Vehicles
                      on vehicles.dealer = $self;
}

entity Customers {
    key customerID : UUID;
        name       : String(100);
        email      : String(100);

        createdAt  : String;
        createdBy  : String;
        readAt     : String;
        readBy     : String;
        modifiedAt : String;
        modifiedBy : String;

        orders : Association to many Orders
                     on orders.customer = $self;
}

entity Orders {
    key orderID  : UUID;
        quantity : Integer;

        createdAt  : String;
        createdBy  : String;
        readAt     : String;
        readBy     : String;
        modifiedAt : String;
        modifiedBy : String;

        vehicle  : Association to Vehicles;
        customer : Association to Customers;

        payments : Association to many Payments
                       on payments.order = $self;
}

entity Payments {
    key paymentID : UUID;
        amount      : Decimal(15,2);
        paymentDate : Date;

        createdAt  : String;
        createdBy  : String;
        readAt     : String;
        readBy     : String;
        modifiedAt : String;
        modifiedBy : String;

        order : Association to Orders;
}

