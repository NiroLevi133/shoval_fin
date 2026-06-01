import { NextRequest } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const { imageBase64, mimeType, mealLabel } = await req.json() as {
    imageBase64: string;
    mimeType: string;
    mealLabel: string;
  };

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    max_tokens: 600,
    messages: [
      {
        role: "system",
        content: `You are a nutrition expert. The user photographed their meal (${mealLabel}).
Analyze the image and identify all visible food items.
Return a JSON object with this exact structure:
{
  "components": [
    { "text": "Hebrew description of item", "calories": number, "protein": number },
    ...
  ]
}
Rules:
- Write item descriptions in Hebrew
- Estimate realistic portion sizes based on what you see
- Be accurate with calories and protein
- Split into individual components (e.g. rice and chicken are separate)
- If you cannot identify the food clearly, make a reasonable estimate and say so in Hebrew
- Maximum 6 components`,
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
              detail: "low",
            },
          },
          {
            type: "text",
            text: "מה יש בצלחת? תפרק לרכיבים עם הערכת קלוריות וחלבון.",
          },
        ],
      },
    ],
  });

  const raw = response.choices[0].message.content ?? "{}";
  try {
    const parsed = JSON.parse(raw) as { components: Array<{ text: string; calories: number; protein: number }> };
    return Response.json({ components: parsed.components ?? [] });
  } catch {
    return Response.json({ components: [] }, { status: 500 });
  }
}
