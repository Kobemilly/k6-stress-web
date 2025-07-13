import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// 自定義指標
let errorRate = new Rate('errors');
let responseTime = new Trend('custom_response_time');
let requestCount = new Counter('requests_count');

// 測試配置 - 企業級負載測試版本
export const options = {
  // 負載模式：企業級測試 (100個並發用戶)
  stages: [
    { duration: '30s', target: 10 },  // 30秒內增加到10個用戶（緩慢啟動）
    { duration: '1m', target: 25 },   // 1分鐘內增加到25個用戶
    { duration: '1m', target: 50 },   // 1分鐘內增加到50個用戶
    { duration: '1m', target: 75 },   // 1分鐘內增加到75個用戶
    { duration: '1m', target: 100 },  // 1分鐘內增加到100個用戶（目標負載）
    { duration: '3m', target: 100 },  // 維持100個用戶3分鐘（穩定測試）
    { duration: '1m', target: 50 },   // 1分鐘內減少到50個用戶
    { duration: '30s', target: 0 },   // 30秒內減少到0個用戶
  ],
  
  // 閾值設定 - 企業級性能要求
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95%的請求應在3000ms內完成
    http_req_failed: ['rate<0.05'],    // 錯誤率應低於5%（更嚴格）
    errors: ['rate<0.05'],             // 自定義錯誤率應低於5%
    'http_req_duration{group:::main_page}': ['p(95)<2500'], // 主頁面要求
    'http_req_duration{group:::api_calls}': ['p(95)<1500'], // API 調用要求
    'http_req_duration{group:::mobile_page}': ['p(95)<5000'], // 手機用戶要求
    http_reqs: ['rate>10'],            // 每秒至少10個請求
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
  // 測試目標 URL - 使用指定的企業內部服務
  const baseUrl = 'http://10.64.8.34';
  
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
  let response = http.get(`${baseUrl}/index.php`, {
    timeout: '30s',
    tags: { group: 'main_page', user_type: 'browser' }
  });
  
  let result = check(response, {
    '[Browser] status is 200': (r) => r.status === 200,
    '[Browser] response time < 2000ms': (r) => r.timings.duration < 2000,
    '[Browser] content loads': (r) => r.body && r.body.length > 0,
  });
  
  errorRate.add(!result);
  responseTime.add(response.timings.duration);
  requestCount.add(1);
  
  // 模擬用戶瀏覽行為
  sleep(Math.random() * 2 + 1); // 1-3秒的瀏覽時間
  
  // 第二個頁面訪問
  response = http.get(`${baseUrl}/`, {
    timeout: '30s',
    tags: { group: 'content_page', user_type: 'browser' }
  });
  
  check(response, {
    '[Browser] Home page works': (r) => r.status === 200,
  });
  
  sleep(Math.random() * 1 + 1); // 1-2秒
}

// 模擬 API 用戶行為
function simulateApiUser(baseUrl) {
  // API 調用主頁面
  let response = http.get(`${baseUrl}/index.php`, {
    timeout: '10s',
    tags: { group: 'api_calls', user_type: 'api' }
  });
  
  let result = check(response, {
    '[API] status is 200': (r) => r.status === 200,
    '[API] response time < 1000ms': (r) => r.timings.duration < 1000,
    '[API] content loads': (r) => r.body && r.body.length > 0,
  });
  
  errorRate.add(!result);
  responseTime.add(response.timings.duration);
  requestCount.add(1);
  
  // API 用戶通常連續調用
  sleep(0.3);
  
  // 根目錄檢查
  response = http.get(`${baseUrl}/`, {
    timeout: '10s',
    tags: { group: 'api_calls', user_type: 'api' }
  });
  
  check(response, {
    '[API] root check works': (r) => r.status === 200,
  });
  
  sleep(Math.random() * 0.5); // 0-0.5秒
}

// 模擬手機用戶行為
function simulateMobileUser(baseUrl) {
  // 手機用戶通常網絡較慢
  let response = http.get(`${baseUrl}/index.php`, {
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
  sleep(Math.random() * 3 + 1); // 1-4秒
}

// 設置函數（測試開始前執行）
export function setup() {
  console.log('🚀 開始企業級負載測試...');
  console.log('🎯 測試目標：http://10.64.8.34/index.php');
  console.log('📊 目標：測試100個並發用戶');
  console.log('⏱️ 總測試時間：約9分鐘');
  console.log('⚠️  警告：這是高負載測試，請確保目標服務器能承受此負載');
  return {};
}

// 清理函數（測試結束後執行）
export function teardown(data) {
  console.log('負載測試完成！');
}
