export const ERROR_TYPE_LABELS = [
  'GPU Overheat',
  'Blue Screen (BSOD)',
  'Boot Failure',
  'SSD Upgrade',
  'RAM Upgrade',
  'OS Installation',
  'Laptop Screen Repair',
  'Data Recovery',
  'PSU / Power Issue',
  'Wi-Fi Adapter Upgrade',
  'General Repair',
] as const;

type QueryType = 'repair' | 'product' | 'unknown';

export type DetectQueryResult = {
  type: QueryType;
  category: string;
  confidence: number;
};

const REPAIR_KEYWORDS: Array<{ category: string; words: string[] }> = [
  { category: 'GPU Overheat', words: ['gpu', 'graphics', 'overheat', 'thermal', 'temperature', 'fan'] },
  { category: 'Blue Screen (BSOD)', words: ['blue screen', 'bsod', 'crash', 'freeze', 'hang'] },
  { category: 'Boot Failure', words: ['boot', 'startup', "won't start", 'not starting', 'no display'] },
  { category: 'SSD Upgrade', words: ['ssd', 'nvme', 'm.2', 'storage upgrade'] },
  { category: 'RAM Upgrade', words: ['ram', 'memory', 'slow', 'lag'] },
  { category: 'OS Installation', words: ['windows', 'os', 'reinstall', 'format'] },
  { category: 'Laptop Screen Repair', words: ['screen', 'display', 'lcd', 'black screen'] },
  { category: 'Data Recovery', words: ['data', 'recover', 'deleted', 'corrupt'] },
  { category: 'PSU / Power Issue', words: ['power', 'psu', 'charging', 'battery'] },
  { category: 'Wi-Fi Adapter Upgrade', words: ['wifi', 'wi-fi', 'wireless', 'network', 'internet'] },
];

const PRODUCT_HINTS = ['buy', 'price', 'cost', 'brand', 'model', 'available', 'stock'];

export function detectQueryType(input: string): DetectQueryResult {
  const text = (input || '').toLowerCase().trim();
  if (!text) {
    return { type: 'unknown', category: 'General Repair', confidence: 0 };
  }

  let bestCategory = 'General Repair';
  let bestScore = 0;

  for (const item of REPAIR_KEYWORDS) {
    const score = item.words.reduce((acc, word) => (text.includes(word) ? acc + 1 : acc), 0);
    if (score > bestScore) {
      bestScore = score;
      bestCategory = item.category;
    }
  }

  const hasProductIntent = PRODUCT_HINTS.some((w) => text.includes(w));
  if (hasProductIntent && bestScore === 0) {
    return { type: 'product', category: 'General Repair', confidence: 0.55 };
  }

  if (bestScore > 0) {
    const confidence = Math.min(0.95, 0.45 + bestScore * 0.12);
    return { type: 'repair', category: bestCategory, confidence };
  }

  return { type: 'repair', category: 'General Repair', confidence: 0.4 };
}
