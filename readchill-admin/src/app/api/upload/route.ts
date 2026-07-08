import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    // Check if we have an image
    const image = formData.get('image');
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Prepare forward request to Go Service
    const goServiceUrl = process.env.GO_IMAGE_SERVICE_URL || 'http://localhost:5000/upload';
    
    // In production, the API_KEY would be set in Vercel / server environment variables
    // Hardcoding for now if env is not set (based on standard dev setup for ReadChill)
    const apiKey = process.env.GO_API_KEY || 'my_super_secret_key';

    const response = await fetch(goServiceUrl, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
      },
      body: formData,
      // We DO NOT set 'Content-Type': 'multipart/form-data' explicitly here
      // fetch will automatically set it along with the correct boundary when passing FormData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Go Service Error:", errorText);
      try {
        const errorJson = JSON.parse(errorText);
        return NextResponse.json({ error: errorJson.error || `Upload failed: ${response.statusText}` }, { status: response.status });
      } catch (e) {
        return NextResponse.json({ error: `Upload failed: ${errorText || response.statusText}` }, { status: response.status });
      }
    }

    const data = await response.json();
    
    // Go service returns { url: "..." }
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error("API Route Upload Error:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
