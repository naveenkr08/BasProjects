namespace demo;

entity EmailAddress {
    key AddressID         : String(10);
    key Person            : String(10);
    key OrdinalNumber     : String(10);
    EmailAddress          : String(241);
    IsDefaultEmailAddress : Boolean;
}

entity Users {
    key userId : String;
    name       : String;
    email      : String;   // stores AddressID — used to join with S4
}