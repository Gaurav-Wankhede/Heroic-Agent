import { ChatMessage } from '../types/chat';
import { getLatestDomainInfo } from './response';

const LATEST_INFO_PATTERNS: string[] = [
  'latest', 'new', 'recent', 'update', 'current', 'modern', 'trending', 'what\'s new'
];

// Enhanced prompt patterns for better context
const CONTEXT_PATTERNS = {
  technical: ['how to', 'implementation', 'code', 'error', 'bug', 'performance', 'optimization'],
  conceptual: ['what is', 'explain', 'difference between', 'compare', 'understand'],
  bestPractices: ['best practice', 'recommended', 'standard', 'pattern', 'convention'],
  troubleshooting: ['debug', 'fix', 'solve', 'issue', 'problem', 'error']
};

type QueryType = 'Technical Implementation' | 'Conceptual Understanding' | 'Best Practices' | 'Troubleshooting' | 'General Query';

/**
 * Build prompt with enhanced domain-specific context and grounding
 */
export async function buildPrompt(
  message: string, 
  domain: string, 
  systemPrompt: string, 
  chatHistory: ChatMessage[] = []
): Promise<string> {
  let prompt = `${systemPrompt}\n\n`;
  
  // Add enhanced model capabilities context
  prompt += `ENHANCED MODEL CAPABILITIES:
1. Advanced Understanding:
   - Technical documentation and specifications
   - Code snippets and implementation details
   - Error messages and debugging contexts
   - Best practices and optimization techniques
2. Domain Expertise:
   - ${domain}-specific concepts and terminology
   - Latest framework updates and features
   - Community standards and conventions
3. Context Awareness:
   - Previous conversation history
   - Related technical documentation
   - Framework-specific nuances
4. Response Quality:
   - Precise, actionable answers
   - Code examples when relevant
   - Citations to official documentation
   - Best practices recommendations\n\n`;

  // Determine query type for context optimization
  const queryType = determineQueryType(message);
  prompt += `Query Context: ${queryType}\n`;

  // Add domain-specific context
  prompt += `Domain Focus: ${domain}\n`;
  prompt += `Technical Scope: Questions and solutions specific to ${domain} ecosystem\n\n`;

  // Check for latest information request
  if (LATEST_INFO_PATTERNS.some(pattern => message.toLowerCase().includes(pattern))) {
    const latestInfo = await getLatestDomainInfo(domain, chatHistory);
    prompt += `Current ${domain} Context:\n${latestInfo}\n\n`;
  }

  // Add enhanced chat history context
  if (chatHistory.length > 0) {
    prompt += 'Conversation Context:\n';
    const relevantHistory = chatHistory
      .slice(-3)
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`);
    prompt += relevantHistory.join('');
  }

  // Clean and structure the current query
  const cleanMessage = message.replace(/@\S+/g, '').trim();
  prompt += `\nCurrent Query: ${cleanMessage}\n`;
  
  // Add response guidance based on query type
  prompt += getResponseGuidance(queryType, domain);
  
  return prompt;
}

function determineQueryType(message: string): QueryType {
  const messageLower = message.toLowerCase();
  
  if (CONTEXT_PATTERNS.technical.some(pattern => messageLower.includes(pattern))) {
    return 'Technical Implementation';
  }
  if (CONTEXT_PATTERNS.conceptual.some(pattern => messageLower.includes(pattern))) {
    return 'Conceptual Understanding';
  }
  if (CONTEXT_PATTERNS.bestPractices.some(pattern => messageLower.includes(pattern))) {
    return 'Best Practices';
  }
  if (CONTEXT_PATTERNS.troubleshooting.some(pattern => messageLower.includes(pattern))) {
    return 'Troubleshooting';
  }
  return 'General Query';
}

function getResponseGuidance(queryType: QueryType, domain: string): string {
  const guidanceMap: Record<QueryType, string> = {
    'Technical Implementation': `
Response Guidelines:
- Provide clear, step-by-step implementation details
- Include relevant code examples
- Reference official ${domain} documentation
- Highlight best practices and potential pitfalls`,
    
    'Conceptual Understanding': `
Response Guidelines:
- Explain concepts clearly with analogies when helpful
- Provide real-world examples and use cases
- Reference official documentation and specifications
- Include visual explanations if applicable`,
    
    'Best Practices': `
Response Guidelines:
- Focus on current ${domain} recommended practices
- Include performance and security considerations
- Provide examples of proper implementation
- Reference community standards and conventions`,
    
    'Troubleshooting': `
Response Guidelines:
- Analyze the problem systematically
- Provide step-by-step debugging approach
- Include common solutions and workarounds
- Reference similar issues and their resolutions`,
    
    'General Query': `
Response Guidelines:
- Provide comprehensive yet concise information
- Include relevant examples and use cases
- Reference official documentation when applicable
- Highlight important considerations`
  };

  return guidanceMap[queryType] || guidanceMap['General Query'];
} 