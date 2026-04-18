export interface SallaStore {
  id: number;
  storeName: string;
  storeUrl: string;
  storeSlug: string;
  documentType: string | null;
  documentNumber: string | null;
  maroofUrl: string | null;
  category: string | null;
  lastScrapedAt: string;
  createdAt: string;
}

export interface SallaApiResponse {
  data: SallaStore[];
  timestamp: string;
}
