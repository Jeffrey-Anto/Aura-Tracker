// Google Gemini AI integration for Document / PDF processing, Checklists & Roadmaps

export interface GeminiChecklistResponse {
  items: string[];
  source: 'gemini' | 'fallback';
  warning?: string;
}

export interface GeneratedRoadmapLevel {
  levelNumber: number;
  name: string;
  topics: string[];
}

export interface GeneratedRoadmapResponse {
  skillName: string;
  levels: GeneratedRoadmapLevel[];
  source: 'gemini' | 'fallback';
  warning?: string;
}

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-3.8-flash', 'gemini-1.5-pro'];

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
    if (/^[-*+]\s*\[[\sx]\]\s+/i.test(line)) {
      items.push(line.replace(/^[-*+]\s*\[[\sx]\]\s+/i, ''));
    } else if (/^\d+[.)]\s+/.test(line)) {
      items.push(line.replace(/^\d+[.)]\s+/, ''));
    } else if (/^[-*•]\s+/.test(line)) {
      const clean = line.replace(/^[-*•]\s+/, '');
      if (clean.length > 5 && clean.length < 150) {
        items.push(clean);
      }
    } else if (/^(TODO|TASK|STEP|MILESTONE):\s*/i.test(line)) {
      items.push(line.replace(/^(TODO|TASK|STEP|MILESTONE):\s*/i, ''));
    }

    if (items.length >= 15) break;
  }

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

  let lastError: any = null;

  for (const model of GEMINI_MODELS) {
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
    }
  }

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

/**
 * Generates a full structured roadmap (Skill name, levels, and topic milestones)
 * from a plain text user prompt (e.g. "React roadmap", "Docker & Kubernetes").
 */
