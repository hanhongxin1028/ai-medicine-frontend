import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, files } = body;

    const difyApiKey = process.env.DIFY_API_KEY;
    const difyApiUrl = process.env.DIFY_API_URL;

    if (!difyApiKey) {
      return NextResponse.json({ error: 'Dify API Key not configured' }, { status: 500 });
    }

    // Fixed structure for Dify API
    const payload = {
      inputs: {},
      query: query || "",
      response_mode: "streaming",
      user: "web-user", 
      files: files || []
    };

    const response = await fetch(`${difyApiUrl}/chat-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${difyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Dify Chat Error:', response.status, errorText);
      return NextResponse.json({ error: 'Chat Request failed', details: errorText }, { status: response.status });
    }

    // Pass through the stream
    // Create a TransformStream if we wanted to process it, but for raw pass-through:
    // We can just return the response body. 
    // However, to be safe with Next.js App Router, we return a new Response.
    
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chat Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
