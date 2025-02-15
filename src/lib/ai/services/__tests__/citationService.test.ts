import { citationService, Source, CitationOptions } from '../citationService';

describe('CitationService', () => {
  const mockSources: Source[] = [
    {
      url: 'https://example1.com',
      title: 'Title 1',
      description: 'Description 1',
      content: 'Content 1',
      score: 0.9,
      relevance: 0.8,
      metadata: {
        date: '2024-03-14',
        author: 'Author 1',
        language: 'en',
        wordCount: 100,
        readingTime: 1
      }
    },
    {
      url: 'https://example2.com',
      title: 'Title 2',
      description: 'Description 2',
      content: 'Content 2',
      score: 0.8,
      relevance: 0.7,
      metadata: {
        date: '2024-03-14',
        author: 'Author 2',
        language: 'en',
        wordCount: 200,
        readingTime: 2
      }
    }
  ];

  describe('formatSourcesWithCitations', () => {
    it('should format sources with inline citations by default', () => {
      const result = citationService.formatSourcesWithCitations(mockSources);
      
      expect(result).toContain('[1] Title 1');
      expect(result).toContain('Description 1');
      expect(result).toContain('https://example1.com');
      expect(result).toContain('[2] Title 2');
      expect(result).toContain('Description 2');
      expect(result).toContain('https://example2.com');
    });

    it('should format sources with footnote citations', () => {
      const options: Partial<CitationOptions> = { style: 'footnote' };
      const result = citationService.formatSourcesWithCitations(mockSources, options);
      
      expect(result).toContain('Title 1 [1]');
      expect(result).toContain('Title 2 [2]');
      expect(result).toContain('Footnotes:');
      expect(result).toContain('[1] https://example1.com');
      expect(result).toContain('[2] https://example2.com');
    });

    it('should format sources with endnote citations', () => {
      const options: Partial<CitationOptions> = { style: 'endnote' };
      const result = citationService.formatSourcesWithCitations(mockSources, options);
      
      expect(result).toContain('Title 1 [1]');
      expect(result).toContain('Title 2 [2]');
      expect(result).toContain('References:');
      expect(result).toContain('[1] Title 1. https://example1.com');
      expect(result).toContain('[2] Title 2. https://example2.com');
    });

    it('should respect maxCitations option', () => {
      const options: Partial<CitationOptions> = { maxCitations: 1 };
      const result = citationService.formatSourcesWithCitations(mockSources, options);
      
      expect(result).toContain('[1] Title 1');
      expect(result).not.toContain('[2] Title 2');
    });

    it('should include metadata when requested', () => {
      const options: Partial<CitationOptions> = { includeMetadata: true };
      const result = citationService.formatSourcesWithCitations(mockSources, options);
      
      expect(result).toContain('Metadata:');
      expect(result).toContain('Total Sources: 2');
      expect(result).toContain('Valid Sources: 2');
      expect(result).toContain('Average Score:');
    });

    it('should not include metadata when not requested', () => {
      const options: Partial<CitationOptions> = { includeMetadata: false };
      const result = citationService.formatSourcesWithCitations(mockSources, options);
      
      expect(result).not.toContain('Metadata:');
    });

    it('should format markdown when requested', () => {
      const options: Partial<CitationOptions> = { formatMarkdown: true };
      const result = citationService.formatSourcesWithCitations(mockSources, options);
      
      expect(result).toContain('**');
      expect(result).toContain('*');
      expect(result).toContain('`');
    });

    it('should sort sources by combined score and relevance', () => {
      const result = citationService.formatSourcesWithCitations(mockSources);
      const firstSourceIndex = result.indexOf('Title 1');
      const secondSourceIndex = result.indexOf('Title 2');
      
      expect(firstSourceIndex).toBeLessThan(secondSourceIndex);
    });
  });
}); 