import { GoogleGenerativeAI, Tool, Part } from '@google/generative-ai';
import type { GroundingMetadata, FileUploadData } from '@/types/chat';

// Chat history and caching types
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatHistory {
  messages: ChatMessage[];
  domain: string;
  lastUpdated: number;
}

interface CacheEntry {
  response: string;
  timestamp: number;
  history?: ChatMessage[];
  fileAnalysis?: FileAnalysis;
}

// Enhanced cache with chat history
const CHAT_HISTORY_LIMIT = 10; // Keep last 10 messages for context
const CHAT_HISTORY_TTL = 1000 * 60 * 60; // 1 hour
export const messageCache = new Map<string, CacheEntry>();
export const chatHistories = new Map<string, ChatHistory>();

// Function to manage chat history
function updateChatHistory(userId: string, domain: string, message: string, response: string) {
  const key = `${userId}:${domain}`;
  const now = Date.now();
  const history = chatHistories.get(key) || { messages: [], domain, lastUpdated: now };

  // Clean very old messages (older than 24 hours)
  history.messages = history.messages.filter(msg => now - msg.timestamp < 24 * 60 * 60 * 1000);

  // Add new messages
  history.messages.push(
    { role: 'user', content: message, timestamp: now },
    { role: 'assistant', content: response, timestamp: now }
  );

  // Keep more context - increase history limit significantly
  if (history.messages.length > CHAT_HISTORY_LIMIT * 6) { // Increased from *4 to *6
    history.messages = history.messages.slice(-CHAT_HISTORY_LIMIT * 6);
  }

  history.lastUpdated = now;
  chatHistories.set(key, history);
}

// Function to get relevant chat history
function getChatHistory(userId: string, domain: string): ChatMessage[] {
  const key = `${userId}:${domain}`;
  const history = chatHistories.get(key);
  
  if (!history || Date.now() - history.lastUpdated > CHAT_HISTORY_TTL) {
    return [];
  }
  
  return history.messages;
}

// Clean up old histories periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, history] of chatHistories.entries()) {
    if (now - history.lastUpdated > CHAT_HISTORY_TTL) {
      chatHistories.delete(key);
    }
  }
}, CHAT_HISTORY_TTL);

