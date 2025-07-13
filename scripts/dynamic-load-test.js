import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// 自定義指標
let httpReqBlocked = new Trend('http_req_blocked', true);
let httpReqLookingUp = new Trend('http_req_looking_up', true);
let httpReqConnecting = new Trend('http_req_connecting', true);
let httpReqReceiving = new Trend('http_req_receiving', true);
let httpReqSending = new Trend('http_req_sending', true);
let httpReqWaiting = new Trend('http_req_waiting', true);
let errorCounter = new Counter('errors');
let successRate = new Rate('success_rate');

export let options = {
  // 動態負載階段
  stages: [
    // 暖身階段：5個用戶，持續30秒
    { duration: '30s', target: 5 },
    // 負載增加階段：逐漸增加到20個用戶，持續1分鐘
    { duration: '1m', target: 20 },
    // 高負載階段：維持20個用戶，持續2分鐘
    { duration: '2m', target: 20 },
    // 壓力測試階段：快速增加到50個用戶，持續1分鐘
    { duration: '1m', target: 50 },
    // 峰值測試階段：瞬間增加到100個用戶，持續30秒
    { duration: '30s', target: 100 },
    // 恢復階段：逐漸減少到10個用戶，持續1分鐘
    { duration: '1m', target: 10 },
    // 冷卻階段：減少到0個用戶，持續30秒
    { duration: '30s', target: 0 },
  ],
  
  // 閾值設定
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95%的請求需在500ms內完成
    'http_req_failed': ['rate<0.05'],   // 錯誤率需低於5%
    'success_rate': ['rate>0.95'],      // 成功率需高於95%
    'errors': ['count<10'],             // 總錯誤數需少於10個
  },
  
  // 標籤設定
  tags: {
    test_type: 'dynamic_load_test',
    environment: 'testing',
  },
};

export default function() {
  // 記錄測試開始時間
  let startTime = new Date().getTime();
  
  // 模擬不同的用戶行為
  let scenarios = [
    () => testHomePage(),
    () => testAPIEndpoint(),
    () => testStaticContent(),
  ];
  
  // 隨機選擇一個測試場景
  let selectedScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  selectedScenario();
  
  // 隨機等待時間（1-3秒）
  sleep(Math.random() * 2 + 1);
}

function testHomePage() {
  let response = http.get('http://test-app:80/', {
    tags: { endpoint: 'homepage' },
  });
  
  // 記錄詳細指標
  httpReqBlocked.add(response.timings.blocked);
  httpReqLookingUp.add(response.timings.looking_up);
  httpReqConnecting.add(response.timings.connecting);
  httpReqReceiving.add(response.timings.receiving);
  httpReqSending.add(response.timings.sending);
  httpReqWaiting.add(response.timings.waiting);
  
  let success = check(response, {
    'Homepage status is 200': (r) => r.status === 200,
    'Homepage response time < 500ms': (r) => r.timings.duration < 500,
    'Homepage body size > 0': (r) => r.body.length > 0,
  });
  
  successRate.add(success);
  if (!success) {
    errorCounter.add(1);
    console.log(`Homepage test failed: Status=${response.status}, Duration=${response.timings.duration}ms`);
  }
}

function testAPIEndpoint() {
  // 模擬 API 請求
  let response = http.get('http://test-app:80/', {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'k6-load-test/1.0',
    },
    tags: { endpoint: 'api' },
  });
  
  let success = check(response, {
    'API status is 200': (r) => r.status === 200,
    'API response time < 1000ms': (r) => r.timings.duration < 1000,
  });
  
  successRate.add(success);
  if (!success) {
    errorCounter.add(1);
    console.log(`API test failed: Status=${response.status}, Duration=${response.timings.duration}ms`);
  }
}

function testStaticContent() {
  let response = http.get('http://test-app:80/', {
    tags: { endpoint: 'static' },
  });
  
  let success = check(response, {
    'Static content status is 200': (r) => r.status === 200,
    'Static content response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  successRate.add(success);
  if (!success) {
    errorCounter.add(1);
    console.log(`Static content test failed: Status=${response.status}, Duration=${response.timings.duration}ms`);
  }
}

// 測試完成後的總結函數
export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data, null, 2),
  };
}
