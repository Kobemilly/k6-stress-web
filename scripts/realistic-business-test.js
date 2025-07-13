import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// 自定義指標 - 真實業務情境測試
let businessLoadErrors = new Rate('business_load_errors');
let businessLoadResponseTime = new Trend('business_load_response_time');
let businessLoadRequests = new Counter('business_load_requests');
let peakHourMetrics = new Trend('peak_hour_metrics');
let normalHourMetrics = new Trend('normal_hour_metrics');
let surgeLoadMetrics = new Trend('surge_load_metrics');
let dailyActiveUsers = new Counter('daily_active_users');

// 真實業務情境測試配置
// 基於：假設一天 10,000 人，高峰期 2 小時內 50% 流量
export const options = {
  scenarios: {
    // 情境1：正常時段流量 (一般平均流量)
    // 剩餘 22 小時處理 50% 流量 = 5,000 人 ÷ 22 小時 ≈ 227 人/小時 ≈ 4 人/分鐘
    normal_hours: {
      executor: 'constant-vus',
      vus: 5, // 約 4-5 人同時在線
      duration: '5m',
      tags: { scenario: 'normal_hours' },
      exec: 'normalBusinessFlow',
    },

    // 情境2：高峰時段流量 
    // 2 小時內 50% 流量 = 5,000 人 ÷ 2 小時 = 2,500 人/小時 ≈ 42 人/分鐘
    peak_hours: {
      executor: 'ramping-vus',
      startTime: '5m',
      stages: [
        { duration: '2m', target: 15 },  // 緩慢進入高峰期
        { duration: '8m', target: 45 },  // 高峰期維持 (約 42 人/分鐘)
        { duration: '2m', target: 15 },  // 高峰期結束
        { duration: '1m', target: 5 },   // 回到正常流量
      ],
      tags: { scenario: 'peak_hours' },
      exec: 'peakBusinessFlow',
    },

    // 情境3：瞬間湧入測試 (10倍流量)
    // 正常 0.7 人/秒 × 10 = 7 人/秒 ≈ 420 人/分鐘
    surge_load: {
      executor: 'ramping-vus',
      startTime: '18m',
      stages: [
        { duration: '30s', target: 70 },  // 瞬間湧入 10 倍流量
        { duration: '2m', target: 70 },   // 維持高壓力
        { duration: '30s', target: 45 },  // 回到高峰期流量
        { duration: '1m', target: 15 },   // 逐漸恢復
      ],
      tags: { scenario: 'surge_load' },
      exec: 'surgeLoadFlow',
    },
  },

  // 效能門檻設定
  thresholds: {
    // 正常時段 SLA
    'http_req_duration{scenario:normal_hours}': ['p(95)<1000'],
    'http_req_failed{scenario:normal_hours}': ['rate<0.01'], // < 1% 錯誤率
    
    // 高峰時段 SLA (較寬鬆)
    'http_req_duration{scenario:peak_hours}': ['p(95)<2000'],
    'http_req_failed{scenario:peak_hours}': ['rate<0.05'], // < 5% 錯誤率
    
    // 瞬間湧入承受度
    'http_req_duration{scenario:surge_load}': ['p(95)<5000'],
    'http_req_failed{scenario:surge_load}': ['rate<0.15'], // < 15% 錯誤率

    // 整體效能
    'business_load_errors': ['rate<0.1'],
    'business_load_response_time': ['p(95)<3000'],
  },
};

// 測試目標設定
const BASE_URL = __ENV.TARGET_URL || 'http://10.64.8.34';