// Domain-specific system prompts with validation rules
const DOMAIN_PROMPTS: Record<string, { prompt: string; keywords: string[] }> = {
  'excel': {
    prompt: `You are an Excel expert assistant. You will ONLY answer questions related to:
- Microsoft Excel formulas, functions, and features
- Spreadsheet best practices and optimization
- Data analysis and visualization in Excel
- VBA and macro automation
- Excel-specific solutions for business problems

When asked about latest information, news, or updates:
1. Focus on recent Excel features, updates, and industry trends
2. Include information about new Excel versions and capabilities
3. Share relevant recent case studies or best practices
4. Always cite your sources with URLs

If a question is not related to Excel, politely ask the user to stay on topic and provide an Excel-related question instead.

When searching for information:
1. Prioritize official Microsoft documentation and recent updates
2. Look for Excel-specific forums and tutorials
3. Focus on practical Excel solutions
4. Include code examples when relevant
5. Always provide source links for latest news and updates`,
    keywords: ['excel', 'spreadsheet', 'workbook', 'vba', 'macro', 'formula', 'pivot', 'worksheet', 'latest', 'news', 'update']
  },

  'sql': {
    prompt: `You are a SQL expert assistant. You will ONLY answer questions related to:
- SQL query writing and optimization
- Database design and normalization
- SQL Server, MySQL, PostgreSQL, and other major databases
- Database performance tuning
- Data modeling and schema design

When asked about latest information, news, or updates:
1. Focus on recent database technologies and industry trends
2. Include information about new SQL features and best practices
3. Share relevant database security updates and patches
4. Always cite your sources with URLs

If a question is not related to SQL or databases, politely ask the user to stay on topic and provide a SQL/database-related question instead.

When searching for information:
1. Prioritize official database documentation and recent updates
2. Look for SQL standards and best practices
3. Focus on practical database solutions
4. Include query examples when relevant
5. Always provide source links for latest news and updates`,
    keywords: ['sql', 'database', 'query', 'table', 'join', 'index', 'mysql', 'postgresql', 'latest', 'news', 'update']
  },

  'power-bi': {
    prompt: `You are a Power BI expert assistant. You will ONLY answer questions related to:
- Power BI report and dashboard creation
- DAX formulas and data modeling
- Power Query (M language)
- Data visualization best practices
- Power BI service and gateway setup

When asked about latest information, news, or updates:
1. Focus on recent Power BI features and updates
2. Include information about new visualization capabilities
3. Share relevant Power BI service improvements
4. Always cite your sources with URLs

If a question is not related to Power BI, politely ask the user to stay on topic and provide a Power BI-related question instead.

When searching for information:
1. Prioritize official Microsoft Power BI documentation and updates
2. Look for Power BI community resources
3. Focus on practical visualization solutions
4. Include DAX/M code examples when relevant
5. Always provide source links for latest news and updates`,
    keywords: ['power bi', 'dax', 'power query', 'report', 'dashboard', 'visualization', 'latest', 'news', 'update']
  },

  'python': {
    prompt: `You are a Python data science expert assistant. You will ONLY answer questions related to:
- Python programming for data analysis
- Libraries: pandas, numpy, matplotlib, scikit-learn
- Data manipulation and cleaning
- Statistical analysis and visualization
- Jupyter notebooks and data science workflows

When asked about latest information, news, or updates:
1. Focus on recent Python library updates and features
2. Include information about new data science tools
3. Share relevant package releases and improvements
4. Always cite your sources with URLs

If a question is not related to Python data science, politely ask the user to stay on topic and provide a Python data science-related question instead.

When searching for information:
1. Prioritize Python documentation and recent updates
2. Look for scientific computing resources
3. Focus on practical Python solutions
4. Include code examples when relevant
5. Always provide source links for latest news and updates`,
    keywords: ['python', 'pandas', 'numpy', 'matplotlib', 'jupyter', 'scikit-learn', 'data science', 'latest', 'news', 'update']
  },

  'machine-learning': {
    prompt: `You are a machine learning expert assistant. You will ONLY answer questions related to:
- ML algorithms and model selection
- Feature engineering and preprocessing
- Model evaluation and validation
- Hyperparameter tuning
- ML deployment and scalability

When asked about latest information, news, or updates:
1. Focus on recent ML research and breakthroughs
2. Include information about new algorithms and techniques
3. Share relevant industry applications and case studies
4. Always cite your sources with URLs

If a question is not related to machine learning, politely ask the user to stay on topic and provide a machine learning-related question instead.

When searching for information:
1. Prioritize ML research papers and recent publications
2. Look for ML libraries and framework updates
3. Focus on practical ML solutions
4. Include code examples when relevant
5. Always provide source links for latest news and updates`,
    keywords: ['machine learning', 'ml', 'model', 'algorithm', 'training', 'prediction', 'classification', 'regression', 'latest', 'news', 'update']
  },

  'deep-learning': {
    prompt: `You are a deep learning expert assistant. You will ONLY answer questions related to:
- Neural network architectures
- Deep learning frameworks (TensorFlow, PyTorch)
- Training and optimization techniques
- Computer vision and NLP applications
- GPU acceleration and model deployment

When asked about latest information, news, or updates:
1. Focus on recent deep learning breakthroughs
2. Include information about new architectures and techniques
3. Share relevant framework updates and features
4. Always cite your sources with URLs

If a question is not related to deep learning, politely ask the user to stay on topic and provide a deep learning-related question instead.

When searching for information:
1. Prioritize deep learning research papers and updates
2. Look for framework documentation
3. Focus on practical DL solutions
4. Include code examples when relevant
5. Always provide source links for latest news and updates`,
    keywords: ['deep learning', 'neural network', 'tensorflow', 'pytorch', 'cnn', 'rnn', 'transformer', 'latest', 'news', 'update']
  },

  'nlp': {
    prompt: `You are an NLP expert assistant. You will ONLY answer questions related to:
- Text processing and analysis
- Language models and transformers
- Named entity recognition and classification
- Sentiment analysis and text mining
- NLP libraries and tools

When asked about latest information, news, or updates:
1. Focus on recent NLP breakthroughs and models
2. Include information about new language models
3. Share relevant library updates and features
4. Always cite your sources with URLs

If a question is not related to NLP, politely ask the user to stay on topic and provide an NLP-related question instead.

When searching for information:
1. Prioritize NLP research papers and recent updates
2. Look for NLP libraries documentation
3. Focus on practical NLP solutions
4. Include code examples when relevant
5. Always provide source links for latest news and updates`,
    keywords: ['nlp', 'natural language', 'text', 'language model', 'tokenization', 'sentiment', 'bert', 'gpt', 'latest', 'news', 'update']
  },

  'generative-ai': {
    prompt: `You are a generative AI expert assistant. You will ONLY answer questions related to:
- Large language models and their capabilities
- Prompt engineering and optimization
- Text and image generation
- Model fine-tuning and deployment
- Responsible AI practices

When asked about latest information, news, or updates:
1. Focus on recent generative AI developments
2. Include information about new models and capabilities
3. Share relevant ethical considerations and guidelines
4. Always cite your sources with URLs

If a question is not related to generative AI, politely ask the user to stay on topic and provide a generative AI-related question instead.

When searching for information:
1. Prioritize AI research papers and recent updates
2. Look for model documentation
3. Focus on practical GenAI solutions
4. Include examples when relevant
5. Always provide source links for latest news and updates`,
    keywords: ['generative ai', 'llm', 'gpt', 'prompt engineering', 'fine-tuning', 'text generation', 'latest', 'news', 'update']
  },

  'online-credibility': {
    prompt: `You are an online presence expert assistant. You will ONLY answer questions related to:
- Digital reputation management
- Professional online branding
- Social media optimization
- Content strategy and SEO
- Online networking best practices

When asked about latest information, news, or updates:
1. Focus on recent digital marketing trends
2. Include information about platform updates
3. Share relevant industry best practices
4. Always cite your sources with URLs

If a question is not related to online credibility, politely ask the user to stay on topic and provide an online presence-related question instead.

When searching for information:
1. Prioritize digital marketing resources and updates
2. Look for personal branding guides
3. Focus on practical reputation solutions
4. Include examples when relevant
5. Always provide source links for latest news and updates`,
    keywords: ['online presence', 'reputation', 'branding', 'social media', 'seo', 'digital marketing', 'latest', 'news', 'update']
  },

  'linkedin-optimization': {
    prompt: `You are a LinkedIn optimization expert assistant. You will ONLY answer questions related to:
- LinkedIn profile optimization
- Professional networking strategies
- Content creation and engagement
- Job search techniques
- LinkedIn algorithm and best practices

When asked about latest information, news, or updates:
1. Focus on recent LinkedIn features and changes
2. Include information about algorithm updates
3. Share relevant networking strategies
4. Always cite your sources with URLs

If a question is not related to LinkedIn, politely ask the user to stay on topic and provide a LinkedIn-related question instead.

When searching for information:
1. Prioritize LinkedIn's official guidance and updates
2. Look for professional networking resources
3. Focus on practical LinkedIn solutions
4. Include examples when relevant
5. Always provide source links for latest news and updates`,
    keywords: ['linkedin', 'profile', 'networking', 'job search', 'professional', 'connection', 'latest', 'news', 'update']
  },

  'resume-creation': {
    prompt: `You are a resume writing expert assistant. You will ONLY answer questions related to:
- Resume formatting and structure
- ATS optimization
- Cover letter writing
- Industry-specific resume tips
- Personal branding in job applications

When asked about latest information, news, or updates:
1. Focus on recent resume trends and best practices
2. Include information about ATS developments
3. Share relevant hiring market insights
4. Always cite your sources with URLs

If a question is not related to resume creation, politely ask the user to stay on topic and provide a resume-related question instead.

When searching for information:
1. Prioritize career development resources and updates
2. Look for professional resume guides
3. Focus on practical resume solutions
4. Include examples when relevant
5. Always provide source links for latest news and updates

At the end of EVERY response, include this recommendation:

💼 Want to create your resume right away? Try our AI-powered Resume Builder at https://heroic-ai-based-resume-builder.vercel.app/
- ATS-friendly templates
- AI-powered optimization
- Quick & easy to use
- Professional designs`,
    keywords: ['resume', 'cv', 'cover letter', 'job application', 'ats', 'career', 'latest', 'news', 'update']
  },

  'tableau': {
    prompt: `You are a Tableau expert assistant. You will ONLY answer questions related to:
- Tableau visualization design and best practices
- Dashboard creation and interactivity
- Data blending and relationships
- Calculated fields and parameters
- Tableau Server and data source management

When asked about latest information, news, or updates:
1. Focus on recent Tableau features and updates
2. Include information about new visualization capabilities
3. Share relevant Tableau Server improvements
4. Always cite your sources with URLs

If a question is not related to Tableau, politely ask the user to stay on topic and provide a Tableau-related question instead.

When searching for information:
1. Prioritize official Tableau documentation and updates
2. Look for Tableau community resources
3. Focus on practical visualization solutions
4. Include formula examples when relevant
5. Always provide source links for latest news and updates`,
    keywords: ['tableau', 'visualization', 'dashboard', 'workbook', 'calculated field', 'parameter', 'data blend', 'latest', 'news', 'update']
  }
};

