// URL validation utilities
export async function validateUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    return response.status === 200;
  } catch (error) {
    console.warn(`Failed to validate URL ${url}:`, error);
    return false;
  }
}

export async function validateUrls(urls: string[]): Promise<Set<string>> {
  const validUrls = new Set<string>();
  const uniqueUrls = [...new Set(urls)];

  const batchSize = 5;
  for (let i = 0; i < uniqueUrls.length; i += batchSize) {
    const batch = uniqueUrls.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(url => validateUrl(url).then(valid => ({ url, valid })))
    );
    
    results.forEach(({ url, valid }) => {
      if (valid) validUrls.add(url);
    });
  }

  return validUrls;
} 