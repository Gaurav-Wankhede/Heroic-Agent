// Calculate Levenshtein distance for fuzzy matching
export function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + substitutionCost // substitution
      );
    }
  }
  return matrix[b.length][a.length];
}

// Memoized Levenshtein distance calculation
export const memoizedLevenshtein = (() => {
  const cache = new Map<string, number>();
  
  return (a: string, b: string): number => {
    const key = `${a}|${b}`;
    if (cache.has(key)) return cache.get(key)!;
    
    const distance = levenshteinDistance(a, b);
    cache.set(key, distance);
    return distance;
  };
})();

// String similarity check
export function isSimilar(str1: string, str2: string, threshold: number = 0.8): boolean {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  // Quick length check before expensive operation
  const lengthDiff = Math.abs(s1.length - s2.length);
  if (lengthDiff / Math.max(s1.length, s2.length) > (1 - threshold)) {
    return false;
  }
  
  const maxLength = Math.max(s1.length, s2.length);
  const distance = memoizedLevenshtein(s1, s2);
  return (maxLength - distance) / maxLength >= threshold;
}

// Calculate similarity between messages
export function calculateMessageSimilarity(message1: string, message2: string): number {
  const words1 = new Set(message1.toLowerCase().split(/\s+/));
  const words2 = new Set(message2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
} 