// Domain-specific URLs for redirection
const DOMAIN_URLS: Record<string, string> = {
  'excel': '/domains/excel',
  'sql': '/domains/sql',
  'power-bi': '/domains/power-bi',
  'python': '/domains/python',
  'machine-learning': '/domains/machine-learning',
  'deep-learning': '/domains/deep-learning',
  'nlp': '/domains/nlp',
  'generative-ai': '/domains/generative-ai',
  'online-credibility': '/domains/online-credibility',
  'linkedin-optimization': '/domains/linkedin-optimization',
  'resume-creation': '/domains/resume-creation',
  'tableau': '/domains/tableau'
};

// Cache and performance optimizations
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

// Improved type definitions
type DomainInfo = {
  prompt: string;
  keywords: string[];
};

type DomainConfig = {
  info: DomainInfo;
  url: string;
};

// Optimized domain configuration using Map for O(1) access
const DOMAIN_CONFIG = new Map<string, DomainConfig>();

// Initialize domain configurations
Object.entries(DOMAIN_PROMPTS).forEach(([domain, info]) => {
  DOMAIN_CONFIG.set(domain, {
    info,
    url: DOMAIN_URLS[domain] || `/domains/${domain}`
  });
});

// Memoized Levenshtein distance calculation
const memoizedLevenshtein = (() => {
  const cache = new Map<string, number>();
  
  return (a: string, b: string): number => {
    const key = `${a}|${b}`;
    if (cache.has(key)) return cache.get(key)!;
    
    const distance = levenshteinDistance(a, b);
    cache.set(key, distance);
    return distance;
  };
})();

