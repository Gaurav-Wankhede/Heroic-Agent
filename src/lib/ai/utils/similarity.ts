import { ValidationError } from '@/lib/ai/utils/errorHandler';

// Similarity algorithms
export enum SimilarityAlgorithm {
  LEVENSHTEIN = 'levenshtein',
  JACCARD = 'jaccard',
  COSINE = 'cosine',
  JARO_WINKLER = 'jaro-winkler',
  HYBRID = 'hybrid'
}

// Similarity options interface
export interface SimilarityOptions {
  algorithm?: SimilarityAlgorithm;
  threshold?: number;
  caseSensitive?: boolean;
  ignoreWhitespace?: boolean;
  ignoreSpecialChars?: boolean;
  weightedKeywords?: Array<{ word: string; weight: number }>;
}

// Default options
const DEFAULT_OPTIONS: Required<SimilarityOptions> = {
  algorithm: SimilarityAlgorithm.HYBRID,
  threshold: 0.8,
  caseSensitive: false,
  ignoreWhitespace: true,
  ignoreSpecialChars: true,
  weightedKeywords: []
};

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

// Calculate Jaro-Winkler similarity
export function jaroWinklerSimilarity(s1: string, s2: string): number {
  // Helper function to get matching characters
  function getMatchingCharacters(str1: string, str2: string): string {
    const matchDistance = Math.floor(Math.max(str1.length, str2.length) / 2) - 1;
    const commons1: string[] = [];
    const commons2: string[] = [];

    for (let i = 0; i < str1.length; i++) {
      const low = Math.max(0, i - matchDistance);
      const high = Math.min(i + matchDistance + 1, str2.length);
      for (let j = low; j < high; j++) {
        if (str1[i] === str2[j] && !commons2.includes(str2[j])) {
          commons1.push(str1[i]);
          commons2.push(str2[j]);
          break;
        }
      }
    }

    return commons1.join('');
  }

  // Calculate Jaro similarity
  function jaroSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;

    const matching1 = getMatchingCharacters(str1, str2);
    const matching2 = getMatchingCharacters(str2, str1);
    
    if (matching1.length === 0 || matching2.length === 0) return 0;

    let transpositions = 0;
    for (let i = 0; i < matching1.length; i++) {
      if (matching1[i] !== matching2[i]) {
        transpositions++;
      }
    }
    transpositions = Math.floor(transpositions / 2);

    return (
      (matching1.length / str1.length +
        matching2.length / str2.length +
        (matching1.length - transpositions) / matching1.length) /
      3
    );
  }

  const jaro = jaroSimilarity(s1, s2);
  const prefixLength = (() => {
    let i = 0;
    while (i < 4 && i < s1.length && i < s2.length && s1[i] === s2[i]) i++;
    return i;
  })();

  return jaro + (prefixLength * 0.1 * (1 - jaro));
}

// Calculate Jaccard similarity
export function jaccardSimilarity(s1: string, s2: string): number {
  const set1 = new Set(s1.split(''));
  const set2 = new Set(s2.split(''));
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

// Calculate cosine similarity
export function cosineSimilarity(s1: string, s2: string): number {
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  
  // Create word frequency maps
  const freqMap1 = new Map<string, number>();
  const freqMap2 = new Map<string, number>();
  
  words1.forEach(word => {
    freqMap1.set(word, (freqMap1.get(word) || 0) + 1);
  });
  
  words2.forEach(word => {
    freqMap2.set(word, (freqMap2.get(word) || 0) + 1);
  });
  
  // Get unique words
  const uniqueWords = new Set([...freqMap1.keys(), ...freqMap2.keys()]);
  
  // Calculate dot product and magnitudes
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;
  
  uniqueWords.forEach(word => {
    const freq1 = freqMap1.get(word) || 0;
    const freq2 = freqMap2.get(word) || 0;
    dotProduct += freq1 * freq2;
    magnitude1 += freq1 * freq1;
    magnitude2 += freq2 * freq2;
  });
  
  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);
  
  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  return dotProduct / (magnitude1 * magnitude2);
}

