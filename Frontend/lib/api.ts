export type Shop = {
  shop_id: string;
  shop_name?: string;
  district?: string;
  score?: number;
  avg_rating?: number;
  reviews?: number;
  verified?: boolean;
  district_match?: number;
  budget_fit?: number;
  specialization?: string;
  turnaround_days?: number;
  is_open?: boolean;
  latitude?: number;
  longitude?: number;
  [key: string]: unknown;
};

export type Product = {
  product_id: string;
  brand?: string;
  model?: string;
  category?: string;
  price_lkr?: number;
  stock_status?: string;
  warranty?: string;
  shop_name?: string;
  district?: string;
  shop_rating?: number;
  shop_reviews?: number;
  shop_verified?: boolean;
  [key: string]: unknown;
};

export type Tool = {
  tool_id: string;
  name: string;
  category?: string;
  description?: string;
  os: string[];
  license: string;
  sha256?: string;
  reason?: string;
  url: string;
  [key: string]: unknown;
};