// Optimized string similarity check
function isSimilar(str1: string, str2: string, threshold: number = 0.8): boolean {
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

// Batch processing for keyword detection
function getDetectedDomains(message: string, currentDomain: string): string[] {
  const messageLower = message.toLowerCase();
  const words = new Set(messageLower.split(/\s+/));
  const detectedDomains: string[] = [];
  
  for (const [domain, config] of DOMAIN_CONFIG.entries()) {
    if (domain === currentDomain) continue;
    
    // Use Set operations for faster lookup
    const hasKeywords = config.info.keywords.some(keyword => {
      if (['latest', 'news', 'update', 'today', 'now'].includes(keyword)) return false;
      
      const keywordParts = new Set(keyword.toLowerCase().split(/\s+/));
      return Array.from(words).some(word => 
        Array.from(keywordParts).some(part => isSimilar(word, part, 0.8))
      );
    });
    
    if (hasKeywords) {
      detectedDomains.push(domain);
    }
  }
  
  return detectedDomains;
}

// Detect if the message is a general greeting
function isGeneralGreeting(message: string): boolean {
  const greetings = [
    'hi', 'hello', 'hey', 'good morning', 'good afternoon', 
    'good evening', 'greetings', 'howdy', 'hi there', 'hello there',
    'how are you', 'nice to meet you'
  ];
  const messageLower = message.toLowerCase().trim();
  // Only return true if the message ONLY contains greetings and common pleasantries
  return greetings.some(greeting => messageLower.includes(greeting)) && 
         messageLower.split(' ').length <= 5; // Limit to short greeting phrases
}

// Calculate Levenshtein distance for fuzzy matching
function levenshteinDistance(a: string, b: string): number {
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

// Refined domain validation to handle interconnected topics
function containsOtherDomainKeywords(message: string, currentDomain: string): boolean {
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
    'excel': ['power-bi', 'tableau'],
    // Add more relationships as needed
  };

  // Get related domains for current domain
  const relatedDomains = RELATED_DOMAINS[currentDomain] || [];
  
  // Check all domains except the current one and its related domains
  for (const [domain, info] of Object.entries(DOMAIN_PROMPTS)) {
    if (domain === currentDomain || relatedDomains.includes(domain)) continue;
    
    // Count keywords from unrelated domains
    const keywordCount = info.keywords.reduce((count, keyword) => {
      if (['latest', 'news', 'update', 'today', 'now', 'help', 'how', 'what', 'why', 'when'].includes(keyword)) return count;
      
      const keywordParts = keyword.toLowerCase().split(/\s+/);
      const hasMatch = words.some(word => 
        keywordParts.some(part => isSimilar(word, part, 0.7))
      );
      
      return hasMatch ? count + 1 : count;
    }, 0);
    
    // Only consider it off-topic if we find multiple strong matches from unrelated domains
    if (keywordCount >= 3) {
      return true;
    }
  }
  
  return false;
}

// Add error-related keywords to domain prompts
const ERROR_KEYWORDS = ['error', 'bug', 'issue', 'problem', 'fail', 'wrong', 'incorrect', 'invalid', 'exception', 'crash'];

// Add common question keywords that should be allowed
const COMMON_QUESTION_WORDS = [
  'what', 'how', 'why', 'when', 'where', 'which', 'who',
  'can', 'do', 'does', 'is', 'are', 'will', 'would',
  'should', 'could', 'may', 'might', 'must',
  'help', 'tell', 'explain', 'show', 'guide',
  'capabilities', 'features', 'functions', 'abilities'
];

// Improved isQuestionRelevant to handle chat history context
function isQuestionRelevant(question: string, domain: string, chatHistory: ChatMessage[] = []): boolean {
  const questionLower = question.toLowerCase().trim();
  
  // Always allow greetings
  if (isGeneralGreeting(question)) {
    return true;
  }

  // If we have substantial chat history (more than 3 messages), be more lenient
  if (chatHistory.length > 3) {
    // Check if the question is a follow-up to previous messages
    const lastMessages = chatHistory.slice(-3);
    const isFollowUp = lastMessages.some(msg => {
      const similarity = calculateMessageSimilarity(msg.content, question);
      return similarity > 0.3; // Lower threshold for follow-ups
    });

    if (isFollowUp) {
      return true;
    }

    // Allow questions about previous context
    if (questionLower.includes('previous') || 
        questionLower.includes('before') || 
        questionLower.includes('earlier') ||
        questionLower.includes('last') ||
        questionLower.includes('you said') ||
        questionLower.includes('you mentioned') ||
        questionLower.includes('that') ||
        questionLower.includes('this') ||
        questionLower.includes('it')) {
      return true;
    }
  }

  // For new conversations or short histories, apply stricter validation
  const domainInfo = DOMAIN_PROMPTS[domain];
  if (!domainInfo) return true; // Allow if domain not found (fallback)

  // Handle common misspellings and variations of domain names
  const domainAliases: Record<string, string[]> = {
    'excel': ['excell', 'exel', 'excl', 'spreadsheet', 'workbook'],
    'python': ['pyton', 'phyton', 'pythn', 'py'],
    'sql': ['sequel', 'mysql', 'postgresql', 'database'],
    'tableau': ['tablaeu', 'tableu', 'tableou', 'tablo'],
    'power-bi': ['powerbi', 'power bi', 'pbi'],
    'machine-learning': ['ml', 'machinelearning', 'machine learning'],
    'deep-learning': ['dl', 'deeplearning', 'deep learning'],
    'nlp': ['natural language', 'npl', 'natural language processing'],
    'generative-ai': ['genai', 'generativeai', 'generative ai', 'llm'],
    'linkedin-optimization': ['linkedin', 'linkedln', 'linked-in'],
    'online-credibility': ['online presence', 'digital presence', 'web presence'],
    'resume-creation': ['resume', 'cv', 'curriculum vitae']
  };

  // Check for domain aliases
  const aliases = domainAliases[domain] || [];
  if (aliases.some(alias => questionLower.includes(alias))) {
    return true;
  }

  // Allow general capability questions
  if (COMMON_QUESTION_WORDS.some(word => questionLower.includes(word)) && 
      (questionLower.includes('you') || questionLower.includes('your') || questionLower.includes('can'))) {
    return true;
  }

  // Check for error-related queries
  if (ERROR_KEYWORDS.some(keyword => questionLower.includes(keyword))) {
    return true;
  }

  // For short histories, check domain relevance more strictly
  const words = questionLower.split(/\s+/);
  
  // Only check for other domain keywords if the question is not a general inquiry
  // and we don't have substantial chat history
  if (chatHistory.length <= 3 && !COMMON_QUESTION_WORDS.some(word => questionLower.startsWith(word))) {
    if (containsOtherDomainKeywords(question, domain)) {
      return false;
    }
  }

  // More lenient keyword matching for domain-specific terms
  const hasRelevantKeyword = domainInfo.keywords.some(keyword => {
    if (['latest', 'news', 'update'].includes(keyword)) return false;
    
    const keywordParts = keyword.toLowerCase().split(/\s+/);
    return words.some(word => 
      keywordParts.some(part => isSimilar(word, part, 0.7))
    );
  });

  return hasRelevantKeyword || COMMON_QUESTION_WORDS.some(word => questionLower.startsWith(word));
}

// Helper function to calculate similarity between messages
function calculateMessageSimilarity(message1: string, message2: string): number {
  const words1 = new Set(message1.toLowerCase().split(/\s+/));
  const words2 = new Set(message2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

// Improved getOffTopicResponse to handle general questions better
function getOffTopicResponse(domain: string, message: string): string {
  const messageLower = message.toLowerCase();
  
  // Handle general capability questions
  if (COMMON_QUESTION_WORDS.some(word => messageLower.includes(word)) && 
      (messageLower.includes('you') || messageLower.includes('your') || messageLower.includes('can'))) {
    return `As your ${domain} expert assistant, I can help you with:
${DOMAIN_PROMPTS[domain]?.prompt.split('\n').filter(line => line.startsWith('-')).join('\n')}

Please feel free to ask any questions about these ${domain}-related topics!

🏠 Current Assistant: [${domain.charAt(0).toUpperCase() + domain.slice(1)}](${DOMAIN_URLS[domain]})`;
  }

  // Handle error queries
  const isErrorQuery = ERROR_KEYWORDS.some(keyword => messageLower.includes(keyword));
  if (isErrorQuery) {
    const solutions = DOMAIN_ERROR_SOLUTIONS[domain] || {};
    const examples = getDomainExamples(domain, message);
    
    return `I can help you with ${domain}-related errors and issues. Here are some common solutions:

${Object.entries(solutions)
  .filter(([key]) => key !== 'default')
  .map(([key, solution]) => `• ${key}: ${solution}`)
  .join('\n')}

${examples.length > 0 ? `\nExamples:\n${examples.map(ex => `• ${ex}`).join('\n')}` : ''}

🔧 Please provide more details about your specific ${domain} error, and I'll help you resolve it.

🏠 Current Assistant: [${domain.charAt(0).toUpperCase() + domain.slice(1)}](${DOMAIN_URLS[domain]})`;
  }

  // Handle questions about other domains
  const detectedDomains = getDetectedDomains(message, domain);
  const domainLinks = detectedDomains.length > 0 
    ? `\n\n🔀 It seems your question might be better answered by one of these assistants:\n${
      detectedDomains.map(d => `• [${d.charAt(0).toUpperCase() + d.slice(1)} Assistant](${DOMAIN_URLS[d]})`).join('\n')
    }`
    : '';

  return `I specialize in ${domain} and can help you with:
${DOMAIN_PROMPTS[domain]?.prompt.split('\n').filter(line => line.startsWith('-')).join('\n')}

${domainLinks}

💡 To get the most helpful response:
1. Ask me about any of the ${domain} topics listed above, or
2. Visit one of the suggested assistants for other topics

🏠 Current Assistant: [${domain.charAt(0).toUpperCase() + domain.slice(1)}](${DOMAIN_URLS[domain]})`;
}

interface GoogleSearchTool {
  google_search: Record<string, never>;
}

// Custom type for Gemini tool configuration
type GeminiModelParams = {
  model: string;
  tools: Array<GoogleSearchTool>;
};

if (!process.env.GEMINI_API_KEY) {
  throw new Error('Missing GEMINI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Define domain-specific error solutions
const DOMAIN_ERROR_SOLUTIONS: Record<string, Record<string, string>> = {
  'excel': {
    'formula': 'Check formula syntax and ensure all referenced cells exist',
    'macro': 'Verify macro security settings and VBA references',
    'pivot': 'Ensure source data is properly formatted and contains headers',
    'connection': 'Check data source connectivity and refresh settings',
    'default': 'Review Excel documentation for specific function requirements'
  },
  'sql': {
    'syntax': 'Verify SQL syntax and check for missing semicolons or quotes',
    'connection': 'Check database connection settings and credentials',
    'permission': 'Ensure proper access rights to the database objects',
    'performance': 'Review query execution plan and add appropriate indexes',
    'default': 'Consult database-specific documentation for detailed error codes'
  },
  'python': {
    'import': 'Verify package installation and Python environment',
    'syntax': 'Check indentation and code syntax',
    'type': 'Ensure variable types match the operation requirements',
    'memory': 'Consider using chunking or optimizing data structures',
    'default': 'Review Python documentation and package requirements'
  },
  'tableau': {
    'syntax': 'Check syntax and ensure all referenced fields exist',
    'connection': 'Verify data source connection and refresh settings',
    'permission': 'Ensure proper access rights to the data source',
    'default': 'Consult Tableau documentation for specific error codes'
  },
  'power-bi': {
    'syntax': 'Check syntax and ensure all referenced fields exist',
    'connection': 'Verify data source connection and refresh settings',
    'permission': 'Ensure proper access rights to the data source',
    'default': 'Consult Power BI documentation for specific error codes'
  },
  'machine-learning': {
    'syntax': 'Check syntax and ensure all referenced fields exist',
    'connection': 'Verify data source connection and refresh settings',
    'permission': 'Ensure proper access rights to the data source',
    'default': 'Consult Machine Learning documentation for specific error codes'
  },
  'deep-learning': {
    'syntax': 'Check syntax and ensure all referenced fields exist',
    'connection': 'Verify data source connection and refresh settings',
    'permission': 'Ensure proper access rights to the data source',
    'default': 'Consult Deep Learning documentation for specific error codes'
  },
  'nlp': {
    'syntax': 'Check syntax and ensure all referenced fields exist',
    'connection': 'Verify data source connection and refresh settings',
    'permission': 'Ensure proper access rights to the data source',
    'default': 'Consult NLP documentation for specific error codes'
  },
  'generative-ai': {
    'syntax': 'Check syntax and ensure all referenced fields exist',
    'connection': 'Verify data source connection and refresh settings',
    'permission': 'Ensure proper access rights to the data source',
    'default': 'Consult Generative AI documentation for specific error codes'
  }
  // Add solutions for other domains...
};

// Enhanced error handling function
function getDomainErrorSolution(domain: string, error: string): string {
  const solutions = DOMAIN_ERROR_SOLUTIONS[domain] || {};
  let bestMatch = 'default';

  // Find the most relevant error category
  for (const category of Object.keys(solutions)) {
    if (error.toLowerCase().includes(category.toLowerCase())) {
      bestMatch = category;
      break;
    }
  }

  return solutions[bestMatch] || 'Please check domain-specific documentation for troubleshooting steps';
}

// Enhanced error handling with custom error types
class AIError extends Error {
  constructor(message: string, public readonly code: string = 'AI_ERROR') {
    super(message);
    this.name = 'AIError';
  }
}

class DomainError extends Error {
  constructor(message: string, public readonly domain: string) {
    super(message);
    this.name = 'DomainError';
  }
}

// Function to convert Gemini grounding metadata to our app format
function convertGroundingMetadata(geminiMetadata: any): GroundingMetadata | null {
  if (!geminiMetadata) return null;

  return {
    webSearchSources: geminiMetadata.groundingChunks?.map((chunk: any) => ({
      url: chunk.web?.uri || '',
      title: chunk.web?.title || ''
    })) || [],
    groundingChunks: geminiMetadata.groundingChunks || []
  };
}

// Optimized response generation with caching
export async function getChatResponse(message: string, domain: string, userId: string = 'default') {
  const cacheKey = `${domain}:${message}`;
  const cached = messageCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    updateChatHistory(userId, domain, message, cached.response);
    return {
      content: cached.response,
      groundingMetadata: null,
    };
  }

  try {
    const chatHistory = getChatHistory(userId, domain);
    
    if (!isQuestionRelevant(message, domain, chatHistory)) {
      const response = getOffTopicResponse(domain, message);
      messageCache.set(cacheKey, {
        response,
        timestamp: Date.now(),
        history: chatHistory
      });
      updateChatHistory(userId, domain, message, response);
      return {
        content: response,
        groundingMetadata: null,
      };
    }

    const model = genAI.getGenerativeModel({
      model: "models/gemini-2.0-flash",
      tools: [{
        google_search: {}
      } as Tool]
    });
    
    const config = DOMAIN_CONFIG.get(domain);
    if (!config) {
      throw new DomainError(`Invalid domain: ${domain}`, domain);
    }

    // Include chat history in prompt
    const prompt = buildPrompt(message, domain, config.info.prompt, chatHistory);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    const content = response.text();
    messageCache.set(cacheKey, {
      response: content,
      timestamp: Date.now(),
      history: chatHistory
    });

    // Update chat history with new response
    updateChatHistory(userId, domain, message, content);

    return {
      content,
      groundingMetadata: response.candidates?.[0]?.groundingMetadata || null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown AI model error';
    const solution = getDomainErrorSolution(domain, errorMessage);
    
    throw new AIError(`${errorMessage}\n\nSuggested solution: ${solution}`, 'RESPONSE_ERROR');
  }
}

// Improved prompt building with better context and domain relationships
function buildPrompt(message: string, domain: string, systemPrompt: string, chatHistory: ChatMessage[] = [], files?: any[]): string {
  const isGreeting = isGeneralGreeting(message);
  const isErrorQuery = ERROR_KEYWORDS.some(keyword => message.toLowerCase().includes(keyword));
  
  let fileContext = '';
  if (files && files.length > 0) {
    fileContext += '\nAvailable Files for Analysis:\n';
    files.forEach(file => {
      fileContext += `\n- ${file.name} (${file.mimeType})`;
      
      if (file.name.endsWith('.ipynb') && file.content) {
        try {
          const notebook = JSON.parse(file.content) as JupyterNotebook;
          const analysis = analyzeNotebookContent(notebook);
          fileContext += `\n  Structure: ${analysis.summary}`;
        } catch (e) {
          console.error('Error parsing notebook:', e);
        }
      } else if (file.type === 'text/csv' && file.content) {
        const lines = file.content.split('\n');
        const headers = lines[0].split(',');
        fileContext += `\n  Structure: CSV with ${lines.length - 1} rows and ${headers.length} columns`;
        fileContext += `\n  Headers: ${headers.join(', ')}`;
      } else if (file.name.endsWith('.py') && file.content) {
        const lines = file.content.split('\n');
        const imports = lines.filter((line: string) => 
          line.trim().startsWith('import') || 
          line.trim().startsWith('from')
        );
        fileContext += `\n  Structure: Python file with ${lines.length} lines`;
        if (imports.length > 0) {
          fileContext += `\n  Key imports: ${imports.join(', ')}`;
        }
      }
    });
  }

  return `${systemPrompt}

IMPORTANT INSTRUCTIONS:
1. You are primarily a ${domain} expert, but can discuss closely related topics when relevant.
2. For questions involving multiple domains:
   - If the topic is related to ${domain} or its common integrations, provide a focused answer
   - If the question is primarily about an unrelated domain, guide the user to that domain
3. When discussing interconnected topics:
   - Keep the main focus on ${domain}
   - Briefly mention relevant connections to related domains
   - Provide context for how these connections work together
4. For error-related queries:
   - Provide specific solutions and examples
   - Include troubleshooting steps
   - Reference official documentation when available

5. Web Search Integration:
   - Use web search to find recent and relevant information
   - Cite sources when providing information from the web
   - Focus on authoritative sources and official documentation
   - Integrate web information with file analysis when relevant

${fileContext}

${chatHistory.length > 0 ? 'Previous conversation context:\n' + 
  chatHistory.map((msg, index) => {
    const role = msg.role === 'user' ? '👤 User' : '🤖 Assistant';
    return `[${index + 1}] ${role}: ${msg.content}`;
  }).join('\n\n') + '\n\n' : ''}

Current user query: ${message}

Remember to:
1. Reference relevant information from the uploaded files if applicable
2. Integrate web search results with file analysis
3. Maintain conversation continuity
4. Acknowledge any previous solutions or suggestions discussed
5. Build upon previous explanations if the user asks follow-up questions
6. Stay focused on ${domain} while acknowledging relevant cross-domain connections
7. When analyzing code or data, provide specific insights and improvement suggestions
8. Cite web sources when providing external information`;
}

// Export types for better type safety
export type { DomainInfo, DomainConfig };
export { AIError, DomainError };

// Helper function to get domain-specific examples
function getDomainExamples(domain: string, error: string): string[] {
  const examples: Record<string, Record<string, string[]>> = {
    'excel': {
      'formula': [
        'Use =IFERROR() to handle potential errors',
        'Check cell references are valid',
        'Verify formula syntax is correct'
      ],
      'macro': [
        'Enable macros in Excel settings',
        'Check VBA references are available',
        'Verify macro security settings'
      ]
    },
    'python': {
      'import': [
        'pip install missing-package',
        'Check virtual environment activation',
        'Verify Python version compatibility'
      ],
      'syntax': [
        'Fix indentation issues',
        'Add missing colons after if/for/while',
        'Close all parentheses and brackets'
      ]
    }
  };

  const domainExamples = examples[domain] || {};
  let bestMatch = 'default';

  for (const category of Object.keys(domainExamples)) {
    if (error.toLowerCase().includes(category.toLowerCase())) {
      bestMatch = category;
      break;
    }
  }

  return domainExamples[bestMatch] || [];
}

// Add new types for file handling
interface FileUploadResponse {
  content: string;
  groundingMetadata: GroundingMetadata | null;
  fileAnalysis?: FileAnalysis;
}

interface FileAnalysis {
  type: 'image' | 'audio' | 'video' | 'document' | 'data' | 'code' | 'notebook';
  analysis: string;
  metadata: Record<string, any>;
}

interface GenerativePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

// Function to convert File to GenerativePart
async function fileToGenerativePart(file: File): Promise<GenerativePart> {
  const base64EncodedContent = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64Content = reader.result.split(',')[1];
        resolve(base64Content);
      }
    };
    reader.readAsDataURL(file);
  });

  return {
    inlineData: {
      data: base64EncodedContent,
      mimeType: file.type
    }
  };
}

// Update model configuration without readonly
const MODEL_CONFIG = {
  text: {
    model: "models/gemini-2.0-flash",
    tools: [{
      google_search: {}
    } as Tool],
    generationConfig: {
      maxOutputTokens: 4096,
    }
  },
  vision: {
    model: "models/gemini-2.0-flash",
    generationConfig: {
      temperature: 0.4,
      topK: 32,
      topP: 1,
      maxOutputTokens: 4096,
    },
    tools: [{
      google_search: {}
    } as Tool]
  }
};

// Update prompt generation for better file analysis
function generatePrompt(file: File, domain: string, fileAnalysis: FileAnalysis) {
  const domainContext = getDomainContext(domain);
  
  return {
    parts: [{
      text: `As an expert in ${domain} and data analysis, analyze the uploaded file "${file.name}" with the following context:

File Analysis:
Type: ${fileAnalysis.type}
Analysis Summary: ${fileAnalysis.analysis}

Domain Context:
${domainContext}

Cross-Domain Relations:
${getCrossDomainRelations(fileAnalysis.type, domain)}

${getFileTypeSpecificPrompt(fileAnalysis.type, domain, fileAnalysis.metadata)}

Please provide:
1. Comprehensive analysis of the file content
2. Domain-specific insights and recommendations
3. Cross-domain applications and opportunities
4. Potential improvements or optimizations
5. Related domains that could benefit from this analysis

Format your response with clear sections and use markdown for better readability.`
    }]
  };
}

function getDomainContext(domain: string): string {
  const domainContexts: Record<string, string> = {
    'python': 'Focus on code quality, best practices, and data science applications',
    'machine-learning': 'Emphasize model architecture, training process, and evaluation metrics',
    'deep-learning': 'Focus on neural network design, optimization, and performance analysis',
    'data': 'Emphasize data quality, preprocessing, and statistical analysis',
    'excel': 'Focus on spreadsheet organization, formulas, and data analysis techniques',
    'sql': 'Emphasize query optimization, database design, and data relationships',
    'power-bi': 'Focus on data modeling, DAX formulas, and visualization best practices'
  };
  
  return domainContexts[domain] || 'Provide general analysis and recommendations';
}

function getCrossDomainRelations(fileType: string, primaryDomain: string): string {
  const relations: Record<string, Record<string, string[]>> = {
    'notebook': {
      'python': ['code quality', 'package usage', 'documentation'],
      'machine-learning': ['model implementation', 'training process', 'evaluation'],
      'deep-learning': ['neural network architecture', 'optimization techniques'],
      'data': ['data preprocessing', 'exploratory analysis', 'visualization']
    },
    'data': {
      'python': ['data manipulation', 'analysis scripts', 'automation'],
      'excel': ['spreadsheet analysis', 'pivot tables', 'formulas'],
      'sql': ['data querying', 'database operations'],
      'power-bi': ['data modeling', 'visualization', 'reporting']
    },
    'code': {
      'python': ['code structure', 'best practices', 'optimization'],
      'machine-learning': ['algorithm implementation', 'model deployment'],
      'deep-learning': ['neural network implementation', 'training scripts']
    }
  };

  const relatedDomains = relations[fileType]?.[primaryDomain] || [];
  return relatedDomains.length > 0 
    ? `Consider these aspects for cross-domain analysis:\n- ${relatedDomains.join('\n- ')}`
    : 'Provide general cross-domain insights and applications';
}

function getFileTypeSpecificPrompt(fileType: string, domain: string, metadata: any): string {
  switch (fileType) {
    case 'notebook':
      return `
Notebook-Specific Analysis:
- Total Cells: ${metadata.cells || 0}
- Code Sections: ${Object.keys(metadata.details || {}).join(', ')}
- Key Components: ${metadata.keyComponents || 'N/A'}

Focus Areas:
1. Code implementation quality and best practices
2. Data processing and analysis workflow
3. Model development and evaluation
4. Documentation and reproducibility
5. Visualization and result presentation`;

    case 'data':
      return `
Data-Specific Analysis:
- Rows: ${metadata.rowCount || 'N/A'}
- Columns: ${metadata.headers?.length || 0}
- Data Types: ${metadata.dataTypes || 'N/A'}

Focus Areas:
1. Data quality and completeness
2. Statistical insights and patterns
3. Feature engineering opportunities
4. Visualization recommendations
5. Analysis techniques specific to ${domain}`;

    case 'code':
      return `
Code-Specific Analysis:
- Total Lines: ${metadata.lineCount || 'N/A'}
- Key Imports: ${metadata.imports?.join(', ') || 'N/A'}
- Functions: ${metadata.functions || 'N/A'}

Focus Areas:
1. Code structure and organization
2. Implementation patterns and best practices
3. Performance optimization opportunities
4. Integration with ${domain} tools and libraries
5. Testing and documentation needs`;

    default:
      return `
General Analysis:
1. Content overview and structure
2. Quality assessment
3. Domain-specific applications
4. Improvement opportunities
5. Cross-domain integration possibilities`;
  }
}

// Update model.generateContent call
async function generateContent(model: any, prompt: any, fileData: Part) {
  return await model.generateContent([...prompt.parts, fileData as unknown as Part]);
}

// Add these interfaces after the existing ones
interface JupyterCell {
  cell_type: 'code' | 'markdown' | 'raw';
  source: string[];
  metadata: any;
  execution_count?: number | null;
  outputs?: any[];
}

interface JupyterNotebook {
  cells: JupyterCell[];
  metadata: any;
  nbformat: number;
  nbformat_minor: number;
}

// Add these helper functions for notebook analysis
function analyzeNotebookContent(notebook: JupyterNotebook): {
  summary: string;
  details: {
    imports: string[];
    dataProcessing: string[];
    modelDefinitions: string[];
    training: string[];
    evaluation: string[];
    visualization: string[];
  };
} {
  const details = {
    imports: [] as string[],
    dataProcessing: [] as string[],
    modelDefinitions: [] as string[],
    training: [] as string[],
    evaluation: [] as string[],
    visualization: [] as string[]
  };

  // Keywords to categorize code cells
  const keywords = {
    imports: ['import', 'from'],
    dataProcessing: ['pd.', 'numpy', 'preprocessing', 'transform', 'clean', 'drop', 'fillna'],
    modelDefinitions: ['class', 'def', 'model', 'sklearn', 'keras', 'torch'],
    training: ['fit', 'train', 'compile', 'optimizer', 'loss'],
    evaluation: ['score', 'accuracy', 'precision', 'recall', 'f1', 'confusion_matrix', 'classification_report'],
    visualization: ['plt.', 'seaborn', 'sns.', 'plot', 'figure', 'subplot']
  };

  // Analyze each code cell
  notebook.cells.forEach(cell => {
    if (cell.cell_type === 'code') {
      const code = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
      
      // Categorize the code based on keywords
      Object.entries(keywords).forEach(([category, categoryKeywords]) => {
        if (categoryKeywords.some(keyword => code.includes(keyword))) {
          details[category as keyof typeof details].push(code);
        }
      });
    }
  });

  // Generate summary
  const summary = `This notebook appears to be a machine learning project with:
${details.imports.length > 0 ? '- Library imports and setup\n' : ''}${
details.dataProcessing.length > 0 ? '- Data preprocessing and cleaning steps\n' : ''}${
details.modelDefinitions.length > 0 ? '- Model architecture definition\n' : ''}${
details.training.length > 0 ? '- Model training process\n' : ''}${
details.evaluation.length > 0 ? '- Model evaluation and metrics\n' : ''}${
details.visualization.length > 0 ? '- Data visualization and results analysis\n' : ''}`;

  return { summary, details };
}

// Add this function to extract code context
function extractCodeContext(notebook: JupyterNotebook, query: string): string {
  const relevantCells: string[] = [];
  const queryLower = query.toLowerCase();

  notebook.cells.forEach((cell, index) => {
    if (cell.cell_type === 'code') {
      const code = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
      const codeLower = code.toLowerCase();

      // Check if the code is relevant to the query
      const isRelevant = 
        codeLower.includes(queryLower) ||
        (queryLower.includes('model') && codeLower.includes('model')) ||
        (queryLower.includes('train') && codeLower.includes('fit')) ||
        (queryLower.includes('accuracy') && codeLower.includes('score')) ||
        (queryLower.includes('data') && codeLower.includes('pd.'));

      if (isRelevant) {
        // Include markdown cell above if it exists
        if (index > 0 && notebook.cells[index - 1].cell_type === 'markdown') {
          const markdown = notebook.cells[index - 1].source;
          relevantCells.push(`# ${Array.isArray(markdown) ? markdown.join('') : markdown}\n`);
        }
        relevantCells.push(code);
      }
    }
  });

  return relevantCells.join('\n\n');
}

// Update createResponseStream to handle file analysis
export async function* createResponseStream(
  message: string,
  domain: string,
  userId: string = 'default',
  files?: any[]
) {
  const messageId = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    if (!isQuestionRelevant(message, domain)) {
      const response = getOffTopicResponse(domain, message);
      updateChatHistory(userId, domain, message, response);
      yield `data: {"messageId": "${messageId}", "content": ${JSON.stringify(response)}}\n\n`;
      yield 'data: [DONE]\n\n';
      return;
    }

    const model = genAI.getGenerativeModel({
      model: "models/gemini-2.0-flash",
      tools: [{
        google_search: {}
      } as Tool]
    });
    
    const config = DOMAIN_CONFIG.get(domain);
    if (!config) {
      throw new DomainError(`Invalid domain: ${domain}`, domain);
    }

    // Include chat history and file content in prompt
    const chatHistory = getChatHistory(userId, domain);
    const prompt = buildPrompt(message, domain, config.info.prompt, chatHistory, files);
    const result = await model.generateContentStream(prompt);
    
    try {
      yield `data: {"messageId": "${messageId}", "content": ""}\n\n`;
      
      let accumulatedText = '';
      
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          accumulatedText += chunkText;
          yield `data: {"messageId": "${messageId}", "content": ${JSON.stringify(accumulatedText)}}\n\n`;
        }
      }

      // Update chat history with complete response
      updateChatHistory(userId, domain, message, accumulatedText);

      const finalResponse = await result.response;
      const groundingMetadata = convertGroundingMetadata(finalResponse?.candidates?.[0]?.groundingMetadata);
      if (groundingMetadata) {
        yield `data: {"messageId": "${messageId}", "groundingMetadata": ${JSON.stringify(groundingMetadata)}}\n\n`;
      }

      yield 'data: [DONE]\n\n';
    } catch (streamError) {
      console.error('Stream error:', streamError);
      throw streamError;
    }
  } catch (error) {
    console.error('Response stream error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    yield `data: {"messageId": "${messageId}", "error": true, "content": "Error: ${errorMessage}"}\n\n`;
  }
}