// Preprocess text based on options
function preprocessText(text: string, options: Required<SimilarityOptions>): string {
  let processed = text;
  
  if (!options.caseSensitive) {
    processed = processed.toLowerCase();
  }
  
  if (options.ignoreWhitespace) {
    processed = processed.trim().replace(/\s+/g, ' ');
  }
  
  if (options.ignoreSpecialChars) {
    processed = processed.replace(/[^\w\s]/g, '');
  }
  
  return processed;
}

// Calculate hybrid similarity score
function calculateHybridScore(s1: string, s2: string): number {
  const levenshteinScore = 1 - (memoizedLevenshtein(s1, s2) / Math.max(s1.length, s2.length));
  const jaroWinklerScore = jaroWinklerSimilarity(s1, s2);
  const jaccardScore = jaccardSimilarity(s1, s2);
  const cosineScore = cosineSimilarity(s1, s2);
  
  // Weight the scores based on their reliability and effectiveness
  return (
    levenshteinScore * 0.3 +
    jaroWinklerScore * 0.3 +
    jaccardScore * 0.2 +
    cosineScore * 0.2
  );
}

// Calculate similarity between strings with options
export function calculateSimilarity(
  str1: string,
  str2: string,
  options: Partial<SimilarityOptions> = {}
): number {
  try {
    const fullOptions: Required<SimilarityOptions> = { ...DEFAULT_OPTIONS, ...options };
    
    // Validate inputs
    if (typeof str1 !== 'string' || typeof str2 !== 'string') {
      throw new ValidationError('Both inputs must be strings');
    }
    
    // Preprocess strings
    const s1 = preprocessText(str1, fullOptions);
    const s2 = preprocessText(str2, fullOptions);
    
    // Quick equality check
    if (s1 === s2) return 1;
    if (s1.length === 0 && s2.length === 0) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;
    
    // Calculate base similarity score
    let similarity: number;
    switch (fullOptions.algorithm) {
      case SimilarityAlgorithm.LEVENSHTEIN:
        similarity = 1 - (memoizedLevenshtein(s1, s2) / Math.max(s1.length, s2.length));
        break;
      case SimilarityAlgorithm.JACCARD:
        similarity = jaccardSimilarity(s1, s2);
        break;
      case SimilarityAlgorithm.COSINE:
        similarity = cosineSimilarity(s1, s2);
        break;
      case SimilarityAlgorithm.JARO_WINKLER:
        similarity = jaroWinklerSimilarity(s1, s2);
        break;
      case SimilarityAlgorithm.HYBRID:
        similarity = calculateHybridScore(s1, s2);
        break;
      default:
        throw new ValidationError(`Unknown similarity algorithm: ${fullOptions.algorithm}`);
    }
    
    // Apply weighted keywords if provided
    if (fullOptions.weightedKeywords.length > 0) {
      const keywordBonus = fullOptions.weightedKeywords.reduce((bonus, { word, weight }) => {
        const keywordPresence1 = s1.includes(preprocessText(word, fullOptions));
        const keywordPresence2 = s2.includes(preprocessText(word, fullOptions));
        return bonus + (keywordPresence1 && keywordPresence2 ? weight : 0);
      }, 0);
      
      // Blend the base similarity with the keyword bonus
      similarity = similarity * 0.7 + Math.min(keywordBonus, 0.3);
    }
    
    return Math.max(0, Math.min(1, similarity));
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError(`Failed to calculate similarity: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// String similarity check with options
export function isSimilar(
  str1: string,
  str2: string,
  options: Partial<SimilarityOptions> = {}
): boolean {
  const similarity = calculateSimilarity(str1, str2, options);
  const threshold = options.threshold ?? DEFAULT_OPTIONS.threshold;
  return similarity >= threshold;
}

// Calculate similarity between messages
export function calculateMessageSimilarity(
  message1: string,
  message2: string,
  options: Partial<SimilarityOptions> = {}
): number {
  return calculateSimilarity(message1, message2, {
    algorithm: SimilarityAlgorithm.HYBRID,
    ignoreSpecialChars: true,
    ...options
  });
} 