export function setup() {
  console.log('🏢 開始真實業務情境測試...');
  console.log('📊 測試基準：一天 10,000 人的網站流量模擬');
  console.log('');
  console.log('📈 流量分析：');
  console.log('   • 總用戶：10,000 人/天');
  console.log('   • 高峰期：2 小時內 50% 流量 (5,000 人)');
  console.log('   • 正常期：22 小時內 50% 流量 (5,000 人)');
  console.log('');
  console.log('⏱️ 時段計算：');
  console.log('   • 正常時段：227 人/小時 ≈ 4 人/分鐘');
  console.log('   • 高峰時段：2,500 人/小時 ≈ 42 人/分鐘');
  console.log('   • 瞬間湧入：10 倍流量 ≈ 7 人/秒');
  console.log('');
  
  // 連通性測試
  const res = http.get(`${BASE_URL}/index.php`);
  if (res.status !== 200) {
    console.error('❌ 目標服務無法連接');
    return null;
  }
  
  console.log('✅ 目標服務連通性測試成功');
  console.log(`   響應時間: ${res.timings.duration}ms`);
  console.log(`   響應大小: ${res.body.length} bytes`);
  console.log('');
  console.log('🎬 開始測試執行...');
  console.log('');
  
  return { targetUrl: BASE_URL };
}

// 預設執行函數 (當使用命令列參數覆蓋 scenarios 時使用)
export default function() {
  // 隨機選擇一個業務流程來執行
  const scenarios = ['normal', 'peak', 'surge'];
  const selectedScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  
  const data = { targetUrl: BASE_URL };
  
  if (selectedScenario === 'normal') {
    normalBusinessFlow(data);
  } else if (selectedScenario === 'peak') {
    peakBusinessFlow(data);
  } else {
    surgeLoadFlow(data);
  }
}

// 正常時段業務流程
export function normalBusinessFlow(data) {
  const responses = simulateBusinessFlow(data, 'normal');
  
  // 記錄正常時段指標
  normalHourMetrics.add(responses.duration);
  businessLoadRequests.add(1);
  dailyActiveUsers.add(1);
  
  // 模擬用戶瀏覽行為 (正常時段用戶較不急躁)
  sleep(Math.random() * 3 + 2); // 2-5 秒瀏覽時間
}

// 高峰時段業務流程  
export function peakBusinessFlow(data) {
  const responses = simulateBusinessFlow(data, 'peak');
  
  // 記錄高峰時段指標
  peakHourMetrics.add(responses.duration);
  businessLoadRequests.add(1);
  dailyActiveUsers.add(1);
  
  // 模擬用戶瀏覽行為 (高峰期用戶較急躁)
  sleep(Math.random() * 2 + 1); // 1-3 秒瀏覽時間
}

// 瞬間湧入業務流程
export function surgeLoadFlow(data) {
  const responses = simulateBusinessFlow(data, 'surge');
  
  // 記錄瞬間湧入指標
  surgeLoadMetrics.add(responses.duration);
  businessLoadRequests.add(1);
  dailyActiveUsers.add(1);
  
  // 模擬用戶瀏覽行為 (緊急情況，用戶很急躁)
  sleep(Math.random() * 1 + 0.5); // 0.5-1.5 秒瀏覽時間
}

// 模擬真實業務流程
function simulateBusinessFlow(data, scenario) {
  const startTime = Date.now();
  let totalDuration = 0;
  
  // 1. 首頁訪問 (所有用戶都會做)
  const homeRes = http.get(`${data.targetUrl}/index.php`, {
    tags: { 
      name: 'homepage',
      scenario: scenario,
      endpoint: 'index.php',
      page_type: 'landing_page'
    }
  });
  
  const homeCheck = check(homeRes, {
    '首頁狀態為 200': (r) => r.status === 200,
    '首頁響應時間 < 3s': (r) => r.timings.duration < 3000,
    '首頁內容載入正確': (r) => r.body.length > 1000,
  });
  
  if (!homeCheck) {
    businessLoadErrors.add(1);
  }
  
  totalDuration += homeRes.timings.duration;
  
  // 2. 根據情境模擬不同的用戶行為
  if (scenario === 'normal') {
    // 正常時段：用戶會仔細瀏覽多個頁面
    simulateDetailedBrowsing(data, scenario);
  } else if (scenario === 'peak') {
    // 高峰期：用戶目標明確，快速操作
    simulateTargetedBrowsing(data, scenario);
  } else if (scenario === 'surge') {
    // 瞬間湧入：可能是促銷活動，用戶行為集中
    simulatePromotionBrowsing(data, scenario);
  }
  
  const endTime = Date.now();
  const sessionDuration = endTime - startTime;
  
  businessLoadResponseTime.add(sessionDuration);
  
  return { duration: sessionDuration };
}

