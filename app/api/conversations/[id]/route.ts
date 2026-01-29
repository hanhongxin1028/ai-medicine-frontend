
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const conversationId = params.id;
  const difyApiKey = process.env.DIFY_API_KEY;
  const difyApiUrl = process.env.DIFY_API_URL;

  if (!difyApiKey) {
    return NextResponse.json({ error: 'Dify API Key not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(`${difyApiUrl}/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${difyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user: 'web-user' }),
    });

    if (!response.ok) {
        // Dify returns 204 on success, so check specifically for errors
        if (response.status !== 204) {
             const errorText = await response.text();
             console.error('Dify Delete Conversation Error:', response.status, errorText);
             return NextResponse.json({ error: 'Failed to delete conversation' }, { status: response.status });
        }
    }

    return NextResponse.json({ result: 'success' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
