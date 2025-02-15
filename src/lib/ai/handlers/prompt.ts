import { ChatMessage } from '../types/chat';

// Enhanced prompt patterns for better context and intent recognition
const CONTEXT_PATTERNS = {
  technical: ['how to', 'implementation', 'code', 'error', 'bug', 'performance', 'optimization'],
  conceptual: ['what is', 'explain', 'difference between', 'compare', 'understand'],
  bestPractices: ['best practice', 'recommended', 'standard', 'pattern', 'convention'],
  troubleshooting: ['debug', 'fix', 'solve', 'issue', 'problem', 'error'],
  temporal: ['current', 'latest', 'recent', 'now', 'today', 'update', 'new'],
  domainSwitch: ['in terms of', 'regarding', 'about', 'related to', 'with respect to'],
  installation: ['install', 'setup', 'configure', 'deployment', 'environment'],
  news: ['news', 'announcement', 'release', 'changelog', 'update']
};

type QueryType = 'Technical Implementation' | 'Conceptual Understanding' | 'Best Practices' | 
                'Troubleshooting' | 'Temporal Query' | 'Installation' | 'News Update' | 'General Query';

/**
 * Build enhanced prompt with improved domain-specific context and grounding
 */
export async function buildPrompt(
  message: string, 
  domain: string, 
  systemPrompt: string, 
  chatHistory: ChatMessage[] = []
): Promise<string> {
  const queryType = determineQueryType(message);
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  // Build the base prompt with system context
  let prompt = `${systemPrompt}\n\n`;
  
  // Add enhanced capabilities section
  prompt += `CAPABILITIES AND CONTEXT:
1. Domain Expertise (${domain}):
   - Deep technical knowledge and implementation guidance
   - Installation and configuration assistance
   - Best practices and design patterns
   - Common issues and troubleshooting
   - Latest news and updates tracking

2. Temporal Awareness:
   - Current Date/Time: ${currentDate}
   - Real-time information processing
   - News and updates monitoring
   - Version compatibility tracking
   - Release history awareness

3. Contextual Understanding:
   - Query Type: ${queryType}
   - Conversation history analysis
   - Cross-domain knowledge integration
   - User expertise level adaptation
   - Intent recognition and clarification

4. Information Grounding:
   - Official documentation references
   - Community resources integration
   - Real-time web search validation
   - Source credibility verification
   - Version-specific guidance\n\n`;

  // Add enhanced chat history analysis
  if (chatHistory.length > 0) {
    prompt += 'CONVERSATION CONTEXT:\n';
    const recentHistory = analyzeConversationHistory(chatHistory);
    prompt += `${recentHistory}\n\n`;
  }

  // Add domain-specific context and focus
  prompt += `DOMAIN CONTEXT:
Primary Domain: ${domain}
Query Category: ${queryType}
Focus Areas:
- Technical accuracy and implementation details
- Installation and configuration guidance
- Latest updates and news relevance
- Best practices and common pitfalls
- User-specific context and requirements\n\n`;

  // Add current query with enhanced guidance
  prompt += `CURRENT QUERY: ${message}\n\n`;

  // Add response guidelines based on query type
  prompt += getResponseGuidance(queryType, domain);

  // Add grounding instructions
  prompt += `\nGROUNDING INSTRUCTIONS:
1. Information Sources:
   - Official ${domain} documentation
   - Release notes and changelogs
   - Community forums and discussions
   - Technical blogs and articles
   - Security advisories

2. Validation Requirements:
   - Version compatibility check
   - Implementation feasibility
   - Security implications
   - Performance considerations
   - Best practices alignment

3. Response Structure:
   - Clear step-by-step guidance
   - Code examples when relevant
   - Common pitfalls warning
   - Alternative approaches
   - Further resources

4. Quality Assurance:
   - Technical accuracy verification
   - Source credibility check
   - Implementation testing guidance
   - Security best practices
   - Performance optimization tips\n\n`;

  return prompt;
}

/**
 * Enhanced conversation history analysis
 */
function analyzeConversationHistory(history: ChatMessage[]): string {
  if (history.length === 0) return 'No previous context available.';

  const recentMessages = history.slice(-10); // Analyze last 10 exchanges
  let analysis = 'Recent Interactions:\n';

  // Track conversation flow and patterns
  let userIntents: string[] = [];
  let topicChain: string[] = [];
  let technicalDepth = 0;

  recentMessages.forEach((msg, index) => {
    const isUser = msg.role === 'user';
    const content = msg.content.substring(0, 150) + (msg.content.length > 150 ? '...' : '');
    
    // Analyze message intent and context
    if (isUser) {
      const queryType = determineQueryType(msg.content);
      userIntents.push(queryType);
      
      // Track technical depth
      if (queryType === 'Technical Implementation' || queryType === 'Troubleshooting') {
        technicalDepth++;
      }
      
      analysis += `[User Query] ${content}\n`;
      analysis += `Intent: ${queryType}\n`;
    } else {
      analysis += `[Assistant] Response summary\n`;
    }
  });

  // Add conversation insights
  analysis += '\nConversation Insights:\n';
  analysis += `- Primary Intent Pattern: ${getMostFrequent(userIntents)}\n`;
  analysis += `- Technical Depth Level: ${technicalDepth > 2 ? 'High' : technicalDepth > 0 ? 'Medium' : 'Low'}\n`;
  analysis += `- Conversation Continuity: ${topicChain.length > 1 ? 'Connected' : 'New Topic'}\n`;

  return analysis;
}

