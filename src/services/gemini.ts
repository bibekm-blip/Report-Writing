import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ReportMetadata {
  studentName: string;
  rollNumber: string;
  courseName: string;
  subject: string;
  topicName: string;
  submissionDate: string;
}

export async function generateReport(metadata: ReportMetadata) {
  const prompt = `
    Generate a comprehensive CLASS ASSESSMENT REPORT (25 MARKS) on the topic: "${metadata.topicName}".
    
    The report MUST follow this exact format and be approximately 1000 words in total length. Use professional, academic, and detailed language. NO EMOJIS should be used.
    
    DO NOT include a "Basic Details" or "Introduction Details" section in the body text, as these will be provided in the report header separately.

    FORMAT:
    
    1. Abstract
    - A concise summary (150-200 words) of the entire report.

    2. Introduction (3–4 paragraphs)
    - Explain the topic in simple terms
    - Why this topic is important
    - Brief overview of what the report will cover
    
    3. Objectives of the Report
    - What are you trying to explain or analyze?
    - List 3–5 clear objectives
    
    4. Executive Summary (Core Section – Most Marks)
    Divide into these subheadings:
    a) Concept Explanation: Define key terms and explain the topic in detail.
    
    [IMAGE_AREA_1: Provide a very descriptive prompt for a professional diagram or illustration for this section]
    [CAPTION_1: Professional caption for the image above]

    b) Key Points / Components: Important elements related to the topic (use bullet points or short paragraphs).
    c) Practical Application / Examples: Real-life examples, case studies or scenarios.
    
    [IMAGE_AREA_2: Provide a very descriptive prompt for a professional chart or visualization for this section]
    [CAPTION_2: Professional caption for the image above]

    d) Benefits / Importance: Why this topic matters, impact on health/business/society (based on subject).
    e) Challenges / Limitations: Any drawbacks or issues.
    
    5. Conclusion
    - Summarize key learnings.
    - Final thoughts or recommendations.
    
    6. References
    - Provide a list of realistic websites, books, or sources.
    
    INSTRUCTIONS FOR AI:
    - BE VERY DETAILED. The goal is a high-quality academic report.
    - Use Markdown for formatting (bolding, lists, headers).
    - Ensure the tone is formal and educational.
    - DO NOT USE ANY EMOJIS.
    - Use the [IMAGE_AREA_X] and [CAPTION_X] markers exactly.
    - Avoid generic filler; provide specific facts and deep insights.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      temperature: 0.7,
      topP: 0.95,
      topK: 64,
    }
  });

  return response.text;
}

export async function generateReportImage(topic: string) {
  const prompt = `A highly professional, academic-style illustration or diagram representing the scientific/educational concept of ${topic}. Detailed, clean, educational layout, high quality.`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "1K"
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Image generation failed:", error);
  }
  return null;
}
