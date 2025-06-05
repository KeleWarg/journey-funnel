// File: pages/index.js

import { useState } from "react";

export default function Home() {
  // ─── 1. Funnel-level state ─────────────────────────────────────────────
  const [E, setE] = useState(3);                   // Emotion (1–5)
  const [N_importance, setNImportance] = useState(3); // Necessity (1–5)
  const [source, setSource] = useState("paid_search"); // Traffic source
  const [c1, setC1] = useState(1);
  const [c2, setC2] = useState(2.5);
  const [c3, setC3] = useState(1.5);
  const [w_c, setWc] = useState(3);
  const [w_f, setWf] = useState(1);
  const [w_E, setWE] = useState(0.2);
  const [w_N, setWN] = useState(0.8);
  const [U0, setU0] = useState(10000);

  // ─── 2. Steps + Questions state ────────────────────────────────────────
  // Each step: { boosts: number, questions: [ { input_type, invasiveness, difficulty } ] }
  const [steps, setSteps] = useState([
    {
      boosts: 0,
      questions: [
        { input_type: "dropdown", invasiveness: 2, difficulty: 3 },
      ],
    },
  ]);

  // ─── 3. Observed CR state (for back-solve) ─────────────────────────────
  const [observedCRInput, setObservedCRInput] = useState("");
  const [simulationResult, setSimulationResult] = useState(null);
  const [backsolveResult, setBacksolveResult] = useState(null);

  // ─── 4. Lookup tables for “1–5” descriptive labels ────────────────────
  const emotionOptions = [
    { value: 1, label: "1 — Barely any pull" },
    { value: 2, label: "2 — Mild interest" },
    { value: 3, label: "3 — Moderate pull" },
    { value: 4, label: "4 — Strong pull" },
    { value: 5, label: "5 — Critical pull" },
  ];

  const necessityOptions = [
    { value: 1, label: "1 — Optional (no real consequence)" },
    { value: 2, label: "2 — Low urgency" },
    { value: 3, label: "3 — Moderate necessity" },
    { value: 4, label: "4 — High necessity" },
    { value: 5, label: "5 — Mandatory & urgent" },
  ];

  const invasivenessOptions = [
    { value: 1, label: "1 — Low invasiveness (general, non-personal)" },
    { value: 2, label: "2 — Mildly personal, non-risky" },
    { value: 3, label: "3 — Personally revealing, but common" },
    { value: 4, label: "4 — Sensitive & contextually risky" },
    { value: 5, label: "5 — Highly invasive, socially or legally risky" },
  ];

  const difficultyOptions = [
    { value: 1, label: "1 — Immediate answer (no lookup)" },
    { value: 2, label: "2 — Minimal thought (common recall)" },
    { value: 3, label: "3 — Recall uncommon fact" },
    { value: 4, label: "4 — Calculation / estimation" },
    { value: 5, label: "5 — Judgment or fuzzy boundary" },
  ];

  // ─── 5. Input-type options (unchanged) ────────────────────────────────
  const inputTypeOptions = [
    { value: "check_box", label: "Check-box" },
    { value: "radio_button", label: "Radio-button" },
    { value: "dropdown", label: "Dropdown (select)" },
    { value: "media_selector", label: "Media Selector (card)" },
    { value: "slider", label: "Slider" },
    { value: "date_picker", label: "Date-picker" },
    { value: "text_input_short", label: "Short Text (e.g. Zipcode)" },
    { value: "search_input", label: "Search Input" },
    { value: "text_input_long", label: "Long Text (e.g. Email)" },
  ];

  // ─── 6. Handle adding/removing steps/questions ─────────────────────────
  const addStep = () => {
    setSteps([
      ...steps,
      {
        boosts: 0,
        questions: [{ input_type: "dropdown", invasiveness: 2, difficulty: 3 }],
      },
    ]);
  };
  const removeStep = (stepIndex) => {
    setSteps(steps.filter((_, idx) => idx !== stepIndex));
  };
  const updateStep = (stepIndex, newStep) => {
    const updated = [...steps];
    updated[stepIndex] = newStep;
    setSteps(updated);
  };
  const addQuestion = (stepIndex) => {
    const updated = [...steps];
    updated[stepIndex].questions.push({
      input_type: "dropdown",
      invasiveness: 2,
      difficulty: 3,
    });
    setSteps(updated);
  };
  const removeQuestion = (stepIndex, qIndex) => {
    const updated = [...steps];
    updated[stepIndex].questions = updated[stepIndex].questions.filter(
      (_, idx) => idx !== qIndex
    );
    setSteps(updated);
  };
  const updateQuestion = (stepIndex, qIndex, newQuestion) => {
    const updated = [...steps];
    updated[stepIndex].questions[qIndex] = newQuestion;
    setSteps(updated);
  };

  // ─── 7. Build payload for simulation/backsolve ─────────────────────────
  const buildPayload = () => ({
    steps,
    E,
    N_importance,
    source,
    c1,
    c2,
    c3,
    w_c,
    w_f,
    w_E,
    w_N,
    U0,
  });

  // ─── 8. Run Forward Simulation ────────────────────────────────────────
  const runSimulation = async () => {
    try {
      setSimulationResult(null);
      setBacksolveResult(null);
      const payload = buildPayload();
      const res = await fetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setSimulationResult(data);
    } catch (err) {
      console.error(err);
      setSimulationResult({ error: "Simulation failed" });
    }
  };

  // ─── 9. Run Back-Solve ─────────────────────────────────────────────────
  const runBacksolve = async () => {
    try {
      setBacksolveResult(null);
      const payload = buildPayload();
      const obsArr = JSON.parse(observedCRInput);
      if (!Array.isArray(obsArr) || obsArr.length !== steps.length) {
        alert("Observed CR array must match number of steps");
        return;
      }
      payload.observed_CR_s = obsArr;

      const res = await fetch("/api/backsolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setBacksolveResult(data.bestParams || data.error);
    } catch (err) {
      console.error(err);
      setBacksolveResult({ error: "Back-solve failed" });
    }
  };

  // ─── 10. JSX: Render the form ───────────────────────────────────────────
  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1>Journey Calculator</h1>

      {/* ─── Funnel-Level Settings ──────────────────────────── */}
      <section
        style={{
          border: "1px solid #ddd",
          padding: "1rem",
          marginBottom: "2rem",
        }}
      >
        <h2>Funnel-Level Settings</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          <div>
            <label>Emotion (E): </label>
            <select value={E} onChange={(e) => setE(+e.target.value)}>
              {emotionOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Necessity (N): </label>
            <select
              value={N_importance}
              onChange={(e) => setNImportance(+e.target.value)}
            >
              {necessityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Traffic Source: </label>
            <select value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="paid_search">Paid Search</option>
              <option value="paid_social">Paid Social</option>
              <option value="organic_search">Organic Search</option>
              <option value="direct_referral">Direct Referral</option>
              <option value="display_email">Display / Email</option>
              <option value="social_organic">Social Organic</option>
            </select>
          </div>
          <div>
            <label>c₁ (interaction weight): </label>
            <input
              type="number"
              step="0.1"
              value={c1}
              onChange={(e) => setC1(+e.target.value)}
            />
          </div>
          <div>
            <label>c₂ (privacy weight): </label>
            <input
              type="number"
              step="0.1"
              value={c2}
              onChange={(e) => setC2(+e.target.value)}
            />
          </div>
          <div>
            <label>c₃ (difficulty weight): </label>
            <input
              type="number"
              step="0.1"
              value={c3}
              onChange={(e) => setC3(+e.target.value)}
            />
          </div>
          <div>
            <label>w_c (complexity weight): </label>
            <input
              type="number"
              step="0.1"
              value={w_c}
              onChange={(e) => setWc(+e.target.value)}
            />
          </div>
          <div>
            <label>w_f (fatigue weight): </label>
            <input
              type="number"
              step="0.1"
              value={w_f}
              onChange={(e) => setWf(+e.target.value)}
            />
          </div>
          <div>
            <label>w_E (emotion weight): </label>
            <input
              type="number"
              step="0.01"
              value={w_E}
              onChange={(e) => setWE(+e.target.value)}
            />
          </div>
          <div>
            <label>w_N (necessity weight): </label>
            <input
              type="number"
              step="0.01"
              value={w_N}
              onChange={(e) => setWN(+e.target.value)}
            />
          </div>
          <div>
            <label>U₀ (initial cohort): </label>
            <input
              type="number"
              value={U0}
              onChange={(e) => setU0(+e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* ─── Steps & Questions ─────────────────────────────────────────── */}
      <section
        style={{
          border: "1px solid #ddd",
          padding: "1rem",
          marginBottom: "2rem",
        }}
      >
        <h2>Steps &amp; Questions</h2>
        {steps.map((step, stepIndex) => (
          <div
            key={stepIndex}
            style={{
              border: "1px solid #ccc",
              padding: "1rem",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <strong>Step {stepIndex + 1}</strong>
              <button
                onClick={() => removeStep(stepIndex)}
                style={{ color: "red" }}
              >
                Remove Step
              </button>
            </div>
            <div style={{ marginTop: "0.5rem" }}>
              <label>Boosts for this step: </label>
              <input
                type="number"
                min="0"
                max="3"
                value={step.boosts}
                onChange={(e) => {
                  const newStep = { ...step, boosts: +e.target.value };
                  updateStep(stepIndex, newStep);
                }}
              />
            </div>

            {/* Questions inside this step */}
            <div style={{ marginTop: "1rem" }}>
              <h4>Questions</h4>
              {step.questions.map((q, qIndex) => (
                <div
                  key={qIndex}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr",
                    gap: "0.5rem",
                    marginBottom: "0.5rem",
                    alignItems: "center",
                  }}
                >
                  {/* 1) Input Type selector */}
                  <select
                    value={q.input_type}
                    onChange={(e) => {
                      const newQ = { ...q, input_type: e.target.value };
                      updateQuestion(stepIndex, qIndex, newQ);
                    }}
                  >
                    {inputTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  {/* 2) Invasiveness selector (mapped to descriptive) */}
                  <select
                    value={q.invasiveness}
                    onChange={(e) => {
                      const newQ = { ...q, invasiveness: +e.target.value };
                      updateQuestion(stepIndex, qIndex, newQ);
                    }}
                  >
                    {invasivenessOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  {/* 3) Difficulty selector (mapped to descriptive) */}
                  <select
                    value={q.difficulty}
                    onChange={(e) => {
                      const newQ = { ...q, difficulty: +e.target.value };
                      updateQuestion(stepIndex, qIndex, newQ);
                    }}
                  >
                    {difficultyOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  {/* 4) Remove question button */}
                  <button
                    onClick={() => removeQuestion(stepIndex, qIndex)}
                    style={{ color: "red" }}
                  >
                    Remove
                  </button>
                </div>
              ))}

              <button onClick={() => addQuestion(stepIndex)}>+ Add Question</button>
            </div>
          </div>
        ))}

        <button onClick={addStep} style={{ marginTop: "1rem" }}>
          + Add Step
        </button>
      </section>

      {/* ─── Preview JSON Payload ────────────────────────────────────────── */}
      <section
        style={{
          border: "1px solid #ddd",
          padding: "1rem",
          marginBottom: "2rem",
        }}
      >
        <h2>Preview Payload</h2>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            background: "#f9f9f9",
            padding: "1rem",
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          {JSON.stringify(buildPayload(), null, 2)}
        </pre>
      </section>

      {/* ─── Forward Simulation Button & Result ──────────────────────────── */}
      <section style={{ marginBottom: "2rem" }}>
        <button
          onClick={runSimulation}
          style={{ padding: "0.5rem 1rem", fontSize: "1rem" }}
        >
          Run Simulation
        </button>

        {simulationResult && (
          <div style={{ marginTop: "1rem" }}>
            <h3>Simulation Results</h3>
            <pre
              style={{
                background: "#f0f0f0",
                padding: "1rem",
                maxHeight: "400px",
                overflowY: "auto",
              }}
            >
              {JSON.stringify(simulationResult, null, 2)}
            </pre>
          </div>
        )}
      </section>

      <hr style={{ margin: "2rem 0" }} />

      {/* ─── Back-Solve Section ───────────────────────────────────────────── */}
      <section
        style={{
          border: "1px solid #ddd",
          padding: "1rem",
          marginBottom: "2rem",
        }}
      >
        <h2>Run Back-Solve (Fit k, γ_exit, ε)</h2>
        <p>
          1. Ensure the journey JSON above is correct.<br />
          2. Provide observed_CRₛ (one value per step) as a JSON array.
        </p>
        <textarea
          rows={3}
          cols={80}
          placeholder={`e.g. [0.88, 0.82, 0.75, ...]`}
          value={observedCRInput}
          onChange={(e) => setObservedCRInput(e.target.value)}
          style={{ display: "block", marginBottom: "0.5rem" }}
        />
        <button
          onClick={runBacksolve}
          style={{ padding: "0.5rem 1rem", fontSize: "1rem" }}
        >
          Run Back-Solve
        </button>

        {backsolveResult && (
          <div style={{ marginTop: "1rem" }}>
            <h3>Best-Fit Parameters</h3>
            <pre
              style={{
                background: "#f0f0f0",
                padding: "1rem",
                maxHeight: "200px",
                overflowY: "auto",
              }}
            >
              {JSON.stringify(backsolveResult, null, 2)}
            </pre>
          </div>
        )}
      </section>

      <p style={{ fontSize: "0.9rem", color: "#666" }}>
        * After computing best-fit k, γ_exit, ε, update your YAML or constants for
        future simulations. *
      </p>
    </div>
  );
}