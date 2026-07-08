import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    // Add log=true to keep slip record in SlipOK dashboard
    formData.append('log', 'true');

    // The provided SlipOK API URL & Key
    const slipokUrl = 'https://api.slipok.com/api/line/apikey/69617';
    const apiKey = 'SLIPOKPHXCCC8';

    const response = await fetch(slipokUrl, {
      method: 'POST',
      headers: {
        'x-authorization': apiKey
      },
      body: formData
    });

    const data = await response.json();
    
    // Pass the SlipOK response directly back to the client
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
