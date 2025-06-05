// File: pages/index.js

import { useState } from "react";

// ──────────────────────────────────────────────────────────────────────────────
// 1. BLUEPRINT-DRIVEN DEFAULTS FOR EACH JOURNEY TYPE
// ──────────────────────────────────────────────────────────────────────────────
const JOURNEY_TYPE_DEFAULTS = {
  transactional: {
    entry:      { w_E: 0.2, w_N: 0.8 },
    page_blend: { w_c: 3,   w_f: 1   },
    complexity: { c1: 1,    c2: 2.5, c3: 1.5 },
  },
  exploratory: {
    entry:      { w_E: 0.5, w_N: 0.5 },
    page_blend: { w_c: 2.5, w_f: 1.5 },
    complexity: { c1: 1,   c2: 1.5, c3: 3   },
  },
  emotional: {
    entry:      { w_E: 0.7, w_N: 0.3 },
    page_blend: { w_c: 2,   w_f: 2   },
    complexity: { c1: 0.5, c2: 3.5, c3: 1 },
  },
  legal_required: {
    entry:      { w_E: 0.3, w_N: 0.7 },
    page_blend: { w_c: 2,   w_f: 1.5 },
    complexity: { c1: 1.5, c2: 2,   c3: 1.5 },
  },
  conversational: {
    entry:      { w_E: 0.6, w_N: 0.4 },
    page_blend: { w_c: 1.5, w_f: 2.5 },
    complexity: { c1: 2,   c2: 1,   c3: 1.5 },
  },
  urgent: {
    entry:      { w_E: 0.4, w_N: 0.6 },
    page_blend: { w_c: 2,   w_f: 2   }, 
    complexity: { c1: 1,   c2: 2,   c3: 1   },
  },
};

