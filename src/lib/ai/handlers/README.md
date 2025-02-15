# Response Handler

The Response Handler is responsible for formatting and managing responses from the AI pipeline. It provides a centralized way to handle response formatting, caching, error handling, and progress tracking.

## Features

- Response formatting with structured data support
- Citation integration with multiple citation styles
- Caching mechanism for improved performance
- Progress tracking for long-running operations
- Comprehensive error handling
- TypeScript type safety

## Usage

```typescript
import { responseHandler } from './responseHandler';

// Format a pipeline result
const response = await responseHandler.formatPipelineResult(
  pipelineResult,
  'user query',
  {
    includeCitations: true,
    citationStyle: 'inline',
    maxCitations: 5,
    includeMetadata: true,
    formatMarkdown: true,
    cacheResults: true,
    progressCallback: (progress, step) => {
      console.log(`Progress: ${progress * 100}% - ${step}`);
    }
  }
);

// Clear cache if needed
responseHandler.clearCache();
```

## Options

### ResponseOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cacheResults` | boolean | true | Whether to cache the response |
| `includeMetadata` | boolean | true | Whether to include metadata in the response |
| `formatMarkdown` | boolean | true | Whether to format the response as markdown |
| `includeCitations` | boolean | true | Whether to include citations |
| `maxCitations` | number | 10 | Maximum number of citations to include |
| `citationStyle` | 'inline' \| 'footnote' \| 'endnote' | 'inline' | Citation style to use |
| `progressCallback` | (progress: number, step: string) => void | () => {} | Callback for progress updates |

### ResponseMetadata

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | number | Response generation timestamp |
| `duration` | number | Processing duration in milliseconds |
| `cacheHit` | boolean | Whether the response was from cache |
| `retries` | number | Number of retries performed |
| `sources` | number | Total number of sources |
| `validSources` | number | Number of valid sources |
| `averageScore` | number | Average source score |
| `processingSteps` | string[] | List of processing steps |

## Error Handling

The Response Handler uses the Error Handler to provide detailed error information:

```typescript
try {
  const response = await responseHandler.formatPipelineResult(...);
} catch (error) {
  // Error response will include:
  // - Error message
  // - Error type
  // - Error severity
  // - Error code (if applicable)
  // - Error details (if available)
}
```

## Caching

Responses are cached using a unique key based on the query and metadata. The cache TTL is configurable through the `CACHE_TTL` constant.

To clear the cache:
```typescript
responseHandler.clearCache();
```

## Progress Tracking

Progress updates are provided through the `progressCallback` option:

```typescript
const options = {
  progressCallback: (progress: number, step: string) => {
    // progress: 0.0 to 1.0
    // step: current processing step
    console.log(`${step}: ${progress * 100}%`);
  }
};
```

## Integration with Citation Service

The Response Handler integrates with the Citation Service to format citations in different styles:

```typescript
const options = {
  includeCitations: true,
  citationStyle: 'footnote',
  maxCitations: 5
};
```

## Best Practices

1. Always provide a progress callback for long-running operations
2. Use caching for frequently requested queries
3. Handle errors appropriately using try-catch blocks
4. Clear cache periodically to prevent memory issues
5. Use TypeScript for better type safety
6. Monitor response times and cache hit rates
7. Validate input before processing
8. Use appropriate citation styles for different contexts
9. Keep metadata for debugging and monitoring
10. Follow the singleton pattern for consistency

## Error Codes

| Code | Description | Severity |
|------|-------------|----------|
| `INVALID_PIPELINE_RESULT` | Invalid pipeline result format | Error |
| `CACHE_ERROR` | Error accessing cache | Warning |
| `CITATION_ERROR` | Error formatting citations | Warning |
| `PROGRESS_ERROR` | Error tracking progress | Info |
| `METADATA_ERROR` | Error processing metadata | Warning |

## Troubleshooting

1. **Cache not working**
   - Check CACHE_TTL configuration
   - Verify cache key generation
   - Monitor cache size

2. **Citations not appearing**
   - Check includeCitations option
   - Verify source format
   - Check maxCitations value

3. **Progress not updating**
   - Verify progressCallback implementation
   - Check for async operation completion
   - Monitor step progression

4. **Performance issues**
   - Enable caching
   - Reduce maxCitations
   - Monitor response times
   - Clear cache regularly

5. **Type errors**
   - Use TypeScript
   - Check interface implementations
   - Verify type definitions 