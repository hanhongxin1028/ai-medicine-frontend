// 这是一个帮助脚本，用于测试文件上传到 Dify 是否正常
// 您可以使用 curl 或 Postman 调用此 API 进行 debug
// 例如：curl -X POST -F "file=@test.webm" http://localhost:3000/api/debug-upload

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    const API_KEY = process.env.DIFY_API_KEY;
    const API_URL = process.env.DIFY_API_URL || 'http://43.99.100.154:8081/v1';

    console.log('[Debug] File received:', file);
    if (file instanceof File) {
        console.log('[Debug] File details:', {
            name: file.name,
            type: file.type,
            size: file.size
        });
    }

    // 构造一个新的 Blob 来确保它是纯净的
    // 有时候 Next.js 解析的 File 对象直接传给 fetch 会有问题
    // 我们尝试读取为 ArrayBuffer 再重新构造
    let fileForUpload;
    let filename = 'audio.webm';
    
    if (file instanceof File) {
        const arrayBuffer = await file.arrayBuffer();
        fileForUpload = new Blob([arrayBuffer], { type: file.type || 'audio/webm' });
        filename = file.name;
    } else {
        return NextResponse.json({ error: 'Invalid file' }, { status: 400 });
    }

    const difyFormData = new FormData();
    difyFormData.append('file', fileForUpload, filename);
    difyFormData.append('user', 'debug-user');

    console.log('[Debug] Sending to Dify:', `${API_URL}/audio-to-text`);

    const response = await fetch(`${API_URL}/audio-to-text`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: difyFormData,
    });

    const responseText = await response.text();
    console.log('[Debug] Dify Response:', response.status, responseText);

    if (!response.ok) {
        return NextResponse.json({ 
            error: 'Dify API Error', 
            status: response.status,
            details: responseText 
        }, { status: response.status });
    }

    try {
        const data = JSON.parse(responseText);
        return NextResponse.json(data);
    } catch (e) {
         return NextResponse.json({ text: responseText });
    }

  } catch (error) {
    console.error('[Debug] Server Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
