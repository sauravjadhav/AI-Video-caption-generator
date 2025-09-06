
import { GoogleGenAI, Type } from "@google/genai";
import type { Caption } from '../types';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const fileToBase64 = (file: File): Promise<{mimeType: string, data: string}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      resolve({ mimeType: file.type, data: base64Data });
    };
    reader.onerror = (error) => reject(error);
  });
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        start: {
          type: Type.NUMBER,
          description: 'The start time of the caption segment in seconds.',
        },
        end: {
          type: Type.NUMBER,
          description: 'The end time of the caption segment in seconds.',
        },
        text: {
          type: Type.STRING,
          description: 'The transcribed text for the segment.',
        },
      },
      required: ['start', 'end', 'text'],
    },
  };

const PROMPT = `Please transcribe the audio from this video. Provide the transcription with timestamps. 
The output must be a valid JSON array of objects. Each object in the array should represent a caption segment 
and must have three properties: 'start' (the start time in seconds, as a number), 'end' (the end time in 
seconds, as a number), and 'text' (the transcribed text, as a string). Do not include any other text or 
explanations outside of the JSON array. Detect the language of the video and provide the transcription in that language.`;


export const generateCaptionsFromVideo = async (
  videoFile: File,
  onProgress: (status: string) => void
): Promise<Caption[]> => {

  if (videoFile.size > MAX_FILE_SIZE) {
    throw new Error(`File is too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
  }

  onProgress("Converting video to Base64...");
  const { mimeType, data: base64Data } = await fileToBase64(videoFile);

  const videoPart = {
    inlineData: {
      mimeType,
      data: base64Data,
    },
  };

  const textPart = {
    text: PROMPT,
  };

  onProgress("Generating captions with Gemini...");
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: { parts: [textPart, videoPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    onProgress("Parsing response...");
    const jsonText = response.text.trim();
    const cleanJsonText = jsonText.replace(/^```json\n?/, '').replace(/```$/, '');
    const captions: Caption[] = JSON.parse(cleanJsonText);
    
    if (!Array.isArray(captions) || (captions.length > 0 && captions.some(c => typeof c.start !== 'number' || typeof c.end !== 'number' || typeof c.text !== 'string'))) {
      throw new Error("Invalid caption format received from API.");
    }
    
    return captions;
  } catch (error) {
    console.error("Error generating captions:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate captions: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating captions.");
  }
};
