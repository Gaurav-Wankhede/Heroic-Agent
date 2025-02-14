import { ChatMessage } from '../types/chat';
import { DOMAIN_CONFIG } from '../config/domains';
import { isSimilar } from './similarity';

const COMMON_QUESTION_WORDS = [
  'what', 'how', 'why', 'when', 'where', 'which', 'who',
  'can', 'do', 'does', 'is', 'are', 'will', 'would',
  'should', 'could', 'may', 'might', 'must',
  'help', 'tell', 'explain', 'show', 'guide',
  'capabilities', 'features', 'functions', 'abilities'
];

const ERROR_KEYWORDS = [
  'error', 'bug', 'issue', 'problem', 'fail', 'wrong', 
  'incorrect', 'invalid', 'exception', 'crash'
];

// Detect if the message is a general greeting
export function isGeneralGreeting(message: string): boolean {
  const greetings = [
    'hi', 'hello', 'hey', 'good morning', 'good afternoon', 
    'good evening', 'greetings', 'howdy', 'hi there', 'hello there',
    'how are you', 'nice to meet you'
  ];
  const messageLower = message.toLowerCase().trim();
  return greetings.some(greeting => messageLower.includes(greeting)) && 
         messageLower.split(' ').length <= 5;
}

// Check if question is relevant to domain
export function isQuestionRelevant(question: string, domain: string, chatHistory: ChatMessage[] = []): boolean {
  const questionLower = question.toLowerCase().trim();
  
  if (isGeneralGreeting(question)) {
    return true;
  }

  // Be more lenient with the first message
  if (chatHistory.length === 0) {
    return !containsOtherDomainKeywords(question, domain);
  }

  // For subsequent messages, apply stricter validation
  if (chatHistory.length > 3) {
    const lastMessages = chatHistory.slice(-3);
    const isFollowUp = lastMessages.some(msg => {
      const similarity = calculateMessageSimilarity(msg.content, question);
      return similarity > 0.3;
    });

    if (isFollowUp) return true;
  }

  const domainInfo = DOMAIN_CONFIG.get(domain)?.info;
  if (!domainInfo) return true;

  const words = questionLower.split(/\s+/);
  
  // Check for domain-specific keywords
  const hasRelevantKeyword = domainInfo.keywords.some(keyword => {
    if (['latest', 'news', 'update'].includes(keyword)) return false;
    
    const keywordParts = keyword.toLowerCase().split(/\s+/);
    return words.some(word => 
      keywordParts.some(part => isSimilar(word, part, 0.7))
    );
  });

  return hasRelevantKeyword || COMMON_QUESTION_WORDS.some(word => questionLower.startsWith(word));
}

// Check if message contains keywords from other domains
export function containsOtherDomainKeywords(message: string, currentDomain: string): boolean {
  const messageLower = message.toLowerCase();
  const words = messageLower.split(/\s+/);
  
  // Define domain relationships for interconnected topics
  const RELATED_DOMAINS: Record<string, string[]> = {
    'python': ['machine-learning', 'deep-learning', 'nlp', 'sql'],
    'machine-learning': ['python', 'deep-learning', 'nlp'],
    'deep-learning': ['python', 'machine-learning', 'nlp'],
    'nlp': ['python', 'machine-learning', 'deep-learning'],
    'sql': ['python', 'tableau', 'power-bi'],
    'tableau': ['sql', 'power-bi'],
    'power-bi': ['sql', 'tableau'],
    'excel': ['power-bi', 'tableau']
  };

  const relatedDomains = RELATED_DOMAINS[currentDomain] || [];
  
  for (const [domain, config] of DOMAIN_CONFIG.entries()) {
    if (domain === currentDomain || relatedDomains.includes(domain)) continue;
    
    const keywordCount = config.info.keywords.reduce((count, keyword) => {
      if (['latest', 'news', 'update', 'today', 'now', 'help', 'how', 'what', 'why', 'when'].includes(keyword)) return count;
      
      const keywordParts = keyword.toLowerCase().split(/\s+/);
      const hasMatch = words.some(word => 
        keywordParts.some(part => isSimilar(word, part, 0.7))
      );
      
      return hasMatch ? count + 1 : count;
    }, 0);
    
    if (keywordCount >= 3) {
      return true;
    }
  }
  
  return false;
}

export function isErrorQuery(message: string): boolean {
  return ERROR_KEYWORDS.some(keyword => message.toLowerCase().includes(keyword));
} 