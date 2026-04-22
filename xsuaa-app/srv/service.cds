using { zentra } from '../db/schema';

@requires: 'ZentraViewer'
service CatalogService {
  entity Books  as projection on zentra.Books;
  entity Orders as projection on zentra.Orders;
}