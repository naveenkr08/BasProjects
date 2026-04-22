namespace zentra;

using { cuid, managed } from '@sap/cds/common';

entity Books : cuid, managed {
  title  : String(111) @mandatory;
  descr  : String(1111);
  stock  : Integer;
  price  : Decimal(9,2);
}

entity Orders : cuid, managed {
  customer  : String(111) @mandatory;
  status    : String(20) default 'pending';
  totalAmount : Decimal(9,2);
}