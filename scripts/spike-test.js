import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 10 },     // Gradual ramp up
    { duration: '5m', target: 10 },     // Stay at normal load
    { duration: '30s', target: 1000 },  // Sudden spike
    { duration: '3m', target: 1000 },   // Maintain spike
    { duration: '30s', target: 10 },    // Quick scale down
    { duration: '5m', target: 10 },     // Stay at normal load
    { duration: '2m', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% of requests under 2s
    http_req_failed: ['rate<0.05'],     // Error rate under 5%
  },
  tags: {
    test_type: 'spike',
  },
};

export default function () {
  const endpoints = [
    'https://httpbin.org/get',
    'https://httpbin.org/status/200',
    'https://httpbin.org/delay/1',
    'https://httpbin.org/uuid',
  ];
  
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  let response = http.get(endpoint, {
    headers: {
      'User-Agent': 'k6-spike-test/1.0',
    },
  });
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 5000ms': (r) => r.timings.duration < 5000,
  });
  
  // Random sleep between 1-3 seconds
  sleep(Math.random() * 2 + 1);
}

export function handleSummary(data) {
  return {
    'spike-test-results.json': JSON.stringify(data, null, 2),
  };
}
