#!/usr/bin/env node

/**
 * Stress Test Suite for Journey Funnel Calculator
 * Validates performance and stability under load
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CONCURRENT_REQUESTS = parseInt(process.env.CONCURRENT_REQUESTS) || 3;
const REPEAT_COUNT = parseInt(process.env.REPEAT_COUNT) || 5;

// Test payloads
const SMALL_FUNNEL = {
  steps: [
    {
      boosts: 0,
      observedCR: 0.85,
      questions: [
        { title: "Email", input_type: "2", invasiveness: 2, difficulty: 1 }
      ]
    },
    {
      boosts: 0,
      observedCR: 0.75,
      questions: [
        { title: "Name", input_type: "2", invasiveness: 1, difficulty: 1 }
      ]
    }
  ],
  E: 3, N_importance: 3, source: 'paid_search',
  c1: 1, c2: 2.5, c3: 1.5, w_c: 3, w_f: 1, w_E: 0.2, w_N: 0.8, U0: 1000
};

const LARGE_FUNNEL = {
  steps: Array.from({ length: 8 }, (_, i) => ({
    boosts: 0,
    observedCR: 0.8 - (i * 0.05),
    questions: [
      { title: `Question ${i+1}`, input_type: "3", invasiveness: 3, difficulty: 2 }
    ]
  })),
  E: 4, N_importance: 4, source: 'organic_search',
  c1: 1, c2: 2.5, c3: 1.5, w_c: 3, w_f: 1, w_E: 0.2, w_N: 0.8, U0: 1000
};

// Test scenarios
const STRESS_SCENARIOS = [
  {
    name: "Backsolve Full Funnel",
    endpoint: "/api/backsolve",
    method: "POST",
    payload: LARGE_FUNNEL,
    concurrent: 3,
    expectedLatencyP95: 5000, // 5 seconds
    timeout: 10000
  },
  {
    name: "Optimize Exhaustive N≤7",
    endpoint: "/api/optimize", 
    method: "POST",
    payload: {
      ...SMALL_FUNNEL,
      sample_count: 5000,
      use_backsolved_constants: false
    },
    concurrent: 2,
    expectedLatencyP95: 3000, // 3 seconds
    timeout: 10000
  },
  {
    name: "Optimize Heuristic N>7",
    endpoint: "/api/optimize",
    method: "POST", 
    payload: {
      ...LARGE_FUNNEL,
      sample_count: 10000,
      use_backsolved_constants: false
    },
    concurrent: 2,
    expectedLatencyP95: 15000, // 15 seconds
    timeout: 30000
  },
  {
    name: "MCP Enhanced Analysis",
    endpoint: "/api/manusFunnelEnhanced",
    method: "POST",
    payload: {
      ...SMALL_FUNNEL,
      frameworks: ['PAS', 'Fogg', 'Nielsen', 'AIDA', 'Cialdini']
    },
    concurrent: 1, // Limited concurrency for MCP
    expectedLatencyP95: 25000, // 25 seconds
    timeout: 60000
  },
  {
    name: "Agent End-to-End",
    endpoint: "/api/assessStepsMCP",
    method: "POST",
    payload: {
      steps: SMALL_FUNNEL.steps.map((step, index) => ({
        stepIndex: index,
        questions: step.questions.map(q => q.title),
        observedCR: step.observedCR,
        boosts: step.boosts
      })),
      frameworks: ['PAS', 'Fogg', 'Nielsen']
    },
    concurrent: 1,
    expectedLatencyP95: 20000, // 20 seconds
    timeout: 60000
  }
];

// Metrics collection
class MetricsCollector {
  constructor() {
    this.results = {};
  }

  recordResult(scenarioName, latency, success, error = null) {
    if (!this.results[scenarioName]) {
      this.results[scenarioName] = {
        latencies: [],
        successes: 0,
        errors: [],
        totalRequests: 0
      };
    }

    this.results[scenarioName].totalRequests++;
    this.results[scenarioName].latencies.push(latency);
    
    if (success) {
      this.results[scenarioName].successes++;
    } else {
      this.results[scenarioName].errors.push(error);
    }
  }

  getStats(scenarioName) {
    const data = this.results[scenarioName];
    if (!data || data.latencies.length === 0) {
      return null;
    }

    const sortedLatencies = [...data.latencies].sort((a, b) => a - b);
    const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)];
    const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];
    const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)];
    const avg = data.latencies.reduce((sum, lat) => sum + lat, 0) / data.latencies.length;
    const successRate = (data.successes / data.totalRequests) * 100;
    const errorRate = ((data.totalRequests - data.successes) / data.totalRequests) * 100;

    return {
      totalRequests: data.totalRequests,
      successRate: successRate.toFixed(2),
      errorRate: errorRate.toFixed(2),
      latency: {
        avg: Math.round(avg),
        p50: Math.round(p50),
        p95: Math.round(p95),
        p99: Math.round(p99),
        min: Math.round(Math.min(...data.latencies)),
        max: Math.round(Math.max(...data.latencies))
      },
      errors: data.errors
    };
  }

  generateReport() {
    console.log('\n📊 STRESS TEST RESULTS');
    console.log('=' .repeat(60));

    for (const scenarioName of Object.keys(this.results)) {
      const stats = this.getStats(scenarioName);
      if (!stats) continue;

      console.log(`\n🎯 ${scenarioName}`);
      console.log(`   Requests: ${stats.totalRequests}`);
      console.log(`   Success Rate: ${stats.successRate}%`);
      console.log(`   Error Rate: ${stats.errorRate}%`);
      console.log(`   Latency (ms):`);
      console.log(`     Avg: ${stats.latency.avg}ms`);
      console.log(`     P50: ${stats.latency.p50}ms`);
      console.log(`     P95: ${stats.latency.p95}ms`);
      console.log(`     P99: ${stats.latency.p99}ms`);
      console.log(`     Range: ${stats.latency.min}-${stats.latency.max}ms`);

      if (stats.errors.length > 0) {
        console.log(`   ❌ Errors (${stats.errors.length}):`);
        stats.errors.slice(0, 3).forEach(err => {
          console.log(`     - ${err}`);
        });
        if (stats.errors.length > 3) {
          console.log(`     ... and ${stats.errors.length - 3} more`);
        }
      }
    }
  }
}

// Test runner
async function runStressTest() {
  console.log('🚀 Starting Journey Funnel Stress Test Suite');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Concurrent Requests: ${CONCURRENT_REQUESTS}`);
  console.log(`Repeat Count: ${REPEAT_COUNT}`);
  console.log('');

  const metrics = new MetricsCollector();

  for (const scenario of STRESS_SCENARIOS) {
    console.log(`\n⏱️  Testing: ${scenario.name}`);
    console.log(`   Endpoint: ${scenario.endpoint}`);
    console.log(`   Concurrent: ${scenario.concurrent}`);
    console.log(`   Repeats: ${REPEAT_COUNT}`);

    // Create request function
    const makeRequest = async () => {
      const startTime = performance.now();
      try {
        const response = await axios({
          method: scenario.method,
          url: `${BASE_URL}${scenario.endpoint}`,
          data: scenario.payload,
          timeout: scenario.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const endTime = performance.now();
        const latency = endTime - startTime;

        if (response.status >= 200 && response.status < 300) {
          metrics.recordResult(scenario.name, latency, true);
          return { success: true, latency };
        } else {
          metrics.recordResult(scenario.name, latency, false, `HTTP ${response.status}`);
          return { success: false, latency, error: `HTTP ${response.status}` };
        }
      } catch (error) {
        const endTime = performance.now();
        const latency = endTime - startTime;
        const errorMsg = error.code || error.message || 'Unknown error';
        metrics.recordResult(scenario.name, latency, false, errorMsg);
        return { success: false, latency, error: errorMsg };
      }
    };

    // Run concurrent batches
    for (let batch = 0; batch < REPEAT_COUNT; batch++) {
      const promises = Array.from({ length: scenario.concurrent }, () => makeRequest());
      const results = await Promise.all(promises);
      
      const successCount = results.filter(r => r.success).length;
      const avgLatency = results.reduce((sum, r) => sum + r.latency, 0) / results.length;
      
      process.stdout.write(`   Batch ${batch + 1}/${REPEAT_COUNT}: ${successCount}/${scenario.concurrent} success, ${Math.round(avgLatency)}ms avg\n`);
    }
  }

  // Generate and display report
  metrics.generateReport();

  // Performance validation
  console.log('\n✅ PERFORMANCE VALIDATION');
  console.log('=' .repeat(60));

  let allTestsPassed = true;

  for (const scenario of STRESS_SCENARIOS) {
    const stats = metrics.getStats(scenario.name);
    if (!stats) continue;

    const errorRate = parseFloat(stats.errorRate);
    const p95Latency = stats.latency.p95;

    const errorRatePass = errorRate < 1.0; // < 1% error rate
    const latencyPass = p95Latency < scenario.expectedLatencyP95;

    console.log(`\n${errorRatePass && latencyPass ? '✅' : '❌'} ${scenario.name}`);
    console.log(`   Error Rate: ${stats.errorRate}% ${errorRatePass ? '✅' : '❌'} (target: <1%)`);
    console.log(`   P95 Latency: ${stats.latency.p95}ms ${latencyPass ? '✅' : '❌'} (target: <${scenario.expectedLatencyP95}ms)`);

    if (!errorRatePass || !latencyPass) {
      allTestsPassed = false;
    }
  }

  console.log(`\n${allTestsPassed ? '🎉' : '⚠️'} Overall Result: ${allTestsPassed ? 'PASSED' : 'FAILED'}`);
  
  if (!allTestsPassed) {
    console.log('\n💡 Recommendations:');
    console.log('   • Consider increasing timeout values');
    console.log('   • Reduce concurrent request limits');
    console.log('   • Optimize API performance bottlenecks');
    console.log('   • Add request rate limiting');
  }

  process.exit(allTestsPassed ? 0 : 1);
}

// CLI handling
if (require.main === module) {
  console.log('Journey Funnel Stress Test v1.0.0\n');
  
  // Check if server is running
  axios.get(`${BASE_URL}/`)
    .then(() => runStressTest())
    .catch(error => {
      console.error(`❌ Cannot connect to ${BASE_URL}`);
      console.error('   Make sure the development server is running with:');
      console.error('   npm run dev');
      process.exit(1);
    });
}

module.exports = { runStressTest, MetricsCollector }; 