const RAW_API_BASE_URL = (process.env.NEXT_PUBLIC_RECO_API_URL || 'http://localhost:8001').replace(/\/+$/, '');
const API_BASE_URL = RAW_API_BASE_URL.endsWith('/recommendation')
  ? RAW_API_BASE_URL
  : `${RAW_API_BASE_URL}/recommendation`;

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
  const body = {
    text: payload.text,
    budget: payload.budget ?? 'medium',
    district: payload.district,
    user_district: payload.user_district ?? payload.district,
  };

  const res = await fetch(`${API_BASE_URL}/product_need_recommend`, {
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
