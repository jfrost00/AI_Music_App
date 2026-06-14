import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const SUNO_BASE = 'https://api.sunoapi.org';
const API_KEY = process.env.SUNO_API_KEY;
const PORT = process.env.PORT || 3001;

if (!API_KEY) {
  console.error('Missing SUNO_API_KEY. Add it to your .env file.');
  process.exit(1);
}

const app = express();
app.use(express.json());

// Small helper to call the Suno API with the secret key attached server-side.
async function sunoFetch(path, options = {}) {
  const res = await fetch(`${SUNO_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  return { status: res.status, body };
}

// Kick off a music generation job.
app.post('/api/generate', async (req, res) => {
  try {
    const {
      prompt,
      style,
      title,
      customMode = false,
      instrumental = false,
      model = 'V4_5',
      negativeTags,
      vocalGender,
    } = req.body || {};

    // callBackUrl is required by the API even though we poll for results.
    // A placeholder is fine when polling.
    const payload = {
      customMode,
      instrumental,
      model,
      callBackUrl: 'https://example.com/no-callback',
    };

    if (prompt) payload.prompt = prompt;
    if (customMode) {
      if (style) payload.style = style;
      if (title) payload.title = title;
    }
    if (negativeTags) payload.negativeTags = negativeTags;
    if (vocalGender) payload.vocalGender = vocalGender;

    const { status, body } = await sunoFetch('/api/v1/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    res.status(status).json(body);
  } catch (err) {
    console.error('generate error:', err);
    res.status(500).json({ code: 500, msg: err.message });
  }
});

// Poll a job's status / fetch finished audio.
app.get('/api/status/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, body } = await sunoFetch(
      `/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`,
      { method: 'GET' }
    );
    res.status(status).json(body);
  } catch (err) {
    console.error('status error:', err);
    res.status(500).json({ code: 500, msg: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Suno proxy running on http://localhost:${PORT}`);
});
