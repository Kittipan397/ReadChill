import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json();

    if (!content) {
      return NextResponse.json({ error: "Missing content" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set. Skipping translation.");
      // Return empty translations if key is missing
      return NextResponse.json({
        en: "",
        zh: "",
        ja: ""
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Target languages
    const targets = ["English", "Chinese (Simplified)", "Japanese"];
    const keys = ["en", "zh", "ja"];
    const translations: Record<string, string> = {};

    // We can run these in parallel or sequentially. Sequential is safer for rate limits, 
    // but parallel is faster. Using Gemini 1.5 Flash is very fast.
    const promises = targets.map(async (targetLang, idx) => {
      const prompt = `You are a professional novel translator.
Translate the following HTML content into ${targetLang}. 
IMPORTANT RULES:
1. Preserve all HTML tags perfectly (e.g. <p>, <b>, <i>, <h2>). Do not remove or alter them.
2. Only translate the text content inside the tags.
3. Output ONLY the translated HTML, nothing else. No markdown code blocks, no explanations.

HTML Content:
${content}`;

      const result = await model.generateContent(prompt);
      let translatedText = result.response.text();
      // Clean up markdown block if the model accidentally adds it
      if (translatedText.startsWith("\`\`\`html")) {
        translatedText = translatedText.replace(/^\`\`\`html\n/, "").replace(/\n\`\`\`$/, "");
      } else if (translatedText.startsWith("\`\`\`")) {
        translatedText = translatedText.replace(/^\`\`\`\n/, "").replace(/\n\`\`\`$/, "");
      }

      translations[keys[idx]] = translatedText;
    });

    await Promise.all(promises);

    return NextResponse.json(translations);

  } catch (error: any) {
    console.error("Translation API Error:", error);
    return NextResponse.json({ error: error.message || "Translation failed" }, { status: 500 });
  }
}
