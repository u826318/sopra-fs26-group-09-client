export interface ReceiptLineItem {
  description: string | null;
  quantity: string | null;
  price: string | null;
  totalPrice: string | null;
  productCode: string | null;
  rawItem: Record<string, unknown> | null;
}

export interface ReceiptAnalysisResult {
  status: string | null;
  merchantName: string | null;
  merchantPhoneNumber: string | null;
  merchantAddress: string | null;
  transactionDate: string | null;
  transactionTime: string | null;
  subtotal: string | null;
  tax: string | null;
  total: string | null;
  tip: string | null;
  receiptType: string | null;
  currencyCode: string | null;
  countryRegion: string | null;
  rawText: string | null;
  items: ReceiptLineItem[] | null;
  extractedFields: Record<string, unknown> | null;
  rawResult: Record<string, unknown> | null;
}
