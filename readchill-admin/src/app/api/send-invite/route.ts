import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { email, revenueShare } = await request.json();

    if (!email || !revenueShare) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Checking for env variables
    const userEmail = process.env.EMAIL_USER;
    const appPassword = process.env.EMAIL_APP_PASSWORD;

    if (!userEmail || !appPassword) {
      console.error("Email credentials are not configured in .env.local");
      return NextResponse.json({ error: 'Email server is not configured. Please contact the administrator.' }, { status: 500 });
    }

    // Configure Nodemailer transporter for Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: userEmail,
        pass: appPassword,
      },
    });

    const loginUrl = "http://localhost:3001/login"; // Can be dynamic based on env later

    // Beautiful HTML Email Template
    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 40px 20px; border-radius: 12px;">
        <div style="background-color: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; font-size: 28px; margin: 0;">ReadChill</h1>
            <p style="color: #64748b; font-size: 16px; margin-top: 5px;">Admin & Partner Portal</p>
          </div>
          
          <h2 style="color: #1e293b; font-size: 22px; margin-bottom: 20px;">🎉 ขอเชิญร่วมเป็น Partner กับเรา!</h2>
          
          <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            สวัสดีครับ,<br><br>
            คุณได้รับคำเชิญให้เข้าร่วมเป็น <strong>นักเขียน/นักวาด (Partner)</strong> อย่างเป็นทางการกับแพลตฟอร์ม <strong>ReadChill</strong>
          </p>
          
          <div style="background-color: #f1f5f9; padding: 20px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #8b5cf6;">
            <h3 style="color: #0f172a; margin-top: 0; font-size: 16px;">💎 รายละเอียดส่วนแบ่งรายได้ (Revenue Share)</h3>
            <ul style="color: #475569; padding-left: 20px; margin-bottom: 0;">
              <li style="margin-bottom: 10px;">ส่วนแบ่งของ Partner: <strong>${revenueShare}%</strong></li>
              <li>ส่วนแบ่งของ Platform: <strong>${100 - Number(revenueShare)}%</strong></li>
            </ul>
          </div>
          
          <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            คุณสามารถใช้บัญชีอีเมล <strong>${email}</strong> ล็อกอินเข้าสู่ระบบหลังบ้านเพื่อจัดการเนื้อหา, อัปโหลดผลงาน, และเบิกถอนรายได้ของคุณได้ทันที
          </p>
          
          <div style="text-align: center;">
            <a href="${loginUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.4);">
              👉 กดเพื่อตอบรับคำเชิญและเข้าสู่ระบบ
            </a>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 40px 0 20px;">
          
          <p style="color: #94a3b8; font-size: 13px; text-align: center; margin: 0;">
            หากคุณมีข้อสงสัยใดๆ สามารถตอบกลับอีเมลนี้เพื่อติดต่อแอดมินได้โดยตรง<br>
            © ${new Date().getFullYear()} ReadChill. All rights reserved.
          </p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"ReadChill Admin" <${userEmail}>`,
      to: email,
      subject: `🎉 ยินดีต้อนรับ! คุณได้รับคำเชิญเป็น Partner กับ ReadChill (ส่วนแบ่ง ${revenueShare}%)`,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: 'Invitation email sent successfully' });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
  }
}
