export interface Product {
  barcode: string | null;
  name: string | null;
  brand: string | null;
  quantity: string | null;
  servingSize: string | null;
  imageUrl: string | null;
  productUrl: string | null;
  nutriScore: string | null;
  stores: string[] | null;
  storeTags: string[] | null;
  purchasePlaces: string[] | null;
  nutriments: Record<string, unknown> | null;
  nutriScoreData: Record<string, unknown> | null;
  rawProduct: Record<string, unknown> | null;
}
