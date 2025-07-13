import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// 自定義指標
let errorRate = new Rate('errors');
let responseTime = new Trend('custom_response_time');
let requestCount = new Counter('requests_count');

// 測試配置
export const options = {
  // 負載模式：小規模測試 (10個並發用戶)
  stages: [
    { duration: '30s', target: 2 },   // 30秒內增加到2個用戶（緩慢啟動）
    { duration: '1m', target: 5 },    // 1分鐘內增加到5個用戶
    { duration: '1m', target: 10 },   // 1分鐘內增加到10個用戶（目標負載）
    { duration: '3m', target: 10 },   // 維持10個用戶3分鐘（穩定測試）
    { duration: '30s', target: 5 },   // 30秒內減少到5個用戶
    { duration: '30s', target: 0 },   // 30秒內減少到0個用戶
  ],
  
  // 閾值設定 - 適中的性能要求
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95%的請求應在3000ms內完成
    http_req_failed: ['rate<0.10'],    // 錯誤率應低於10%
    errors: ['rate<0.10'],             // 自定義錯誤率應低於10%
    'http_req_duration{group:::main_page}': ['p(95)<2500'], // 主頁面要求
    'http_req_duration{group:::api_calls}': ['p(95)<1500'], // API 調用要求
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
  // 測試目標 URL - 使用外部可訪問的服務
  const baseUrl = 'https://httpbin.org';
  
  // 模擬企業用戶的不同行為模式
  const userBehaviors = [
    'browser_user',    // 瀏覽器用戶（70%）
    'api_user',        // API 用戶（20%）
    'mobile_user'      // 手機用戶（10%）
  ];
  
  const userType = userBehaviors[Math.floor(Math.random() * userBehaviors.length)];
  
  try {
    if (userType === 'browser_user') {
      // 模擬瀏覽器用戶行為
      simulateBrowserUser(baseUrl);
    } else if (userType === 'api_user') {
      // 模擬 API 用戶行為
      simulateApiUser(baseUrl);
    } else {
      // 模擬手機用戶行為
      simulateMobileUser(baseUrl);
    }
    
  } catch (error) {
    console.log(`請求錯誤 [${userType}]: ${error}`);
    errorRate.add(true);
  }
}

// 模擬瀏覽器用戶行為
function simulateBrowserUser(baseUrl) {
  // 主頁面訪問
  let response = http.get(`${baseUrl}/get`, {
    timeout: '30s',
    tags: { group: 'main_page', user_type: 'browser' }
  });
  
  let result = check(response, {
    '[Browser] status is 200': (r) => r.status === 200,
    '[Browser] response time < 2000ms': (r) => r.timings.duration < 2000,
    '[Browser] content contains origin': (r) => r.body && r.body.includes('origin'),
  });
  
  errorRate.add(!result);
  responseTime.add(response.timings.duration);
  requestCount.add(1);
  
  // 模擬用戶瀏覽行為
  sleep(Math.random() * 3 + 1); // 1-4秒的瀏覽時間
  
  // 第二個頁面
  response = http.get(`${baseUrl}/json`, {
    timeout: '30s',
    tags: { group: 'content_page', user_type: 'browser' }
  });
  
  check(response, {
    '[Browser] JSON endpoint works': (r) => r.status === 200,
  });
  
  sleep(Math.random() * 2 + 1); // 1-3秒
}

// 模擬 API 用戶行為
function simulateApiUser(baseUrl) {
  // API 調用
  let response = http.get(`${baseUrl}/uuid`, {
    timeout: '10s',
    tags: { group: 'api_calls', user_type: 'api' }
  });
  
  let result = check(response, {
    '[API] status is 200': (r) => r.status === 200,
    '[API] response time < 1000ms': (r) => r.timings.duration < 1000,
    '[API] has UUID': (r) => r.body && r.body.includes('uuid'),
  });
  
  errorRate.add(!result);
  responseTime.add(response.timings.duration);
  requestCount.add(1);
  
  // API 用戶通常連續調用
  sleep(0.5);
  
  // 狀態檢查 API
  response = http.get(`${baseUrl}/status/200`, {
    timeout: '10s',
    tags: { group: 'api_calls', user_type: 'api' }
  });
  
  check(response, {
    '[API] status check works': (r) => r.status === 200,
  });
  
  sleep(Math.random() * 1); // 0-1秒
}

// 模擬手機用戶行為
function simulateMobileUser(baseUrl) {
  // 手機用戶通常網絡較慢
  let response = http.get(`${baseUrl}/get`, {
    timeout: '45s', // 更長的超時時間
    tags: { group: 'mobile_page', user_type: 'mobile' }
  });
  
  let result = check(response, {
    '[Mobile] status is 200': (r) => r.status === 200,
    '[Mobile] response time < 5000ms': (r) => r.timings.duration < 5000, // 更寬鬆的要求
    '[Mobile] content loads': (r) => r.body && r.body.length > 0,
  });
  
  errorRate.add(!result);
  responseTime.add(response.timings.duration);
  requestCount.add(1);
  
  // 手機用戶瀏覽時間較長
  sleep(Math.random() * 5 + 2); // 2-7秒
}

// 設置函數（測試開始前執行）
export function setup() {
  console.log('🚀 開始小規模負載測試...');
  console.log('📊 目標：測試10個並發用戶');
  console.log('⏱️ 總測試時間：約7分鐘');
  return {};
}

// 清理函數（測試結束後執行）
export function teardown(data) {
  console.log('負載測試完成！');
}
