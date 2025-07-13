import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

// 測試配置
export const options = {
  scenarios: {
    // 負載測試情境
    load_test: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '2m', target: 10 },
        { duration: '5m', target: 10 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    
    // 壓力測試情境
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '1m', target: 20 },
        { duration: '3m', target: 20 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      startTime: '10m', // 在負載測試完成後開始
    },
  },
  
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.05'],
    http_reqs: ['rate>10'],
  },
  
  // 輸出到 InfluxDB
  ext: {
    influxdb: {
      url: 'http://influxdb:8086',
      database: 'k6',
      username: 'k6',
      password: 'k6password',
    },
  },
};

// 測試數據
const testData = {
  users: [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
    { id: 3, name: 'Charlie' },
  ],
};

// 主要測試函數
export default function() {
  // 模擬不同的用戶行為
  let userBehavior = Math.random();
  
  if (userBehavior < 0.7) {
    // 70% 機率：正常瀏覽
    browsePage();
  } else if (userBehavior < 0.9) {
    // 20% 機率：搜索功能
    searchContent();
  } else {
    // 10% 機率：提交表單
    submitForm();
  }
  
  sleep(Math.random() * 3 + 1); // 1-4秒的隨機等待
}

function browsePage() {
  let response = http.get('http://test-app:80');
  check(response, {
    'browse page status is 200': (r) => r.status === 200,
    'browse page response time < 1000ms': (r) => r.timings.duration < 1000,
  });
}

function searchContent() {
  let params = {
    q: 'test query',
    limit: 10,
  };
  
  let response = http.get('http://test-app:80', { params });
  check(response, {
    'search status is 200': (r) => r.status === 200,
    'search response time < 1500ms': (r) => r.timings.duration < 1500,
  });
}

function submitForm() {
  let formData = {
    name: testData.users[Math.floor(Math.random() * testData.users.length)].name,
    email: 'test@example.com',
    message: 'This is a test message',
  };
  
  let response = http.post('http://test-app:80/submit', formData);
  check(response, {
    'form submission handled': (r) => r.status >= 200 && r.status < 500,
  });
}

// 生成 HTML 報告
export function handleSummary(data) {
  return {
    '/results/summary.html': htmlReport(data),
    '/results/summary.json': JSON.stringify(data),
  };
}
