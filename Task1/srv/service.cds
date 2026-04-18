using notifyy from '../db/schema';

service MyService {

    entity Vechile as projection on notifyy.Vechile;

    action approveVechile(vechile_ID:Integer) returns String;
    action notifyDealer(vechile_ID:Integer) returns String;

    


}



