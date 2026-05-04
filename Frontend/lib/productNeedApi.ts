import { recommendationApiBaseUrl, requireApiBaseUrl, resolveApiBaseUrl } from './apiBase';

const RAW_API_BASE_URL = resolveApiBaseUrl(process.env.NEXT_PUBLIC_RECO_API_URL, process.env.NEXT_PUBLIC_API_URL);
const API_BASE_URL = recommendationApiBaseUrl(RAW_API_BASE_URL);

export type ProductNeedRequest = {
  text: string;
  district?: string;
  budget?: string;
  user_district?: string;
};

export type ProductNeedAlternative = {
  label: string;
  confidence: number;
  explanation?: string;
};

export type ProductNeedResponse = {
  component?: string | null;
  need_label?: string | null;
  confidence: number;
  definition?: string | null;
  why_useful?: string | null;
  extra_explanation?: string | null;
  alternatives?: ProductNeedAlternative[];
  fixing_tips?: string[];
  is_low_confidence?: boolean;
  source?: string;
  ask_feedback?: boolean;
  grouped_by_category?: Array<{ category: string; components: ProductNeedAlternative[] }>;
  spell_correction_suggestion?: string | null;
  [key: string]: unknown;
};

export async function fetchProductNeedRecommend(payload: ProductNeedRequest): Promise<ProductNeedResponse> {
  const apiBaseUrl = requireApiBaseUrl(API_BASE_URL, 'Recommendation backend');
  const body = {
    text: payload.text,
    budget: payload.budget ?? 'medium',
    district: payload.district,
    user_district: payload.user_district ?? payload.district,
  };

  const res = await fetch(`${apiBaseUrl}/product_need_recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`API error ${res.status}: ${detail}`);
  }

  return (await res.json()) as ProductNeedResponse;
}
