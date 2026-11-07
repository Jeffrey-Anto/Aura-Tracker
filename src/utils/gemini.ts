// Google Gemini AI integration for Document / PDF processing & checklist generation

export interface GeminiChecklistResponse {
  items: string[];
  source: 'gemini' | 'fallback';
  warning?: string;
}

/**
 * Retrieves the Gemini API key from environment variables or local storage
 */
export const getGeminiApiKey = (): string | null => {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY || (import.meta.env as any).GEMINI_API_KEY;
  if (envKey && envKey.trim() !== '' && !envKey.includes('your_gemini_api_key')) {
    return envKey.trim();
  }
  const sessionKey = localStorage.getItem('aura_gemini_api_key');
  if (sessionKey && sessionKey.trim() !== '') {
    return sessionKey.trim();
  }
  return null;
};

/**
 * Saves a temporary Gemini API key to local storage for quick testing if env is not restarted
 */
export const setSessionGeminiApiKey = (key: string): void => {
  if (key) {
    localStorage.setItem('aura_gemini_api_key', key.trim());
  } else {
    localStorage.removeItem('aura_gemini_api_key');
  }
};

/**
 * Converts a File to Base64 (raw base64 string without data URL prefix)
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64Data);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

/**
 * Reads text content from a text/markdown/code file
 */
export const fileToText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
};

/**
 * Fallback parser for text/markdown files when Gemini API key is not yet configured
 */
export const extractFallbackChecklist = (text: string, filename: string): string[] => {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const items: string[] = [];

  for (const line of lines) {
    // Check for markdown checklists: - [ ] Task or - [x] Task
    if (/^[-*+]\s*\[[\sx]\]\s+/i.test(line)) {
      items.push(line.replace(/^[-*+]\s*\[[\sx]\]\s+/i, ''));
    }
    // Check for numbered lists: 1. Task or 1) Task
    else if (/^\d+[\.\)]\s+/.test(line)) {
      items.push(line.replace(/^\d+[\.\)]\s+/, ''));
    }
    // Check for bullet items: - Task or * Task
    else if (/^[-*•]\s+/.test(line)) {
      const clean = line.replace(/^[-*•]\s+/, '');
      if (clean.length > 5 && clean.length < 150) {
        items.push(clean);
      }
    }
    // Check for "TODO:" or "Task:" lines
    else if (/^(TODO|TASK|STEP|MILESTONE):\s*/i.test(line)) {
      items.push(line.replace(/^(TODO|TASK|STEP|MILESTONE):\s*/i, ''));
    }

    if (items.length >= 15) break;
  }

  // If no patterned items were found, extract sensible non-empty lines
  if (items.length === 0) {
    const sensibleLines = lines
      .filter(l => l.length > 8 && l.length < 120 && !l.startsWith('#'))
      .slice(0, 8);
    if (sensibleLines.length > 0) {
      items.push(...sensibleLines);
    } else {
      items.push(
        `Review attached document: ${filename}`,
        'Extract and execute key action items',
        'Verify completion of required steps'
      );
    }
  }

  return items;
};

/**
 * Extracts an actionable task checklist from an attached file (PDF, TXT, MD, etc.)
 * using Google Gemini API with smart fallback.
 */
export const generateChecklistFromDocument = async (file: File): Promise<GeminiChecklistResponse> => {
  const apiKey = getGeminiApiKey();
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  // If no Gemini key is provided, use resilient local extraction with user notification
  if (!apiKey) {
    if (isPdf) {
      return {
        items: [
          `Review PDF sections: ${file.name.replace(/\.[^/.]+$/, '')}`,
          'Summarize key requirements and objectives',
          'Execute scheduled deliverables',
          'Final review and compliance check'
        ],
        source: 'fallback',
        warning: 'Gemini API key is not configured in .env (VITE_GEMINI_API_KEY). Generated placeholder checklist. Add your Gemini key to enable full AI parsing.'
      };
    }

    try {
      const text = await fileToText(file);
      const items = extractFallbackChecklist(text, file.name);
      return {
        items,
        source: 'fallback',
        warning: 'Gemini API key is not configured in .env (VITE_GEMINI_API_KEY). Extracted bullet points using local parser. Add your Gemini key for AI synthesis.'
      };
    } catch {
      return {
        items: [
          `Read and outline ${file.name}`,
          'Implement core deliverables',
          'Validate acceptance criteria'
        ],
        source: 'fallback',
        warning: 'Gemini API key not configured in .env.'
      };
    }
  }

  // Gemini API is configured! Call Gemini 1.5 Flash (or 2.0 Flash)
  const systemInstruction = 
    "You are an expert productivity assistant. Analyze the user's attached document and extract a clear, concise, actionable, chronological step-by-step checklist of tasks and sub-tasks required to complete the project or study material.\n" +
    "Format requirements:\n" +
    "- Return ONLY a valid JSON array of strings (e.g. [\"Step 1: Description\", \"Step 2: Description\"]).\n" +
    "- Each item must be a short, clear, actionable task (4 to 15 words).\n" +
    "- Do not include markdown formatting, code fences (no ```json), or conversational remarks.";

  let requestBody: any;

  if (isPdf) {
    const base64Data = await fileToBase64(file);
    requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: `${systemInstruction}\n\nDocument filename: ${file.name}` },
            {
              inline_data: {
                mime_type: 'application/pdf',
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    };
  } else {
    // Text-based file
    const textContent = await fileToText(file);
    requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: `${systemInstruction}\n\nDocument filename: ${file.name}\n\nDocument Content:\n${textContent.slice(0, 60000)}` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    };
  }

  // Model endpoints to try (primary: 1.5-flash, fallback: 2.0-flash)
  const models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error('No content returned from Gemini model');
      }

      // Clean JSON formatting if wrapped in codeblocks
      const cleaned = rawText
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();

      const parsed = JSON.parse(cleaned);

      if (Array.isArray(parsed) && parsed.length > 0) {
        const items = parsed.map(item => {
          if (typeof item === 'string') return item.trim();
          if (typeof item === 'object' && item !== null) {
            return (item.title || item.task || item.step || item.description || JSON.stringify(item)).trim();
          }
          return String(item).trim();
        }).filter(Boolean);

        return { items, source: 'gemini' };
      }
    } catch (err: any) {
      lastError = err;
      // Continue to next model if available
    }
  }

  // If Gemini calls failed, log and fallback gracefully
  console.warn('Gemini API call failed, using fallback parser:', lastError?.message || lastError);

  let fallbackItems: string[];
  if (!isPdf) {
    const text = await fileToText(file);
    fallbackItems = extractFallbackChecklist(text, file.name);
  } else {
    fallbackItems = [
      `Review ${file.name}`,
      'Draft primary milestones',
      'Execute task steps',
      'Verify requirements'
    ];
  }

  return {
    items: fallbackItems,
    source: 'fallback',
    warning: `AI generation failed (${lastError?.message || 'Network error'}). Extracted checklist locally.`
  };
};

