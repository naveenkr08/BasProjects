namespace auth.db;

entity Products {
    key productID   : UUID;
    productName : String(100);
    price       : Decimal(10,2);
    category    : String(50);
}