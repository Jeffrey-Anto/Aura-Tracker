import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'gemini-dev-proxy',
        configureServer(server) {
          server.middlewares.use('/api/gemini', async (req, res) => {
            if (req.method === 'OPTIONS') {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              res.writeHead(200);
              res.end();
              return;
            }

            if (req.method !== 'POST') {
              res.writeHead(405, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Method not allowed' }));
              return;
            }

            if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_gemini_api_key')) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                error: 'GEMINI_API_KEY is not configured in .env',
                fallback: true
              }));
              return;
            }

            let bodyStr = '';
            req.on('data', (chunk) => {
              bodyStr += chunk;
            });

            req.on('end', async () => {
              try {
                const body = JSON.parse(bodyStr || '{}');
                const { contents, generationConfig } = body;
                if (!contents || !Array.isArray(contents)) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'Missing or invalid contents array' }));
                  return;
                }

                const models = [
                  'gemini-2.5-flash',
                  'gemini-1.5-flash',
                  'gemini-2.0-flash',
                  'gemini-1.5-pro'
                ];

                let lastError: any = null;
                for (const model of models) {
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
                      const errData = await apiRes.json().catch(() => ({})) as any;
                      throw new Error(errData?.error?.message || `HTTP ${apiRes.status}`);
                    }

                    const result = await apiRes.json() as any;
                    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (!text) throw new Error('Empty model response');

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ text, model }));
                    return;
                  } catch (err: any) {
                    lastError = err;
                  }
                }

                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  error: lastError?.message || 'Gemini API call failed across models',
                  fallback: true
                }));
              } catch (e: any) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e?.message || 'Dev server error' }));
              }
            });
          });
        }
      }
    ],
    server: {
      port: 3000,
      open: true
    }
  };
});
