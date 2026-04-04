import { NextRequest, NextResponse } from 'next/server';

const CLASSIFICATION_PROMPT = `
You are an expert trauma assessment AI analyzing accident scene photographs for emergency medical services.

Analyze the provided image for signs of severe trauma that would require Level 1 Trauma Center capabilities. Focus on:

VISUAL INDICATORS OF HIGH SEVERITY TRAUMA:
- Crushed, deformed, or overturned vehicles
- Visible blood or bleeding wounds
- Exposed bones or severe lacerations
- Unconscious or unresponsive individuals
- Multiple victims or entrapment
- Heavy debris or structural damage
- Fire or smoke from vehicle
- Severe vehicle damage (e.g., airbags deployed, windows shattered)
- Pedestrians involved in vehicle accidents
- Motorcycle accidents with rider separation
- Emergency vehicles or responders present
- Road barriers or traffic cones indicating major incident

CLASSIFY AS "high" if you see clear evidence of severe trauma requiring immediate specialized care.
CLASSIFY AS "low" if the scene appears minor (e.g., fender bender, no visible injuries, no entrapment).

Provide response in JSON format only:
{
  "severity": "high" | "low",
  "confidence": number between 0-1,
  "reasoning": "brief explanation of assessment"
}

Be conservative: only classify as "high" if there's strong visual evidence of severe injury potential.`;

async function generateGeminiVision(apiKey: string, modelId: string, prompt: string, base64Image: string, mimeType: string) {
  const contents = [
    {
      role: 'user',
      parts: [
        { text: prompt },
        {
          inlineData: {
            mimeType,
            data: base64Image,
          },
        },
      ],
    },
  ];

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

  const response = await fetch(geminiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 300,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Validate image
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return NextResponse.json({ error: 'Image too large (max 10MB)' }, { status: 400 });
    }

    // Convert file to base64 for Gemini
    const buffer = await file.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString('base64');
    const mimeType = file.type || 'image/jpeg';

    // Use the same API as converse
    const apiKey = process.env.GEMINI_API_KEY!;
    const modelId = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

    const text = await generateGeminiVision(apiKey, modelId, CLASSIFICATION_PROMPT, base64Image, mimeType);

    console.log('Gemini vision response:', text); // Log for debugging

    // Parse JSON response
    let classification;
    try {
      // Extract JSON from response (Gemini might add extra text)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        classification = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', text);
      // Fallback to low severity
      classification = {
        severity: 'low',
        confidence: 0.5,
        reasoning: 'Unable to analyze image properly',
      };
    }

    // Validate response structure
    if (!classification.severity || !['high', 'low'].includes(classification.severity)) {
      classification.severity = 'low';
    }
    if (typeof classification.confidence !== 'number' || classification.confidence < 0 || classification.confidence > 1) {
      classification.confidence = 0.5;
    }

    // Apply confidence threshold: if low confidence, default to low severity
    if (classification.confidence < 0.6) {
      classification.severity = 'low';
      classification.reasoning += ' (low confidence, defaulting to low severity)';
    }

    return NextResponse.json(classification);
  } catch (error) {
    console.error('Classification error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      apiKeySet: !!process.env.GEMINI_API_KEY,
    });
    return NextResponse.json(
      {
        severity: 'low',
        confidence: 0.0,
        reasoning: 'Classification service unavailable',
      },
      { status: 500 }
    );
  }
}