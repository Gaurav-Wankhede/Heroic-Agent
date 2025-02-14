import { NextResponse } from 'next/server';
import { getChatResponse, createResponseStream, chatHistories, messageCache } from '@/lib/ai';
import type { FileUploadData, EditMessageRequest } from '@/types/chat';

const DOMAIN_RESPONSES: Record<string, string[]> = {
  excel: [
    "I can help you with Excel formulas, pivot tables, and VBA automation.",
    "Need help with Excel functions, data validation, or conditional formatting?",
    "Ask me about Excel dashboards, data analysis, or spreadsheet optimization.",
  ],
  sql: [
    "I can help you write efficient SQL queries and understand database concepts.",
    "Need help with SQL joins, subqueries, or database optimization?",
    "Ask me about database design, indexing, or query performance.",
  ],
  'power-bi': [
    "I can help you build Power BI reports and understand DAX formulas.",
    "Need help with Power BI data modeling or visualization choices?",
    "Ask me about Power BI best practices, calculations, or data refresh.",
  ],
  tableau: [
    "I can help you create impactful Tableau visualizations and dashboards.",
    "Need help with Tableau calculated fields or parameters?",
    "Ask me about Tableau best practices, data blending, or analytics.",
  ],
  python: [
    "I can help you with Python programming for data analysis and automation.",
    "Need help with pandas, NumPy, or data visualization in Python?",
    "Ask me about Python scripts, data manipulation, or analysis workflows.",
  ],
  'machine-learning': [
    "I can help you implement machine learning models and understand algorithms.",
    "Need help with model selection, validation, or hyperparameter tuning?",
    "Ask me about classification, regression, or clustering problems.",
  ],
  'deep-learning': [
    "I can help you build and train deep neural networks.",
    "Need help with CNN architectures, RNNs, or model deployment?",
    "Ask me about deep learning frameworks, training strategies, or optimization.",
  ],
  nlp: [
    "I can help you with text analysis and natural language processing.",
    "Need help with text classification, tokenization, or embeddings?",
    "Ask me about NLP pipelines, text preprocessing, or language models.",
  ],
  'generative-ai': [
    "I can help you work with generative AI models and techniques.",
    "Need help with prompt engineering or model outputs?",
    "Ask me about text generation, image synthesis, or AI content creation.",
  ],
  'online-credibility': [
    "I can help you establish a professional online presence.",
    "Need help with personal branding or online reputation management?",
    "Ask me about digital presence strategies and professional networking.",
  ],
  'linkedin-optimization': [
    "I can help you improve your LinkedIn profile and engagement.",
    "Need help with LinkedIn content strategy or network building?",
    "Ask me about profile optimization, post visibility, or LinkedIn features.",
  ],
  'resume-creation': [
    "I can help you create a compelling resume and cover letter.",
    "Need help with resume formatting or content organization?",
    "Ask me about job application materials, ATS optimization, or personal branding.",
  ],
};

export async function POST(request: Request) {
  try {
    // Validate request content type
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { message, domain, stream = false, files } = body;

    // Get or generate user ID from session/cookie
    const userId = request.headers.get('x-user-id') || 'default';

    // Validate required fields
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    if (!domain || typeof domain !== 'string') {
      return NextResponse.json(
        { error: 'Domain is required and must be a string' },
        { status: 400 }
      );
    }

    if (stream) {
      const responseStream = createResponseStream(
        message,
        domain,
        userId,
        Array.isArray(files) ? files : undefined
      );
      
      return new Response(new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of responseStream) {
              controller.enqueue(new TextEncoder().encode(chunk));
            }
            controller.close();
          } catch (error) {
            console.error('Streaming error:', error);
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ 
                  error: error instanceof Error ? error.message : 'Unknown streaming error'
                })}\n\n`
              )
            );
            controller.close();
          }
        },
      }), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Get AI response with grounding
    const response = await getChatResponse(message, domain, userId);
    return NextResponse.json(response, {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    // Get user ID and domain from URL parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const domain = searchParams.get('domain');

    if (!userId || !domain) {
      return NextResponse.json(
        { error: 'Both userId and domain are required' },
        { status: 400 }
      );
    }

    // Clear chat history and cache for the specified user and domain
    const key = `${userId}:${domain}`;
    chatHistories.delete(key);
    
    // Clear cache entries for this user and domain
    for (const [cacheKey, _] of messageCache.entries()) {
      if (cacheKey.startsWith(`${domain}:`)) {
        messageCache.delete(cacheKey);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Clear chat error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    // Validate request content type
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json() as EditMessageRequest;
    const { messageId, content, domain, userId } = body;

    // Validate required fields
    if (!messageId || !content || !domain || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get chat history
    const key = `${userId}:${domain}`;
    const history = chatHistories.get(key);
    
    if (!history) {
      return NextResponse.json(
        { error: 'Chat history not found' },
        { status: 404 }
      );
    }

    // Find the message index
    const messageIndex = history.messages.findIndex(
      msg => msg.role === 'user' && msg.timestamp === parseInt(messageId.split('-')[1])
    );

    if (messageIndex === -1) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Update the message
    history.messages[messageIndex].content = content;
    history.messages[messageIndex] = {
      ...history.messages[messageIndex],
      content,
      edited: true,
      originalContent: history.messages[messageIndex].content
    };

    // Remove all messages after the edited message
    history.messages = history.messages.slice(0, messageIndex + 1);
    history.lastUpdated = Date.now();

    // Update chat history
    chatHistories.set(key, history);

    // Clear relevant cache entries
    for (const [cacheKey, _] of messageCache.entries()) {
      if (cacheKey.startsWith(`${domain}:`)) {
        messageCache.delete(cacheKey);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Edit message error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 