// 詳細瀏覽 (正常時段)
function simulateDetailedBrowsing(data, scenario) {
  // 模擬瀏覽產品頁面
  const productRes = http.get(`${data.targetUrl}/index.php?page=products`, {
    tags: { 
      name: 'products_page',
      scenario: scenario,
      endpoint: 'index.php?page=products',
      page_type: 'product_listing'
    }
  });
  
  check(productRes, {
    '產品頁狀態為 200': (r) => r.status === 200,
  });
  
  sleep(2); // 瀏覽產品
  
  // 模擬查看詳細資訊
  const detailRes = http.get(`${data.targetUrl}/index.php?page=detail&id=123`, {
    tags: { 
      name: 'product_detail',
      scenario: scenario,
      endpoint: 'index.php?page=detail&id=123',
      page_type: 'product_detail'
    }
  });
  
  check(detailRes, {
    '詳細頁狀態為 200': (r) => r.status === 200,
  });
}

// 目標性瀏覽 (高峰期)
function simulateTargetedBrowsing(data, scenario) {
  // 高峰期用戶通常有明確目標
  const searchRes = http.get(`${data.targetUrl}/index.php?search=特定商品`, {
    tags: { 
      name: 'search_results',
      scenario: scenario,
      endpoint: 'index.php?search=特定商品',
      page_type: 'search_page'
    }
  });
  
  check(searchRes, {
    '搜尋結果狀態為 200': (r) => r.status === 200,
  });
  
  sleep(1); // 快速決定
}

// 促銷活動瀏覽 (瞬間湧入)
function simulatePromotionBrowsing(data, scenario) {
  // 瞬間湧入通常是促銷活動
  const promoRes = http.get(`${data.targetUrl}/index.php?promo=flash_sale`, {
    tags: { 
      name: 'flash_sale_promotion',
      scenario: scenario,
      endpoint: 'index.php?promo=flash_sale',
      page_type: 'promotion_page'
    }
  });
  
  check(promoRes, {
    '促銷頁狀態為 200': (r) => r.status === 200,
    '促銷頁響應時間可接受': (r) => r.timings.duration < 10000, // 湧入時可接受較慢
  });
}

export function teardown(data) {
  console.log('');
  console.log('🏁 真實業務情境測試完成！');
  console.log('');
  console.log('📋 測試摘要：');
  console.log('   測試類型: realistic_business_scenario');
  console.log('   測試描述: 基於一天 10,000 人的真實網站流量模擬');
  console.log(`   開始時間: ${new Date().toISOString()}`);
  console.log('');
  console.log('🎯 測試情境：');
  console.log('   ✅ 正常時段 (5分鐘)：模擬平均流量 5 VU');
  console.log('   ✅ 高峰時段 (13分鐘)：模擬集中流量 15-45 VU');  
  console.log('   ✅ 瞬間湧入 (4分鐘)：模擬 10 倍流量衝擊 70 VU');
  console.log('');
  console.log('📊 關鍵分析指標：');
  console.log('   • 正常時段 vs 高峰時段效能對比');
  console.log('   • 瞬間流量湧入的系統承受能力');
  console.log('   • 不同時段的用戶體驗品質');
  console.log('   • 真實業務場景下的錯誤率分佈');
  console.log('');
  console.log('🔍 建議監控重點：');
  console.log('   • 高峰期間的 95% 響應時間是否 < 2 秒');
  console.log('   • 瞬間湧入時錯誤率是否 < 15%');
  console.log('   • 正常時段的基準效能表現');
  console.log('   • 各時段的資源使用率變化');
  console.log('');
}
