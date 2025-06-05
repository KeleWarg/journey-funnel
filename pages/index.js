import { useState } from 'react';

export default function Home() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);

  const runSimulation = async () => {
    try {
      const res = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: input,
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setResult({ error: 'Invalid input or server error.' });
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>Journey Calculator</h1>
      <textarea
        rows={10}
        cols={80}
        placeholder="Paste journey JSON here..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        style={{ display: 'block', marginBottom: '1rem' }}
      />
      <button onClick={runSimulation} style={{ padding: '0.5rem 1rem' }}>
        Run Simulation
      </button>
      {result && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Results</h2>
          <pre style={{ background: '#f0f0f0', padding: '1rem' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
