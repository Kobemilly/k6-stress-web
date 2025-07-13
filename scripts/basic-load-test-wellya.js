import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// 自定義指標
let errorRate = new Rate('errors');
let responseTime = new Trend('custom_response_time');
let requestCount = new Counter('requests_count');

// 測試配置
export const options = {
  // 負載模式：逐步增加虛擬用戶
  stages: [
    { duration: '30s', target: 5 },   // 30秒內增加到5個用戶
    { duration: '1m', target: 10 },   // 1分鐘內增加到10個用戶
    { duration: '1m', target: 15 },   // 1分鐘內增加到15個用戶
    { duration: '30s', target: 0 },   // 30秒內減少到0個用戶
  ],
  
  // 閾值設定
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95%的請求應在500ms內完成
    http_req_failed: ['rate<0.1'],    // 錯誤率應低於10%
    errors: ['rate<0.1'],             // 自定義錯誤率應低於10%
  },
  
  // 輸出到 InfluxDB
  ext: {
    loadimpact: {
      distribution: {
        'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 100 },
      },
    },
  },
};

// 測試函數
export default function () {
  // 測試目標 URL
  const baseUrl = 'http://10.64.8.34/index.php';
  
  // 測試首頁
  let response = http.get(`${baseUrl}/`);
  
  // 檢查回應
  let result = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'content contains nginx': (r) => r.body.includes('nginx') || r.body.includes('Welcome'),
  });
  
  // 記錄自定義指標
  errorRate.add(!result);
  responseTime.add(response.timings.duration);
  requestCount.add(1);
  
  // 模擬用戶行為
  sleep(1);
  
  // 測試 API 端點（如果存在）
  response = http.get(`${baseUrl}/api/health`);
  check(response, {
    'health check status': (r) => r.status === 200 || r.status === 404, // 404 也是正常的
  });
  
  sleep(Math.random() * 2); // 隨機等待 0-2 秒
}

// 設置函數（測試開始前執行）
export function setup() {
  console.log('開始負載測試...');
  return {};
}

// 清理函數（測試結束後執行）
export function teardown(data) {
  console.log('負載測試完成！');
}
