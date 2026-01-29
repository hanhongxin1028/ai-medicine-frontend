
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const conversation_id = searchParams.get('conversation_id');
  const first_id = searchParams.get('first_id') || '';
  const limit = searchParams.get('limit') || '20';
  
  const difyApiKey = process.env.DIFY_API_KEY;
  const difyApiUrl = process.env.DIFY_API_URL;

  if (!difyApiKey) {
    return NextResponse.json({ error: 'Dify API Key not configured' }, { status: 500 });
  }

  if (!conversation_id) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
  }

  try {
    const url = `${difyApiUrl}/messages?user=web-user&conversation_id=${conversation_id}&limit=${limit}${first_id ? `&first_id=${first_id}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${difyApiKey}`,
      },
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Dify Messages Error:', response.status, errorText);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
