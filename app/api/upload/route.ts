import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const difyApiKey = process.env.DIFY_API_KEY;
    const difyApiUrl = process.env.DIFY_API_URL;

    if (!difyApiKey) {
      return NextResponse.json({ error: 'Dify API Key not configured' }, { status: 500 });
    }

    // Construct the form data for Dify
    const outgoingFormData = new FormData();
    outgoingFormData.append('file', file);
    outgoingFormData.append('user', 'web-user'); // Fixed user as per requirements

    const response = await fetch(`${difyApiUrl}/files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${difyApiKey}`,
        // Note: Do not set Content-Type to multipart/form-data manually when using FormData,
        // the fetch client will set it with the correct boundary.
      },
      body: outgoingFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Dify Upload Error:', response.status, errorText);
      return NextResponse.json({ error: 'Upload failed', details: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Upload Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
