import { useState } from 'react';

export default function Home() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);

  const [obsCRInput, setObsCRInput] = useState('');
  const [backsolveResult, setBacksolveResult] = useState(null);

  // 1. Function to call /api/calculate
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

  // 2. Function to call /api/backsolve
  const runBacksolve = async () => {
    try {
      // Parse the “main” JSON
      const mainObj = JSON.parse(input);

      // Parse observed CR JSON array
      const obsCRArr = JSON.parse(obsCRInput);
      if (!Array.isArray(obsCRArr) || obsCRArr.length !== mainObj.steps.length) {
        throw new Error('Observed CRs must be an array with length = number of steps');
      }

      // Merge into one payload
      const payload = { ...mainObj, observed_CR_s: obsCRArr };

      const res = await fetch('/api/backsolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setBacksolveResult(data.bestParams);
    } catch (err) {
      console.error(err);
      setBacksolveResult({ error: err.message });
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>Journey Calculator</h1>

      {/* ------------- Run Simulation ------------- */}
      <div>
        <h2>Run Simulation (Forward)</h2>
        <textarea
          rows={10}
          cols={80}
          placeholder={`Paste full journey JSON here (e.g., steps, E, N_importance, etc.)`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ display: 'block', marginBottom: '0.5rem' }}
        />
        <button onClick={runSimulation} style={{ padding: '0.5rem 1rem', marginBottom: '1rem' }}>
          Run Simulation
        </button>
        {result && (
          <div style={{ marginTop: '1rem' }}>
            <h3>Simulation Results</h3>
            <pre style={{ background: '#f0f0f0', padding: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <hr style={{ margin: '2rem 0' }} />

      {/* ------------- Run Back-Solve ------------- */}
      <div>
        <h2>Run Back-Solve (Fit k, γ_exit, ε)</h2>
        <p style={{ marginBottom: '0.5rem' }}>
          1. Paste the same journey JSON above into “Run Simulation.”<br />
          2. Paste a JSON array of observed CR<sub>s</sub> (one float per step).
        </p>
        <textarea
          rows={3}
          cols={80}
          placeholder={`Paste observed_CR_s as [0.88, 0.82, 0.75, ...]`}
          value={obsCRInput}
          onChange={(e) => setObsCRInput(e.target.value)}
          style={{ display: 'block', marginBottom: '0.5rem' }}
        />
        <button onClick={runBacksolve} style={{ padding: '0.5rem 1rem' }}>
          Run Back-Solve
        </button>
        {backsolveResult && (
          <div style={{ marginTop: '1rem' }}>
            <h3>Best-Fit Parameters</h3>
            <pre style={{ background: '#f0f0f0', padding: '1rem' }}>
              {JSON.stringify(backsolveResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <hr style={{ margin: '2rem 0' }} />
      <p style={{ fontSize: '0.9rem', color: '#666' }}>
        * After getting new k, γ_exit, or ε from back-solve, update them in your YAML/constants for future runs. *
      </p>
    </div>
  );
}