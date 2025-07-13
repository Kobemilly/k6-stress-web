import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  scenarios: {
    constant_load: {
      executor: 'constant-vus',
      vus: 20,
      duration: '10m',
      tags: { scenario: 'constant_load' },
    },
    peak_hours: {
      executor: 'ramping-vus',
      startTime: '2m',
      stages: [
        { duration: '1m', target: 50 },
        { duration: '3m', target: 50 },
        { duration: '1m', target: 0 },
      ],
      tags: { scenario: 'peak_hours' },
    },
    stress_burst: {
      executor: 'ramping-arrival-rate',
      startTime: '5m',
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 500,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 100 },
        { duration: '30s', target: 10 },
      ],
      tags: { scenario: 'stress_burst' },
    },
  },
  thresholds: {
    http_req_duration: ['p(99)<3000'],
    http_req_failed: ['rate<0.1'],
    'http_req_duration{scenario:constant_load}': ['p(95)<1000'],
    'http_req_duration{scenario:peak_hours}': ['p(95)<2000'],
    'http_req_duration{scenario:stress_burst}': ['p(95)<5000'],
  },
};

const BASE_URL = 'https://httpbin.org';

export default function () {
  const scenarios = {
    constant_load: constantLoadTest,
    peak_hours: peakHoursTest,
    stress_burst: stressBurstTest,
  };
  
  const currentScenario = __ENV.SCENARIO || 'constant_load';
  const testFunction = scenarios[currentScenario] || constantLoadTest;
  
  testFunction();
}

function constantLoadTest() {
  let response = http.get(`${BASE_URL}/get?scenario=constant_load`);
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
  });
  
  sleep(1);
}

function peakHoursTest() {
  const endpoints = [
    '/get',
    '/post',
    '/status/200',
    '/json',
  ];
  
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  let response;
  
  if (endpoint === '/post') {
    response = http.post(`${BASE_URL}${endpoint}`, JSON.stringify({
      test: 'peak_hours',
      timestamp: new Date().toISOString(),
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } else {
    response = http.get(`${BASE_URL}${endpoint}?scenario=peak_hours`);
  }
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  
  sleep(Math.random() * 2);
}

function stressBurstTest() {
  const batch = http.batch([
    ['GET', `${BASE_URL}/get?scenario=stress_burst`],
    ['GET', `${BASE_URL}/uuid`],
    ['GET', `${BASE_URL}/ip`],
  ]);
  
  batch.forEach((response) => {
    check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 5000ms': (r) => r.timings.duration < 5000,
    });
  });
  
  sleep(0.5);
}

export function handleSummary(data) {
  return {
    'multi-scenario-results.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  return `
     execution: local
        script: multi-scenario-test.js
        output: -

     scenarios: (100.00%) ${data.metrics.vus_max.values.max} max VUs, ${Object.keys(data.root_group.groups).length} scenarios

     data_received..................: ${data.metrics.data_received.values.count} B  ${data.metrics.data_received.values.rate.toFixed(2)} B/s
     data_sent......................: ${data.metrics.data_sent.values.count} B  ${data.metrics.data_sent.values.rate.toFixed(2)} B/s
     http_req_blocked...............: avg=${data.metrics.http_req_blocked.values.avg.toFixed(2)}ms min=${data.metrics.http_req_blocked.values.min.toFixed(2)}ms
     http_req_connecting............: avg=${data.metrics.http_req_connecting.values.avg.toFixed(2)}ms min=${data.metrics.http_req_connecting.values.min.toFixed(2)}ms
     http_req_duration..............: avg=${data.metrics.http_req_duration.values.avg.toFixed(2)}ms min=${data.metrics.http_req_duration.values.min.toFixed(2)}ms
       { expected_response:true }...: avg=${data.metrics.http_req_duration.values.avg.toFixed(2)}ms min=${data.metrics.http_req_duration.values.min.toFixed(2)}ms
     http_req_failed................: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}% ✓ ${data.metrics.http_req_failed.values.passes} ✗ ${data.metrics.http_req_failed.values.fails}
     http_req_receiving.............: avg=${data.metrics.http_req_receiving.values.avg.toFixed(2)}ms min=${data.metrics.http_req_receiving.values.min.toFixed(2)}ms
     http_req_sending...............: avg=${data.metrics.http_req_sending.values.avg.toFixed(2)}ms min=${data.metrics.http_req_sending.values.min.toFixed(2)}ms
     http_req_waiting...............: avg=${data.metrics.http_req_waiting.values.avg.toFixed(2)}ms min=${data.metrics.http_req_waiting.values.min.toFixed(2)}ms
     http_reqs......................: ${data.metrics.http_reqs.values.count} ${data.metrics.http_reqs.values.rate.toFixed(2)}/s
     iteration_duration.............: avg=${data.metrics.iteration_duration.values.avg.toFixed(2)}ms min=${data.metrics.iteration_duration.values.min.toFixed(2)}ms
     iterations.....................: ${data.metrics.iterations.values.count} ${data.metrics.iterations.values.rate.toFixed(2)}/s
     vus............................: ${data.metrics.vus.values.min} min=${data.metrics.vus.values.min} max=${data.metrics.vus.values.max}
     vus_max........................: ${data.metrics.vus_max.values.min} min=${data.metrics.vus_max.values.min} max=${data.metrics.vus_max.values.max}
  `;
}
