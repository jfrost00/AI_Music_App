import { useState, useRef, useEffect } from 'react';

const MODELS = ['V5', 'V4_5PLUS', 'V4_5', 'V4'];

const STYLE_SUGGESTIONS = [
  'Lo-fi hip hop',
  'Epic orchestral',
  'Upbeat pop',
  '80s synthwave',
  'Acoustic folk',
  'Jazz lounge',
  'Heavy metal',
  'Ambient chill',
];

// Statuses the API reports while a track is still being produced.
const PENDING_STATUSES = ['PENDING', 'TEXT_SUCCESS', 'FIRST_SUCCESS'];

export default function App() {
  const [customMode, setCustomMode] = useState(false);
  const [instrumental, setInstrumental] = useState(false);
  const [model, setModel] = useState('V5');
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('');
  const [title, setTitle] = useState('');

  const [status, setStatus] = useState('idle'); // idle | loading | polling | done | error
  const [message, setMessage] = useState('');
  const [tracks, setTracks] = useState([]);
  const pollRef = useRef(null);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const busy = status === 'loading' || status === 'polling';

  function reset() {
    clearInterval(pollRef.current);
    setTracks([]);
    setMessage('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    reset();

    if (!prompt.trim()) {
      setStatus('error');
      setMessage('Please describe the song you want to create.');
      return;
    }
    if (customMode && !style.trim()) {
      setStatus('error');
      setMessage('Custom mode needs a style (e.g. "epic orchestral, 120bpm").');
      return;
    }

    setStatus('loading');
    setMessage('Sending your request to the AI...');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          style,
          title,
          customMode,
          instrumental,
          model,
        }),
      });
      const data = await res.json();

      if (data.code !== 200 || !data?.data?.taskId) {
        throw new Error(data.msg || 'Generation request was rejected.');
      }

      setStatus('polling');
      setMessage('Composing your track — this usually takes 1–3 minutes...');
      startPolling(data.data.taskId);
    } catch (err) {
      setStatus('error');
      setMessage(err.message);
    }
  }

  function startPolling(taskId) {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/status/${taskId}`);
        const data = await res.json();
        const jobStatus = data?.data?.status;
        const sunoData = data?.data?.response?.sunoData || [];

        // Show streamable tracks as soon as they appear.
        const ready = sunoData.filter((t) => t.streamAudioUrl || t.audioUrl);
        if (ready.length) setTracks(ready);

        if (jobStatus === 'SUCCESS') {
          clearInterval(pollRef.current);
          setStatus('done');
          setMessage('Your music is ready! 🎵');
        } else if (jobStatus && !PENDING_STATUSES.includes(jobStatus)) {
          // Anything else (e.g. *_FAILED, SENSITIVE_WORD_ERROR) is terminal.
          clearInterval(pollRef.current);
          setStatus('error');
          setMessage(`Generation failed (${jobStatus}).`);
        }
      } catch (err) {
        clearInterval(pollRef.current);
        setStatus('error');
        setMessage('Lost connection while checking status.');
      }
    }, 5000);
  }

  return (
    <div className="page">
      <header className="hero">
        <h1>🎹 AI Music Studio</h1>
        <p>Describe a song and let AI compose it for you.</p>
      </header>

      <form className="card" onSubmit={handleSubmit}>
        <label className="field">
          <span>Describe your song</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              customMode
                ? 'Write the lyrics or a detailed description...'
                : 'e.g. A dreamy summer pop song about road trips with friends'
            }
            rows={4}
          />
        </label>

        <div className="chips">
          {STYLE_SUGGESTIONS.map((s) => (
            <button
              type="button"
              key={s}
              className="chip"
              onClick={() =>
                customMode
                  ? setStyle((v) => (v ? `${v}, ${s}` : s))
                  : setPrompt((v) => (v ? `${v} ${s}` : s))
              }
            >
              {s}
            </button>
          ))}
        </div>

        <div className="toggles">
          <label className="toggle">
            <input
              type="checkbox"
              checked={instrumental}
              onChange={(e) => setInstrumental(e.target.checked)}
            />
            <span>Instrumental (no vocals)</span>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={customMode}
              onChange={(e) => setCustomMode(e.target.checked)}
            />
            <span>Custom mode (set style &amp; title)</span>
          </label>
        </div>

        {customMode && (
          <div className="row">
            <label className="field">
              <span>Style</span>
              <input
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="e.g. synthwave, energetic, female vocals"
              />
            </label>
            <label className="field">
              <span>Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Song title"
              />
            </label>
          </div>
        )}

        <label className="field">
          <span>Model</span>
          <select value={model} onChange={(e) => setModel(e.target.value)}>
            {MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <button className="generate" type="submit" disabled={busy}>
          {busy ? 'Working…' : '✨ Create Music'}
        </button>
      </form>

      {message && (
        <div className={`status status-${status}`}>
          {busy && <span className="spinner" />}
          {message}
        </div>
      )}

      {tracks.length > 0 && (
        <div className="results">
          {tracks.map((t) => (
            <div className="track" key={t.id}>
              {t.imageUrl && <img src={t.imageUrl} alt={t.title} />}
              <div className="track-info">
                <h3>{t.title || 'Untitled'}</h3>
                <p className="tags">{t.tags}</p>
                <audio controls src={t.audioUrl || t.streamAudioUrl} />
                {t.audioUrl && (
                  <a className="download" href={t.audioUrl} download>
                    ⬇ Download
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
