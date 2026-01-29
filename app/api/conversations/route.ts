
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const last_id = searchParams.get('last_id') || '';
  const limit = searchParams.get('limit') || '20';
  
  const difyApiKey = process.env.DIFY_API_KEY;
  const difyApiUrl = process.env.DIFY_API_URL;

  if (!difyApiKey) {
    return NextResponse.json({ error: 'Dify API Key not configured' }, { status: 500 });
  }

  try {
    const params = new URLSearchParams();
    params.append('user', 'web-user');
    params.append('limit', limit);
    if (last_id) {
        params.append('last_id', last_id);
    }

    const response = await fetch(`${difyApiUrl}/conversations?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${difyApiKey}`,
      },
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Dify Transactions Error:', response.status, errorText);
        return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