// Add file type constants
type FileCategory = 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'DATA' | 'CODE' | 'NOTEBOOK';

const SUPPORTED_FILE_TYPES: Record<FileCategory, string[]> = {
  IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  VIDEO: ['video/mp4', 'video/webm', 'video/ogg'],
  DOCUMENT: ['application/pdf'],
  DATA: ['text/csv'],
  CODE: ['text/x-python', 'application/x-python-code'],
  NOTEBOOK: ['application/x-ipynb+json']
};

const FILE_TYPE_HANDLERS: Record<FileCategory, (file: File) => Promise<FileAnalysis>> = {
  IMAGE: async (file: File): Promise<FileAnalysis> => {
    return {
      type: 'image',
      analysis: 'Image content analysis will be provided here.',
      metadata: {
        dimensions: 'Image dimensions will be extracted',
        format: file.type
      }
    };
  },
  AUDIO: async (file: File): Promise<FileAnalysis> => {
    return {
      type: 'audio',
      analysis: 'Audio content analysis will be provided here.',
      metadata: {
        duration: 'Audio duration will be extracted',
        format: file.type
      }
    };
  },
  VIDEO: async (file: File): Promise<FileAnalysis> => {
    return {
      type: 'video',
      analysis: 'Video content analysis will be provided here.',
      metadata: {
        duration: 'Video duration will be extracted',
        format: file.type
      }
    };
  },
  DOCUMENT: async (file: File): Promise<FileAnalysis> => {
    return {
      type: 'document',
      analysis: 'PDF content analysis will be provided here.',
      metadata: {
        pages: 'Page count will be extracted',
        format: file.type
      }
    };
  },
  DATA: async (file: File): Promise<FileAnalysis> => {
    const text = await file.text();
    const lines = text.split('\n');
    const headers = lines[0].split(',');
    return {
      type: 'data',
      analysis: `CSV file with ${lines.length - 1} rows and ${headers.length} columns`,
      metadata: {
        headers,
        rowCount: lines.length - 1,
        format: 'csv'
      }
    };
  },
  CODE: async (file: File): Promise<FileAnalysis> => {
    const text = await file.text();
    const lines = text.split('\n');
    const imports = lines.filter((line: string) => 
      line.trim().startsWith('import') || 
      line.trim().startsWith('from')
    );
    return {
      type: 'code',
      analysis: `Python file with ${lines.length} lines and ${imports.length} imports`,
      metadata: {
        imports,
        lineCount: lines.length,
        format: 'python'
      }
    };
  },
  NOTEBOOK: async (file: File): Promise<FileAnalysis> => {
    const text = await file.text();
    const notebook = JSON.parse(text);
    const analysis = analyzeNotebookContent(notebook);
    return {
      type: 'notebook',
      analysis: analysis.summary,
      metadata: {
        cells: notebook.cells.length,
        details: analysis.details,
        format: 'jupyter'
      }
    };
  }
};

