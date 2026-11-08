// Vercel Serverless Function: Secure Server-Side Gemini AI Proxy
// The GEMINI_API_KEY is read strictly on the server and is never exposed to the client bundle.

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-pro'
];

export const config = {
  maxDuration: 30
};

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    if (res && res.setHeader) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      return res.status(200).end();
    }
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  // Handle standard Web Request (Edge runtime)
  if (typeof Request !== 'undefined' && req instanceof Request && !res) {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_gemini_api_key')) {
      return new Response(JSON.stringify({
        error: 'GEMINI_API_KEY is not configured on the server.',
        fallback: true
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      const body = await req.json();
      const { contents, generationConfig } = body || {};

      if (!contents || !Array.isArray(contents)) {
        return new Response(JSON.stringify({ error: 'Missing or invalid "contents" array' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      let lastError = null;
      for (const model of GEMINI_MODELS) {
        try {
          const apiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents,
                generationConfig: generationConfig || {
                  temperature: 0.2,
                  responseMimeType: 'application/json'
                }
              })
            }
          );

          if (!apiRes.ok) {
            const errData = await apiRes.json().catch(() => ({}));
            throw new Error(errData.error?.message || `HTTP ${apiRes.status}`);
          }

          const result = await apiRes.json();
          const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) throw new Error('Empty model response');

          return new Response(JSON.stringify({ text, model }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (err) {
          lastError = err;
        }
      }

      return new Response(JSON.stringify({
        error: lastError?.message || 'Gemini API call failed',
        fallback: true
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message || 'Server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // Handle standard Node.js runtime (req, res)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_gemini_api_key')) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY is not configured on the server. Please set GEMINI_API_KEY in your deployment environment variables.',
      fallback: true
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { contents, generationConfig } = body || {};

    if (!contents || !Array.isArray(contents)) {
      return res.status(400).json({ error: 'Missing or invalid "contents" array in request body' });
    }

    let lastError = null;

    for (const model of GEMINI_MODELS) {
      try {
        const apiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              generationConfig: generationConfig || {
                temperature: 0.2,
                responseMimeType: 'application/json'
              }
            })
          }
        );

        if (!apiRes.ok) {
          const errData = await apiRes.json().catch(() => ({}));
          throw new Error(errData.error?.message || `HTTP ${apiRes.status}`);
        }

        const result = await apiRes.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
          throw new Error('Empty model response');
        }

        return res.status(200).json({ text, model });
      } catch (err) {
        lastError = err;
      }
    }

    return res.status(502).json({
      error: lastError?.message || 'Gemini API call failed across all model fallbacks',
      fallback: true
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Internal server error processing Gemini request'
    });
  }
}

