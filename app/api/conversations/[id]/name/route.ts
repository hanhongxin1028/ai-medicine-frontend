
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const conversationId = params.id;
  const body = await request.json();
  const { name } = body;

  const difyApiKey = process.env.DIFY_API_KEY;
  const difyApiUrl = process.env.DIFY_API_URL;

  if (!difyApiKey) {
    return NextResponse.json({ error: 'Dify API Key not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(`${difyApiUrl}/conversations/${conversationId}/name`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${difyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, user: 'web-user' }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Dify Rename Conversation Error:', response.status, errorText);
        return NextResponse.json({ error: 'Failed to rename conversation' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