export default function Home() {
  // ─── 1. JOURNEY TYPE SELECTION & DEFAULTS ─────────────────────────────────
  const [journeyType, setJourneyType] = useState("transactional");
  const {
    entry:        { w_E: default_wE, w_N: default_wN },
    page_blend:   { w_c: default_wc, w_f: default_wf },
    complexity:   { c1: default_c1, c2: default_c2, c3: default_c3 },
  } = JOURNEY_TYPE_DEFAULTS[journeyType];

  // ─── 2. ENTRY MOTIVATION & CONSTANTS ─────────────────────────────────────
  const [E, setE] = useState(3);                  // Emotion (1–5)
  const [N_importance, setNImportance] = useState(3); // Necessity (1–5)
  const [source, setSource] = useState("paid_search"); // Traffic source

  // Question‐complexity weights (start from defaults)
  const [c1, setC1] = useState(default_c1);
  const [c2, setC2] = useState(default_c2);
  const [c3, setC3] = useState(default_c3);

  // Page‐score blend weights (start from defaults)
  const [w_c, setWc] = useState(default_wc);
  const [w_f, setWf] = useState(default_wf);

  // Entry‐motivation weights (start from defaults)
  const [w_E, setWE] = useState(default_wE);
  const [w_N, setWN] = useState(default_wN);

  // Initial cohort size U₀
  const [U0, setU0] = useState(10000);

  // ─── 3. STEPS & QUESTIONS STATE ─────────────────────────────────────────
  // Each step = { boosts, observedCR, questions: [ { title, input_type, invasiveness, difficulty } ] }
  const [steps, setSteps] = useState([
    {
      boosts: 0,
      observedCR: 1.0,
      questions: [
        {
          title: "Sample question for Step 1",
          input_type: "dropdown",
          invasiveness: 2,
          difficulty: 3,
        },
      ],
    },
  ]);

  // ─── 4. SIMULATION + OPTIMIZE + LLM RESULTS ─────────────────────────────
  const [simulationData, setSimulationData] = useState(null);
  // { predictedSteps: [...], CR_total, bestOrder, bestCR, bestSteps }

  // ─── 5. LLM CACHE STATE (was missing previously) ─────────────────────────
  // Used to store per-question LLM assessment results
  const [llmCache, setLlmCache] = useState({});

  // ─── 6. BACK‐SOLVE STATE ──────────────────────────────────────────────────
  const [backsolveResult, setBacksolveResult] = useState(null);
  const [overrides, setOverrides] = useState({ k: null, gamma_exit: null, epsilon: null });
  const [backupOverrides, setBackupOverrides] = useState(null);

  // ─── 7. COMPUTE DEFAULTS BY FUNNEL LENGTH ────────────────────────────────
  const lengthBucket =
    steps.length <= 6 ? "short" : steps.length <= 12 ? "medium" : "long";

  const kDefaults = { short: 0.24, medium: 0.08, long: 0.06 };
  const gammaExitDefaults = { short: 0.90, medium: 0.48, long: 0.40 };
  const epsilonDefaults = { short: 0.10, medium: 0.08, long: 0.05 };

  const defaultK = kDefaults[lengthBucket];
  const defaultGamma = gammaExitDefaults[lengthBucket];
  const defaultEpsilon = epsilonDefaults[lengthBucket];

  // ─── 8. “Find Optimal Flow” PARAMETER ────────────────────────────────────
  const [numSamples, setNumSamples] = useState(1000);

  // ─── 9. LOOKUP TABLES FOR DROPDOWNS ─────────────────────────────────────
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
    { value: 1, label: "1 — Low invasiveness" },
    { value: 2, label: "2 — Mildly personal, non-risky" },
    { value: 3, label: "3 — Personally revealing, but common" },
    { value: 4, label: "4 — Sensitive & risky" },
    { value: 5, label: "5 — Highly invasive" },
  ];

  const difficultyOptions = [
    { value: 1, label: "1 — Immediate answer" },
    { value: 2, label: "2 — Minimal thought" },
    { value: 3, label: "3 — Recall uncommon fact" },
    { value: 4, label: "4 — Calculation / estimation" },
    { value: 5, label: "5 — Judgment required" },
  ];

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

  // ─── 10. ADD / REMOVE STEPS & QUESTIONS ─────────────────────────────────
  const addStep = () => {
    setSteps([
      ...steps,
      {
        boosts: 0,
        observedCR: 1.0,
        questions: [
          {
            title: "New question for Step " + (steps.length + 1),
            input_type: "dropdown",
            invasiveness: 2,
            difficulty: 3,
          },
        ],
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
      title: "New question for Step " + (stepIndex + 1),
      input_type: "dropdown",
      invasiveness: 2,
      difficulty: 3,
    });
    setSteps(updated);
  };

  const removeQuestion = (stepIndex, qIdx) => {
    const updated = [...steps];
    updated[stepIndex].questions = updated[stepIndex].questions.filter(
      (_, idx) => idx !== qIdx
    );
    setSteps(updated);
  };

  const updateQuestion = (stepIndex, qIdx, newQuestion) => {
    const updated = [...steps];
    updated[stepIndex].questions[qIdx] = newQuestion;
    setSteps(updated);
  };

  // ─── 11. ADD/UPDATE OBSERVED CR PER STEP ───────────────────────────────
  const updateObservedCR = (stepIndex, val) => {
    const updated = [...steps];
    updated[stepIndex].observedCR = val;
    setSteps(updated);
  };

  // ─── 12. BUILD PAYLOAD FOR API CALLS ────────────────────────────────────
  const buildPayload = () => {
    const payload = {
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
    };
    if (overrides.k !== null) payload.k_override = overrides.k;
    if (overrides.gamma_exit !== null) payload.gamma_exit_override = overrides.gamma_exit;
    if (overrides.epsilon !== null) payload.epsilon_override = overrides.epsilon;
    return payload;
  };

  // ─── 13. RUN FORWARD SIMULATION + OPTIMIZE + LLM ASSESSMENT ─────────────
  const runSimulation = async () => {
    setSimulationData(null);
    setBacksolveResult(null);
    setBackupOverrides(null);
    setLlmCache({}); // Clear previous LLM results

    // 1) /api/calculate
    const calcPromise = fetch("/api/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload()),
    }).then((r) => r.json());

    // 2) /api/optimize
    const optPromise = fetch("/api/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...buildPayload(), numSamples }),
    }).then((r) => r.json());

    // 3) /api/assessQuestion (LLM) for each question
    const llmPromises = [];
    steps.forEach((step, sIdx) => {
      step.questions.forEach((q, qIdx) => {
        const key = `${sIdx}-${qIdx}`;
        llmPromises.push(
          fetch("/api/assessQuestion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              questionTitle: q.title,
              sampleResponses: "",
              frameworks: [
                "cognitive_load",
                "emotional_tone",
                "persuasion_principles",
                "social_identity",
                "framing_effect",
                // (add "nielsen_usability" if you’ve defined it)
              ],
            }),
          })
            .then((r) => r.json())
            .then((data) => ({ key, data }))
        );
      });
    });

    // 4) Wait for all three to finish
    const [calcResult, optResult, llmResults] = await Promise.all([
      calcPromise,
      optPromise,
      Promise.all(llmPromises),
    ]);

    // 5) Combine into simulationData
    const combined = {
      predictedSteps: calcResult.results,
      CR_total: calcResult.CR_total,
      bestOrder: optResult.bestOrder,
      bestCR: optResult.bestCR,
      bestSteps: optResult.bestSteps,
    };
    setSimulationData(combined);

    // 6) Populate llmCache
    const newCache = {};
    llmResults.forEach(({ key, data }) => {
      newCache[key] = data;
    });
    setLlmCache(newCache);
  };

  // ─── 14. RUN BACK-SOLVE ─────────────────────────────────────────────────
  const runBacksolve = async () => {
    const observedArray = steps.map((step) => step.observedCR);
    const payload = { ...buildPayload(), observed_CR_s: observedArray };

    const res = await fetch("/api/backsolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error("Back-Solve API returned error:", await res.text());
      return;
    }

    const data = await res.json();
    console.log("Backsolve response:", data);
    setBacksolveResult(data);
  };

  // ─── 15. APPLY / UNDO BACK-SOLVE ────────────────────────────────────────
  const applyBacksolve = () => {
    if (!backsolveResult || !backsolveResult.bestParams) return;

    setBackupOverrides({ ...overrides });
    const { k, gamma_exit, mse } = backsolveResult.bestParams;

    setOverrides({
      k: k,
      gamma_exit: gamma_exit,
      epsilon: null,
    });
  };

  const undoBacksolve = () => {
    if (!backupOverrides) return;
    setOverrides({ ...backupOverrides });
    setBackupOverrides(null);
  };

  // ─── 16. RENDER & TABLE ─────────────────────────────────────────────────
  const overallObservedCR = steps
    .map((step) => step.observedCR)
    .reduce((acc, v) => acc * v, 1);

  const overallPredictedCR = simulationData?.predictedSteps
    ? simulationData.predictedSteps.map((r) => r.CR_s).reduce((acc, v) => acc * v, 1)
    : null;

  const optimalPositions = {};
  if (simulationData?.bestOrder) {
    simulationData.bestOrder.forEach((stepIdx, ordinal) => {
      optimalPositions[stepIdx] = ordinal + 1;
    });
  }

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1>Journey Calculator</h1>

      {/* ── 16.1 Current Constants (k, γ_exit, ε) ───────────────────────────── */}
      <section style={{ border: "1px solid #ddd", padding: "1rem", marginBottom: "2rem" }}>
        <h2>Current Constants</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
          {/* k (decay) */}
          <div>
            <label>k (decay): </label>
            <input
              type="number"
              step="0.01"
              value={overrides.k !== null ? overrides.k : defaultK}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setOverrides({ ...overrides, k: isNaN(v) ? null : v });
              }}
            />
          </div>

          {/* γ_exit */}
          <div>
            <label>γ_exit (exit sens): </label>
            <input
              type="number"
              step="0.01"
              value={overrides.gamma_exit !== null ? overrides.gamma_exit : defaultGamma}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setOverrides({ ...overrides, gamma_exit: isNaN(v) ? null : v });
              }}
            />
          </div>

          {/* ε (penalty) */}
          <div>
            <label>ε (penalty): </label>
            <input
              type="number"
              step="0.01"
              value={overrides.epsilon !== null ? overrides.epsilon : defaultEpsilon}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setOverrides({ ...overrides, epsilon: isNaN(v) ? null : v });
              }}
            />
          </div>
        </div>

        {backupOverrides && (
          <button
            onClick={undoBacksolve}
            style={{ marginTop: "1rem", background: "#f44336", color: "white", padding: "0.5rem" }}
          >
            Undo Back-Solve
          </button>
        )}
      </section>

      {/* ── 16.2 Funnel-Level Settings ───────────────────────────────────────── */}
      <section style={{ border: "1px solid #ddd", padding: "1rem", marginBottom: "2rem" }}>
        <h2>Funnel-Level Settings</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          {/* Journey Type */}
          <div>
            <label>Journey Type: </label>
            <select
              value={journeyType}
              onChange={(e) => {
                const jt = e.target.value;
                setJourneyType(jt);
                const { entry, page_blend, complexity } = JOURNEY_TYPE_DEFAULTS[jt];
                setWE(entry.w_E);
                setWN(entry.w_N);
                setWc(page_blend.w_c);
                setWf(page_blend.w_f);
                setC1(complexity.c1);
                setC2(complexity.c2);
                setC3(complexity.c3);
              }}
            >
              <option value="transactional">Transactional</option>
              <option value="exploratory">Exploratory</option>
              <option value="emotional">Emotional</option>
              <option value="legal_required">Legal Required</option>
              <option value="conversational">Conversational</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Emotion (E) */}
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

          {/* Necessity (N) */}
          <div>
            <label>Necessity (N): </label>
            <select value={N_importance} onChange={(e) => setNImportance(+e.target.value)}>
              {necessityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Traffic Source */}
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

          {/* c₁ */}
          <div>
            <label>c₁ (interaction weight): </label>
            <input
              type="number"
              step="0.1"
              value={c1}
              onChange={(e) => setC1(+e.target.value)}
            />
          </div>

          {/* c₂ */}
          <div>
            <label>c₂ (privacy weight): </label>
            <input
              type="number"
              step="0.1"
              value={c2}
              onChange={(e) => setC2(+e.target.value)}
            />
          </div>

          {/* c₃ */}
          <div>
            <label>c₃ (difficulty weight): </label>
            <input
              type="number"
              step="0.1"
              value={c3}
              onChange={(e) => setC3(+e.target.value)}
            />
          </div>

          {/* w_c */}
          <div>
            <label>w_c (complexity weight): </label>
            <input
              type="number"
              step="0.1"
              value={w_c}
              onChange={(e) => setWc(+e.target.value)}
            />
          </div>

          {/* w_f */}
          <div>
            <label>w_f (fatigue weight): </label>
            <input
              type="number"
              step="0.1"
              value={w_f}
              onChange={(e) => setWf(+e.target.value)}
            />
          </div>

          {/* w_E */}
          <div>
            <label>w_E (Emotion weight): </label>
            <input
              type="number"
              step="0.01"
              value={w_E}
              onChange={(e) => setWE(+e.target.value)}
            />
          </div>

          {/* w_N */}
          <div>
            <label>w_N (Necessity weight): </label>
            <input
              type="number"
              step="0.01"
              value={w_N}
              onChange={(e) => setWN(+e.target.value)}
            />
          </div>

          {/* U₀ */}
          <div>
            <label>U₀ (initial cohort): </label>
            <input type="number" value={U0} onChange={(e) => setU0(+e.target.value)} />
          </div>
        </div>
      </section>

      {/* ── 16.3 Steps & Questions (with Observed CR, Buttons) ────────────────── */}
      <section style={{ border: "1px solid #ddd", padding: "1rem", marginBottom: "2rem" }}>
        <h2>Steps &amp; Questions</h2>
        {steps.map((step, stepIndex) => (
          <div
            key={stepIndex}
            style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem" }}
          >
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <strong>Step {stepIndex + 1}</strong>
              <button onClick={() => removeStep(stepIndex)} style={{ color: "red" }}>
                Remove Step
              </button>
            </div>

            {/* Boosts */}
            <div style={{ marginTop: "0.5rem", marginBottom: "0.5rem" }}>
              <label style={{ marginRight: "0.5rem" }}>Boosts:</label>
              <input
                type="number"
                min="0"
                max="3"
                value={step.boosts}
                onChange={(e) => {
                  const newStep = { ...step, boosts: +e.target.value };
                  updateStep(stepIndex, newStep);
                }}
                style={{ width: "4rem" }}
              />
            </div>

            {/* Observed Conversion Rate */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ marginRight: "0.5rem" }}>Observed CR (0–1):</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={step.observedCR}
                onChange={(e) => updateObservedCR(stepIndex, parseFloat(e.target.value))}
                style={{ width: "6rem" }}
              />
            </div>

            {/* Questions in this step */}
            <div style={{ marginBottom: "1rem" }}>
              <h4>Questions</h4>
              {step.questions.map((q, qIdx) => (
                <div
                  key={qIdx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 1fr",
                    gap: "0.5rem",
                    marginBottom: "0.5rem",
                    alignItems: "center",
                  }}
                >
                  {/* Question Title */}
                  <input
                    type="text"
                    value={q.title}
                    onChange={(e) => {
                      const newQ = { ...q, title: e.target.value };
                      updateQuestion(stepIndex, qIdx, newQ);
                    }}
                    placeholder="Enter question title"
                    style={{ width: "100%" }}
                  />

                  {/* Input Type */}
                  <select
                    value={q.input_type}
                    onChange={(e) => {
                      const newQ = { ...q, input_type: e.target.value };
                      updateQuestion(stepIndex, qIdx, newQ);
                    }}
                  >
                    {inputTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  {/* Invasiveness */}
                  <select
                    value={q.invasiveness}
                    onChange={(e) => {
                      const newQ = { ...q, invasiveness: +e.target.value };
                      updateQuestion(stepIndex, qIdx, newQ);
                    }}
                  >
                    {invasivenessOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  {/* Difficulty */}
                  <select
                    value={q.difficulty}
                    onChange={(e) => {
                      const newQ = { ...q, difficulty: +e.target.value };
                      updateQuestion(stepIndex, qIdx, newQ);
                    }}
                  >
                    {difficultyOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  {/* Remove question */}
                  <button onClick={() => removeQuestion(stepIndex, qIdx)} style={{ color: "red" }}>
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

        {/* ── Run Simulation & Run Back-Solve Buttons ────────────────────────── */}
        <div style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
          <button
            onClick={runSimulation}
            style={{ padding: "0.75rem 1.5rem", fontSize: "1rem" }}
          >
            Run Simulation
          </button>
          <button
            onClick={runBacksolve}
            style={{ padding: "0.75rem 1.5rem", fontSize: "1rem" }}
          >
            Run Back-Solve
          </button>
        </div>

        {/* ── Show Back-Solve Results & “Apply” Button ────────────────────────── */}
        {backsolveResult && backsolveResult.bestParams && (
          <div style={{ marginTop: "1.5rem", border: "1px solid #eee", padding: "1rem" }}>
            <h3>Back-Solve Result</h3>
            <pre
              style={{
                background: "#f0f0f0",
                padding: "1rem",
                maxHeight: "200px",
                overflowY: "auto",
              }}
            >
              {JSON.stringify(backsolveResult.bestParams, null, 2)}
            </pre>
            <p>
              <strong>Predicted Overall CR:</strong>{" "}
              {backsolveResult.predicted_CR_total?.toFixed(4) || "—"}
            </p>
            <button
              onClick={applyBacksolve}
              style={{
                background: "#4CAF50",
                color: "white",
                padding: "0.5rem 1rem",
                marginTop: "0.5rem",
              }}
            >
              Apply Back-Solve Constants
            </button>
            {backupOverrides && (
              <button
                onClick={undoBacksolve}
                style={{
                  marginLeft: "1rem",
                  background: "#f44336",
                  color: "white",
                  padding: "0.5rem 1rem",
                }}
              >
                Undo Back-Solve
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── 16.4 RESULTS TABLE ─────────────────────────────────────────────── */}
      <section style={{ border: "1px solid #ddd", padding: "1rem", marginBottom: "2rem" }}>
        <h2>Simulation, Optimize & LLM Results</h2>

        {!simulationData || !simulationData.predictedSteps ? (
          <p>Click “Run Simulation” above to see per-step predictions & LLM recommendations.</p>
        ) : (
          <>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginBottom: "1rem",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      border: "1px solid #ccc",
                      padding: "0.5rem",
                      background: "#f7f7f7",
                    }}
                  >
                    Step
                  </th>
                  <th
                    style={{
                      border: "1px solid #ccc",
                      padding: "0.5rem",
                      background: "#f7f7f7",
                    }}
                  >
                    Optimal Position
                  </th>
                  <th
                    style={{
                      border: "1px solid #ccc",
                      padding: "0.5rem",
                      background: "#f7f7f7",
                    }}
                  >
                    LLM Recommendations
                  </th>
                  <th
                    style={{
                      border: "1px solid #ccc",
                      padding: "0.5rem",
                      background: "#f7f7f7",
                    }}
                  >
                    Observed CR
                  </th>
                  <th
                    style={{
                      border: "1px solid #ccc",
                      padding: "0.5rem",
                      background: "#f7f7f7",
                    }}
                  >
                    Predicted CR
                  </th>
                </tr>
              </thead>
              <tbody>
                {steps.map((step, sIdx) => {
                  const predCR = simulationData.predictedSteps[sIdx]?.CR_s ?? null;
                  const optPos = optimalPositions[sIdx] ?? "—";

                  const llmTexts = step.questions.map((q, qIdx) => {
                    const key = `${sIdx}-${qIdx}`;
                    const rec = llmCache[key];
                    if (!rec)
                      return (
                        <div key={key} style={{ marginBottom: "0.5rem", color: "#999" }}>
                          Question {qIdx + 1}: Loading…
                        </div>
                      );
                    return (
                      <details key={key} style={{ marginBottom: "0.5rem" }}>
                        <summary style={{ cursor: "pointer" }}>
                          Question {qIdx + 1} recommendations
                        </summary>
                        <pre
                          style={{
                            whiteSpace: "pre-wrap",
                            background: "#f0f0f0",
                            padding: "0.5rem",
                          }}
                        >
                          {JSON.stringify(rec, null, 2)}
                        </pre>
                      </details>
                    );
                  });

                  return (
                    <tr key={sIdx}>
                      <td
                        style={{
                          border: "1px solid #ccc",
                          padding: "0.5rem",
                          verticalAlign: "top",
                          width: "4rem",
                          textAlign: "center",
                        }}
                      >
                        {sIdx + 1}
                      </td>
                      <td
                        style={{
                          border: "1px solid #ccc",
                          padding: "0.5rem",
                          verticalAlign: "top",
                          textAlign: "center",
                          width: "4rem",
                        }}
                      >
                        {optPos}
                      </td>
                      <td
                        style={{
                          border: "1px solid #ccc",
                          padding: "0.5rem",
                          verticalAlign: "top",
                        }}
                      >
                        {llmTexts}
                      </td>
                      <td
                        style={{
                          border: "1px solid #ccc",
                          padding: "0.5rem",
                          textAlign: "center",
                          verticalAlign: "top",
                          width: "6rem",
                        }}
                      >
                        {step.observedCR.toFixed(2)}
                      </td>
                      <td
                        style={{
                          border: "1px solid #ccc",
                          padding: "0.5rem",
                          textAlign: "center",
                          verticalAlign: "top",
                          width: "6rem",
                        }}
                      >
                        {predCR !== null ? predCR.toFixed(2) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Overall conversions */}
            <div style={{ marginTop: "1rem" }}>
              <strong>Overall Observed CR:</strong> {overallObservedCR.toFixed(4)}
              <br />
              <strong>Overall Predicted CR:</strong> {overallPredictedCR?.toFixed(4) || "—"}
              <br />
              <strong>Optimal Flow Predicted CR:</strong>{" "}
              {simulationData.bestCR?.toFixed(4) || "—"}{" "}
              <span style={{ color: "#666", fontSize: "0.9rem" }}>
                (from optimum ordering)
              </span>
            </div>
          </>
        )}
      </section>

      <p style={{ fontSize: "0.9rem", color: "#666" }}>
        * “Optimal Position” shows where each step ranks in the best-found flow (1 = first, 2 = second, etc.). The bottom line compares your current overall conversion with the optimal ordering’s predicted conversion. *
      </p>
    </div>
  );
}