export const generateRoadmapFromPrompt = async (prompt: string): Promise<GeneratedRoadmapResponse> => {
  const apiKey = getGeminiApiKey();

  // Fallback generator when API key is missing
  const createFallbackRoadmap = (cleanTitle: string): GeneratedRoadmapResponse => {
    return {
      skillName: cleanTitle,
      levels: [
        {
          levelNumber: 1,
          name: 'Fundamentals & Setup',
          topics: [
            `Introduction & Environment Setup for ${cleanTitle}`,
            'Core Syntax, Principles & Tooling',
            'Essential Concepts & Basic Workflow',
            'First Hands-on Project Implementation'
          ]
        },
        {
          levelNumber: 2,
          name: 'Intermediate Patterns',
          topics: [
            'Component / Module Architecture',
            'State & Data Flow Management',
            'Error Handling & Asynchronous Operations',
            'Integrating External Libraries & APIs'
          ]
        },
        {
          levelNumber: 3,
          name: 'Advanced & Production Best Practices',
          topics: [
            'Performance Optimization & Caching',
            'Security Standards & Vulnerability Audits',
            'Automated Testing & CI/CD Pipelines',
            'Production Deployment & Monitoring'
          ]
        }
      ],
      source: 'fallback',
      warning: 'Generated template roadmap locally. Configure VITE_GEMINI_API_KEY in .env for custom AI curriculum synthesis.'
    };
  };

  const rawTitle = prompt.replace(/roadmap/i, '').trim();
  const cleanTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1) || 'Custom Skill';

  if (!apiKey) {
    return createFallbackRoadmap(cleanTitle);
  }

  const instruction = 
    "You are an expert curriculum designer and senior software engineer. Create a structured, professional, chronological learning roadmap for: " + prompt + ".\n" +
    "Requirements:\n" +
    "1. Choose a concise, professional skill name (e.g. 'React Developer', 'Kubernetes Mastery', 'DSA & Algorithms').\n" +
    "2. Provide 3 to 4 sequential proficiency levels (e.g. 'Level 1: Fundamentals', 'Level 2: Core Concepts', 'Level 3: Advanced Architecture', 'Level 4: Production & Ecosystem').\n" +
    "3. Under each level, include 3 to 5 clear, high-yield, actionable topics/milestones.\n" +
    "4. Return ONLY a valid raw JSON object matching this schema:\n" +
    "{\n" +
    "  \"skillName\": \"React Developer\",\n" +
    "  \"levels\": [\n" +
    "    {\n" +
    "      \"levelNumber\": 1,\n" +
    "      \"name\": \"Fundamentals\",\n" +
    "      \"topics\": [\"Topic 1\", \"Topic 2\", \"Topic 3\"]\n" +
    "    }\n" +
    "  ]\n" +
    "}";

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: instruction }]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json'
    }
  };

  let lastError: any = null;

  for (const model of GEMINI_MODELS) {
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

      if (!rawText) throw new Error('No content returned from Gemini model');

      const cleaned = rawText
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();

      const parsed = JSON.parse(cleaned);

      if (parsed && typeof parsed.skillName === 'string' && Array.isArray(parsed.levels) && parsed.levels.length > 0) {
        const levels: GeneratedRoadmapLevel[] = parsed.levels.map((lvl: any, idx: number) => ({
          levelNumber: typeof lvl.levelNumber === 'number' ? lvl.levelNumber : idx + 1,
          name: String(lvl.name || `Level ${idx + 1}`),
          topics: Array.isArray(lvl.topics) ? lvl.topics.map(String).filter(Boolean) : []
        }));

        return {
          skillName: parsed.skillName.trim() || cleanTitle,
          levels,
          source: 'gemini'
        };
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  console.warn('Gemini roadmap generation failed, falling back:', lastError?.message || lastError);
  return createFallbackRoadmap(cleanTitle);
};

/**
 * Generates a full structured roadmap from an uploaded syllabus/specification document or PDF.
 */
export const generateRoadmapFromFile = async (file: File): Promise<GeneratedRoadmapResponse> => {
  const apiKey = getGeminiApiKey();
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const baseTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  const capitalizedTitle = baseTitle.charAt(0).toUpperCase() + baseTitle.slice(1);

  if (!apiKey) {
    return {
      skillName: capitalizedTitle,
      levels: [
        {
          levelNumber: 1,
          name: 'Core Fundamentals',
          topics: [
            `Analyze ${file.name} syllabus overview`,
            'Fundamental concepts & prerequisite knowledge',
            'Core module walkthrough'
          ]
        },
        {
          levelNumber: 2,
          name: 'Applied Modules',
          topics: [
            'In-depth chapter exercises',
            'Technical problem solving & implementations',
            'Mid-point checkpoint & practical review'
          ]
        },
        {
          levelNumber: 3,
          name: 'Capstone & Advanced Topics',
          topics: [
            'Advanced topics & system integration',
            'Final project deliverables & case studies',
            'Review, evaluation & mastery verification'
          ]
        }
      ],
      source: 'fallback',
      warning: 'Gemini API key is not configured in .env. Generated outline locally. Add VITE_GEMINI_API_KEY for deep AI extraction.'
    };
  }

  const instruction = 
    "You are an expert curriculum designer. Analyze the attached syllabus, curriculum, or guide and generate a comprehensive, structured learning roadmap.\n" +
    "Requirements:\n" +
    "1. Infer a concise, professional skill name (e.g. 'Cloud Architecture', 'Distributed Systems', 'Applied Machine Learning').\n" +
    "2. Organize the content into 3 to 5 chronological learning levels (e.g. Level 1: Foundations, Level 2: Core Components, Level 3: Advanced Topics, Level 4: Capstone).\n" +
    "3. Under each level, include 3 to 5 clear, high-yield, actionable topics/milestones.\n" +
    "4. Return ONLY a valid raw JSON object matching this schema:\n" +
    "{\n" +
    "  \"skillName\": \"Skill Name\",\n" +
    "  \"levels\": [\n" +
    "    {\n" +
    "      \"levelNumber\": 1,\n" +
    "      \"name\": \"Level Name\",\n" +
    "      \"topics\": [\"Topic 1\", \"Topic 2\"]\n" +
    "    }\n" +
    "  ]\n" +
    "}";

  let requestBody: any;

  if (isPdf) {
    const base64Data = await fileToBase64(file);
    requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: `${instruction}\n\nDocument filename: ${file.name}` },
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
    const textContent = await fileToText(file);
    requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: `${instruction}\n\nDocument filename: ${file.name}\n\nDocument Content:\n${textContent.slice(0, 60000)}` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    };
  }

  let lastError: any = null;

  for (const model of GEMINI_MODELS) {
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

      if (!rawText) throw new Error('No content returned from Gemini model');

      const cleaned = rawText
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();

      const parsed = JSON.parse(cleaned);

      if (parsed && typeof parsed.skillName === 'string' && Array.isArray(parsed.levels) && parsed.levels.length > 0) {
        const levels: GeneratedRoadmapLevel[] = parsed.levels.map((lvl: any, idx: number) => ({
          levelNumber: typeof lvl.levelNumber === 'number' ? lvl.levelNumber : idx + 1,
          name: String(lvl.name || `Level ${idx + 1}`),
          topics: Array.isArray(lvl.topics) ? lvl.topics.map(String).filter(Boolean) : []
        }));

        return {
          skillName: parsed.skillName.trim() || capitalizedTitle,
          levels,
          source: 'gemini'
        };
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  console.warn('Gemini document roadmap extraction failed:', lastError?.message || lastError);
  return {
    skillName: capitalizedTitle,
    levels: [
      {
        levelNumber: 1,
        name: 'Foundations',
        topics: [`Overview of ${file.name}`, 'Core concepts and terms', 'Introductory exercises']
      },
      {
        levelNumber: 2,
        name: 'Core Topics',
        topics: ['Main architecture and modules', 'Deep dive exercises', 'Practical application']
      },
      {
        levelNumber: 3,
        name: 'Advanced & Review',
        topics: ['Advanced principles', 'Evaluation & testing', 'Final mastery synthesis']
      }
    ],
    source: 'fallback',
    warning: `AI extraction encountered an error (${lastError?.message || 'Network error'}). Extracted outline locally.`
  };
};