/**
 * Helper to get most frequent item in array
 */
function getMostFrequent(arr: string[]): string {
  return arr.sort((a,b) =>
    arr.filter(v => v === a).length - arr.filter(v => v === b).length
  ).pop() || '';
}

/**
 * Enhanced query type determination
 */
function determineQueryType(message: string): QueryType {
  const messageLower = message.toLowerCase();
  
  // Check for temporal queries first (date/time/current state)
  if (CONTEXT_PATTERNS.temporal.some(pattern => messageLower.includes(pattern))) {
    return 'Temporal Query';
  }
  
  // Check other patterns
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
  if (CONTEXT_PATTERNS.installation.some(pattern => messageLower.includes(pattern))) {
    return 'Installation';
  }
  if (CONTEXT_PATTERNS.news.some(pattern => messageLower.includes(pattern))) {
    return 'News Update';
  }
  
  return 'General Query';
}

/**
 * Get enhanced response guidance based on query type
 */
function getResponseGuidance(queryType: QueryType, domain: string): string {
  const guidanceMap: Record<QueryType, string> = {
    'Technical Implementation': `
RESPONSE GUIDELINES:
1. Implementation Focus:
   - Provide clear, step-by-step instructions
   - Include relevant code examples
   - Reference official ${domain} documentation
   - Highlight best practices and pitfalls

2. Technical Accuracy:
   - Verify current ${domain} version compatibility
   - Include error handling considerations
   - Address performance implications
   - Consider security best practices

3. Supporting Context:
   - Link to relevant documentation
   - Provide alternative approaches
   - Include common use cases
   - Address potential challenges`,
    
    'Installation': `
RESPONSE GUIDELINES:
1. Setup Process:
   - Clear prerequisites listing
   - Step-by-step installation guide
   - Environment configuration steps
   - Version compatibility check

2. Validation Steps:
   - Installation verification
   - Common issues prevention
   - Configuration testing
   - Security considerations

3. Additional Context:
   - Alternative installation methods
   - Platform-specific considerations
   - Dependency management
   - Troubleshooting guidance`,

    'News Update': `
RESPONSE GUIDELINES:
1. Information Currency:
   - Latest version details
   - Recent feature updates
   - Security patches
   - Breaking changes

2. Context Integration:
   - Impact assessment
   - Migration guidance
   - Compatibility notes
   - Community feedback

3. Action Items:
   - Update recommendations
   - Required changes
   - Testing suggestions
   - Resource links`,
    
    'Conceptual Understanding': `
RESPONSE GUIDELINES:
1. Explanation Structure:
   - Start with clear definition/overview
   - Use relevant analogies and examples
   - Break down complex concepts
   - Build progressive understanding

2. Supporting Elements:
   - Include real-world examples
   - Reference official specifications
   - Compare with similar concepts
   - Provide visual explanations when helpful

3. Comprehension Check:
   - Address common misconceptions
   - Provide practical applications
   - Include learning resources
   - Offer follow-up guidance`,
    
    'Best Practices': `
RESPONSE GUIDELINES:
1. Current Standards:
   - Focus on latest ${domain} practices
   - Include community consensus
   - Reference industry standards
   - Consider scalability aspects

2. Implementation Guidance:
   - Provide practical examples
   - Include code patterns
   - Address common anti-patterns
   - Consider different contexts

3. Quality Factors:
   - Performance considerations
   - Security implications
   - Maintenance aspects
   - Testing approaches`,
    
    'Troubleshooting': `
RESPONSE GUIDELINES:
1. Problem Analysis:
   - Identify error patterns
   - Consider common causes
   - Check version compatibility
   - Review configuration issues

2. Solution Approach:
   - Provide step-by-step debugging
   - Include verification steps
   - Consider alternative fixes
   - Address root causes

3. Prevention Guidance:
   - Suggest best practices
   - Include monitoring tips
   - Recommend testing approaches
   - Document solutions`,
    
    'Temporal Query': `
RESPONSE GUIDELINES:
1. Time Sensitivity:
   - Provide current date/time context
   - Include timezone awareness
   - Consider temporal relevance
   - Address update frequency

2. Information Currency:
   - Verify source freshness
   - Cross-reference timestamps
   - Include update context
   - Note information validity

3. Forward Guidance:
   - Suggest monitoring approaches
   - Include update channels
   - Reference documentation
   - Note upcoming changes`,
    
    'General Query': `
RESPONSE GUIDELINES:
1. Response Structure:
   - Provide clear overview
   - Include relevant details
   - Support with examples
   - Offer next steps

2. Information Quality:
   - Verify current relevance
   - Include authoritative sources
   - Consider user context
   - Provide additional resources

3. Engagement:
   - Maintain conversational tone
   - Encourage clarification
   - Suggest related topics
   - Offer assistance`
  };

  return guidanceMap[queryType] || guidanceMap['General Query'];
} 