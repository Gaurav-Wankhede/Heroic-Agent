import { NextResponse } from 'next/server';
import { getChatResponse, createResponseStream, chatHistories, messageCache } from '@/lib/ai';
import { isGenAIInitialized } from '@/lib/genai';
import { EditMessageRequest } from '@/types/chat';

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

    // Check if AI is initialized
    const isInitialized = await isGenAIInitialized();
    if (!isInitialized) {
      return NextResponse.json(
        { error: 'AI service is not initialized. Please check your API key configuration.' },
        { status: 503 }
      );
    }

    if (stream) {
      const responseStream = createResponseStream(
        message,
        domain,
        userId
      );
      
      return new Response(new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of responseStream) {
              controller.enqueue(new TextEncoder().encode(chunk));
            }
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            console.error('Streaming error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown streaming error';
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ 
                  error: errorMessage,
                  messageId: `error-${Date.now()}`
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
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        messageId: `error-${Date.now()}`
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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default';
    const domain = searchParams.get('domain');

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      );
    }

    // Clear chat history for the user and domain
    const key = `${userId}:${domain}`;
    chatHistories.delete(key);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing chat history:', error);
    return NextResponse.json(
      { error: 'Failed to clear chat history' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default';
    const domain = searchParams.get('domain');

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      );
    }

    // Get chat history for the user and domain
    const key = `${userId}:${domain}`;
    const history = chatHistories.get(key) || { messages: [], domain, lastUpdated: Date.now() };
    
    return NextResponse.json(history);
  } catch (error) {
    console.error('Error retrieving chat history:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve chat history' },
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
      msg => msg.role === 'user' && msg.timestamp === messageId.split('-')[1]
    );

    if (messageIndex === -1) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Update the message
    const updatedMessage = {
      ...history.messages[messageIndex],
      content,
      timestamp: new Date().toISOString(),
      metadata: {
        ...history.messages[messageIndex].metadata,
        edited: true,
        originalContent: history.messages[messageIndex].content
      }
    };

    history.messages[messageIndex] = updatedMessage;

    // Remove all messages after the edited message
    history.messages = history.messages.slice(0, messageIndex + 1);
    history.lastUpdated = new Date().toISOString();

    // Update chat history
    chatHistories.set(key, history);

    // Clear relevant cache entries
    for (const [cacheKey, _value] of messageCache.entries()) {
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