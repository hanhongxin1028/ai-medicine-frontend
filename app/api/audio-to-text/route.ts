import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const API_KEY = process.env.DIFY_API_KEY;
    const API_URL = process.env.DIFY_API_URL || 'http://43.99.100.154:8081/v1';

    if (!API_KEY) {
      return NextResponse.json({ error: 'DIFY_API_KEY not configured' }, { status: 500 });
    }

    // 构造转发给 Dify 的 FormData
    const difyFormData = new FormData();
    
    // 显式读取 Buffer 并重新构造 Blob
    // 解决 Next.js Edge/Node 环境下 File 对象直接传递可能导致的 ECONNRESET 或格式丢失问题
    if (file instanceof File) {
        const arrayBuffer = await file.arrayBuffer();
        // 确保 MIME 类型正确，且不带 codecs 参数（Dify 不接受带 codecs 的 MIME）
        let mimeType = file.type;
        
        // 移除 codecs 参数，例如 "audio/webm;codecs=opus" -> "audio/webm"
        if (mimeType.includes(';')) {
            mimeType = mimeType.split(';')[0];
        }
        
        // 如果 MIME 类型为空或不正确，根据文件名推断
        if (!mimeType || mimeType === 'application/octet-stream') {
            if (file.name.endsWith('.webm')) mimeType = 'audio/webm';
            else if (file.name.endsWith('.mp4')) mimeType = 'audio/mp4';
            else if (file.name.endsWith('.m4a')) mimeType = 'audio/m4a';
            else if (file.name.endsWith('.mp3')) mimeType = 'audio/mp3';
            else if (file.name.endsWith('.mpeg') || file.name.endsWith('.mpga')) mimeType = 'audio/mpeg';
            else if (file.name.endsWith('.wav')) mimeType = 'audio/wav';
            else if (file.name.endsWith('.ogg')) mimeType = 'audio/ogg';
            else mimeType = 'audio/webm'; // fallback
        }
        
        console.log('Uploading audio:', file.name, 'MIME:', mimeType, 'Size:', arrayBuffer.byteLength);
        const fileBlob = new Blob([arrayBuffer], { type: mimeType });
        difyFormData.append('file', fileBlob, file.name);
    } else {
         difyFormData.append('file', file);
    }
    
    // 注意：根据 Dify 前端实际调用，可能不需要 user 参数
    // 但文档说需要，我们保留它
    const user = formData.get('user') || 'default-user';
    difyFormData.append('user', user as string);

    const response = await fetch(`${API_URL}/audio-to-text`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        // 注意：当使用 FormData 时，fetch 会自动设置 Content-Type border，
        // 手动设置 Content-Type: multipart/form-data 往往会导致 boundary 丢失的问题
      },
      body: difyFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Dify API Error:', response.status, errorText);
      return NextResponse.json({ error: `Dify API error: ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error processing audio:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