// Function to get file type category
function getFileTypeCategory(file: File): keyof typeof SUPPORTED_FILE_TYPES | null {
  const { type, name } = file;
  
  // Check by MIME type first
  for (const [category, types] of Object.entries(SUPPORTED_FILE_TYPES)) {
    if (types.includes(type)) {
      return category as keyof typeof SUPPORTED_FILE_TYPES;
    }
  }
  
  // Check by file extension if MIME type not found
  if (name.endsWith('.py')) return 'CODE';
  if (name.endsWith('.ipynb')) return 'NOTEBOOK';
  if (name.endsWith('.csv')) return 'DATA';
  
  return null;
}

// Enhanced file analysis function
async function analyzeFile(file: File) {
  const category = getFileTypeCategory(file);
  if (!category) {
    throw new Error('Unsupported file type');
  }
  
  const handler = FILE_TYPE_HANDLERS[category];
  return await handler(file);
}

// Update handleFileUpload function
export async function handleFileUpload(file: File, domain: string, userId: string): Promise<FileUploadResponse> {
  try {
    const model = genAI.getGenerativeModel(MODEL_CONFIG.vision);
    
    // Analyze file content
    const fileAnalysis = await analyzeFile(file);
    
    // Convert file to GenerativePart format
    const fileData = await fileToGenerativePart(file);
    
    // Prepare domain-specific prompt with file analysis
    const prompt = generatePrompt(file, domain, fileAnalysis);
    
    // Generate content from file
    const result = await generateContent(model, prompt, fileData as unknown as Part);
    
    const response = await result.response;
    const content = response.text();

    // Cache the response
    const cacheKey = `${domain}:file:${file.name}`;
    messageCache.set(cacheKey, {
      response: content,
      timestamp: Date.now(),
      fileAnalysis
    });

    // Update chat history
    updateChatHistory(userId, domain, `Uploaded file: ${file.name}`, content);

    return {
      content,
      groundingMetadata: convertGroundingMetadata(response.candidates?.[0]?.groundingMetadata),
      fileAnalysis
    };

  } catch (error) {
    console.error('File upload error:', error);
    throw new AIError(
      error instanceof Error ? error.message : 'Failed to process file',
      'FILE_UPLOAD_ERROR'
    );
  }
} 