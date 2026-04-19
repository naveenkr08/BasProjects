using { API_BUSINESS_PARTNER as s4 } from './external/API_BUSINESS_PARTNER';
using { demo } from '../db/schema';

service extService {

    entity LocalEmailAddress as projection on demo.EmailAddress;  

    entity Users as projection on demo.Users;

    @cds.persistence.skip
    entity ExternalEmailAddress as projection on s4.A_AddressEmailAddress;

    function TransferData() returns String;
    function GetUserWithEmail(userId: String) returns UserWithEmail;

   type UserWithEmail {
    userId       : String;
    name         : String;
    email        : String;
    emailAddress : String;
    isDefault    : Boolean;
}
}