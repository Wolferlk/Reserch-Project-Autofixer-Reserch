export type TabType = 'repairs' | 'products' | 'hardware';

export type SearchFilters = {
  district: string;
  budget: string;
  custom_budget?: number;
  urgency: string;
  verified_only: boolean;
  open_now: boolean;
};

export type DetectionResult = {
  type: string;
  category: string;
  confidence: number;
  keywords: string[];
};

export type ErrorAlternative = {
  label: string;
  confidence: number;
};

export type ErrorDetectionResult = {
  label: string;
  confidence: number;
  source?: string;
  explanation?: string;
  alternatives?: ErrorAlternative[];
  multiple_types?: ErrorAlternative[];
  similar_errors?: ErrorAlternative[];
  fixing_steps?: string[];
  [key: string]: unknown;
};

export type ConfirmedErrorType = {
  label: string;
  confidence: number;
};

export type Shop = {
  shop_id: string;
  shop_name?: string;
  shop_type?: string;
  district?: string;
  avg_rating?: number;
  average_rating?: number;
  reviews?: number;
  reviews_count?: number;
  verified?: boolean;
  turnaround_days?: number;
  average_turnaround_time?: number;
  score?: number;
  district_match?: number;
  type_match?: number;
  budget_fit?: number;
  reason?: string;
  factors?: string[];
  [key: string]: unknown;
};

export type ShopDetails = {
  shop?: Record<string, unknown>;
  products?: Product[];
  feedback?: FeedbackEvent[];
  [key: string]: unknown;
};

export type Product = {
  product_id: string;
  category?: string;
  brand?: string;
  model?: string;
  price_lkr?: number;
  stock_status?: string;
  shop_name?: string;
  warranty?: string;
  [key: string]: unknown;
};

export type FeedbackEvent = {
  shop_id?: string;
  product_id?: string;
  rating?: number;
  feedback?: string;
  comment?: string;
  created_at?: string;
  [key: string]: unknown;
};
