# AI Services

This directory contains various services used by the AI system.

## Citation Service

The Citation Service is responsible for formatting citations and managing source metadata. It provides a flexible way to format citations in different styles and handle source information.

### Features

- Multiple citation styles (inline, footnote, endnote)
- Source metadata handling
- Markdown formatting
- Source sorting by relevance and score
- Configurable citation limits
- TypeScript type safety

### Usage

```typescript
import { citationService } from './citationService';

// Format sources with citations
const formattedContent = citationService.formatSourcesWithCitations(
  sources,
  {
    maxCitations: 5,
    style: 'inline',
    includeMetadata: true,
    formatMarkdown: true
  }
);
```

### Source Interface

```typescript
interface Source {
  url: string;
  title: string;
  description: string;
  content: string;
  score: number;
  relevance: number;
  metadata: {
    date: string;
    author?: string;
    language?: string;
    wordCount?: number;
    readingTime?: number;
  };
}
```

### Citation Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxCitations` | number | 10 | Maximum number of citations to include |
| `style` | 'inline' \| 'footnote' \| 'endnote' | 'inline' | Citation style to use |
| `includeMetadata` | boolean | true | Whether to include metadata |
| `formatMarkdown` | boolean | true | Whether to format as markdown |

### Citation Styles

1. **Inline Style**
   ```
   [1] Title
   Description
   Source: URL
   ```

2. **Footnote Style**
   ```
   Title [1]
   Description

   Footnotes:
   [1] URL
   ```

3. **Endnote Style**
   ```
   Title [1]
   Description

   References:
   [1] Title. URL
   ```

### Best Practices

1. Choose appropriate citation style for context
2. Limit citations to maintain readability
3. Include metadata for transparency
4. Sort sources by relevance
5. Validate source data
6. Use TypeScript for type safety
7. Format markdown consistently
8. Handle missing metadata gracefully
9. Cache formatted citations
10. Monitor citation performance

### Error Handling

The Citation Service handles various error cases:

1. **Invalid source data**
   - Missing required fields
   - Invalid URLs
   - Invalid scores

2. **Style formatting errors**
   - Unknown citation style
   - Invalid metadata format
   - Markdown formatting issues

3. **Performance issues**
   - Too many sources
   - Large content blocks
   - Complex metadata

### Integration

The Citation Service is designed to work with:

1. **Response Handler**
   - Formats citations for responses
   - Handles metadata integration
   - Manages citation styles

2. **Pipeline Service**
   - Processes source data
   - Validates URLs
   - Calculates scores

3. **Content Validator**
   - Validates source content
   - Checks readability
   - Verifies metadata

### Examples

1. **Basic Usage**
   ```typescript
   const content = citationService.formatSourcesWithCitations(sources);
   ```

2. **Custom Style**
   ```typescript
   const content = citationService.formatSourcesWithCitations(sources, {
     style: 'footnote'
   });
   ```

3. **Limited Citations**
   ```typescript
   const content = citationService.formatSourcesWithCitations(sources, {
     maxCitations: 3
   });
   ```

4. **With Metadata**
   ```typescript
   const content = citationService.formatSourcesWithCitations(sources, {
     includeMetadata: true
   });
   ```

### Troubleshooting

1. **Citations not appearing**
   - Check source format
   - Verify maxCitations value
   - Check style configuration

2. **Metadata issues**
   - Verify metadata format
   - Check required fields
   - Handle optional fields

3. **Formatting problems**
   - Check markdown configuration
   - Verify style settings
   - Review source content

4. **Performance issues**
   - Reduce source count
   - Limit metadata
   - Cache results

5. **Type errors**
   - Use TypeScript
   - Check interfaces
   - Validate data

### Future Improvements

1. **Additional citation styles**
   - APA format
   - MLA format
   - Chicago style

2. **Enhanced metadata**
   - More fields
   - Better validation
   - Custom formats

3. **Performance optimizations**
   - Better caching
   - Lazy loading
   - Batch processing

4. **Integration features**
   - More export formats
   - Better error handling
   - Custom formatters 