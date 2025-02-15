import type { FileAnalysis } from './fileHandler';

// Base prompt interface
interface BasePrompt {
  context: string;
  instruction: string;
  examples?: string[];
}

// File analysis prompt interface
interface FileAnalysisPrompt extends BasePrompt {
  fileName: string;
  fileType: string;
  domain: string;
  content: string;
}

// Chat prompt interface
interface ChatPrompt extends BasePrompt {
  message: string;
  domain: string;
}

// Generate file analysis prompt
export function generateFileAnalysisPrompt({
  fileName,
  fileType,
  domain,
  content
}: FileAnalysisPrompt): string {
  return `Analyze this ${fileType} file in the context of ${domain}:

File Name: ${fileName}
File Type: ${fileType}
Content Preview: ${content.substring(0, 1000)}${content.length > 1000 ? '...' : ''}

Provide a detailed analysis including:
1. Key components and structure
2. Domain-specific insights
3. Potential use cases
4. Quality assessment
5. Recommendations for improvement

Focus on:
- Code quality and best practices
- Implementation patterns
- Performance considerations
- Security implications
- Integration opportunities
- Documentation needs

Format the response with clear sections and use markdown for better readability.`;
}

// Generate chat prompt
export function generateChatPrompt({
  message,
  domain,
  context,
  instruction,
  examples
}: ChatPrompt): string {
  let prompt = `Context:
Domain: ${domain}
${context}

User Message: ${message}

${instruction}

${examples ? `Examples:
${examples.join('\n')}

` : ''}Provide a response that:
1. Addresses the user's message directly
2. Provides domain-specific insights
3. Suggests actionable next steps
4. Maintains coherence with previous context

Format the response with:
- Clear section headings
- Code examples where relevant
- Markdown formatting`;

  return prompt;
}

// Generate code review prompt
export function generateCodeReviewPrompt(
  code: string,
  domain: string
): string {
  return `Review this code in the context of ${domain}:

\`\`\`
${code}
\`\`\`

Provide a comprehensive review including:
1. Code Quality
   - Best practices
   - Design patterns
   - Clean code principles

2. Performance
   - Algorithmic efficiency
   - Resource usage
   - Optimization opportunities

3. Security
   - Potential vulnerabilities
   - Security best practices
   - Data protection

4. Maintainability
   - Code organization
   - Documentation
   - Testing considerations

5. Domain-Specific Insights
   - Industry standards
   - Framework usage
   - Integration patterns

Format the response with clear sections and actionable recommendations.`;
}

// Generate documentation prompt
export function generateDocumentationPrompt(
  code: string,
  domain: string
): string {
  return `Generate documentation for this code in the context of ${domain}:

\`\`\`
${code}
\`\`\`

Include:
1. Overview
   - Purpose and functionality
   - Key components
   - Dependencies

2. API Documentation
   - Function signatures
   - Parameters
   - Return values
   - Examples

3. Usage Guide
   - Setup instructions
   - Common use cases
   - Configuration options

4. Best Practices
   - Recommended patterns
   - Performance considerations
   - Security guidelines

5. Examples
   - Code snippets
   - Use case scenarios
   - Integration examples

Format the documentation in markdown with clear sections and proper code formatting.`;
}

// Generate test case prompt
export function generateTestCasePrompt(
  code: string,
  domain: string
): string {
  return `Generate test cases for this code in the context of ${domain}:

\`\`\`
${code}
\`\`\`

Include:
1. Unit Tests
   - Function-level testing
   - Edge cases
   - Error handling

2. Integration Tests
   - Component interaction
   - API testing
   - Data flow

3. Performance Tests
   - Load testing
   - Stress testing
   - Benchmarks

4. Security Tests
   - Input validation
   - Authentication
   - Authorization

5. Domain-Specific Tests
   - Business logic
   - Compliance
   - Standards

Provide test cases with:
- Clear descriptions
- Test data
- Expected results
- Edge cases
- Error scenarios`;
}

// Generate optimization prompt
export function generateOptimizationPrompt(
  code: string,
  domain: string
): string {
  return `Analyze and optimize this code for ${domain}:

\`\`\`
${code}
\`\`\`

Focus on:
1. Performance Optimization
   - Algorithm efficiency
   - Memory usage
   - CPU utilization

2. Code Quality
   - Clean code principles
   - Design patterns
   - Best practices

3. Resource Usage
   - Database queries
   - API calls
   - File operations

4. Scalability
   - Concurrent operations
   - Load handling
   - Resource management

5. Domain-Specific Optimizations
   - Industry standards
   - Framework optimizations
   - Common patterns

Provide optimization suggestions with:
- Clear explanations
- Code examples
- Performance metrics
- Trade-off analysis
- Implementation guidelines`;
}

export type {
  BasePrompt,
  FileAnalysisPrompt,
  ChatPrompt
}; 