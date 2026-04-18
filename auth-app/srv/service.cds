using { auth.db as db } from '../db/schema';

service ProductService @(requires: 'authenticated-user') {
    

    entity Products as projection on db.Products ;

}