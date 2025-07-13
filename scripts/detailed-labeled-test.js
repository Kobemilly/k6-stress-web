import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// 自定義指標 - 帶標籤的詳細業務指標
let pageLoadMetrics = new Trend('page_load_time', true); // 啟用標籤
let apiResponseMetrics = new Trend('api_response_time', true);
let userJourneyMetrics = new Trend('user_journey_time', true);
let errorsByEndpoint = new Rate('errors_by_endpoint', true);
let requestsByPageType = new Counter('requests_by_page_type', true);

// 真實業務情境測試配置 - 帶詳細標籤
export const options = {
  scenarios: {
    normal_hours: {
      executor: 'constant-vus',
      vus: 5,
      duration: '3m',
      tags: { test_type: 'normal_load', environment: 'production' },
      exec: 'normalBusinessFlow',
    },
    peak_hours: {
      executor: 'ramping-vus',
      startTime: '3m',
      stages: [
        { duration: '1m', target: 15 },
        { duration: '3m', target: 45 },
        { duration: '1m', target: 15 },
      ],
      tags: { test_type: 'peak_load', environment: 'production' },
      exec: 'peakBusinessFlow',
    },
    surge_load: {
      executor: 'ramping-vus',
      startTime: '8m',
      stages: [
        { duration: '30s', target: 70 },
        { duration: '1m', target: 70 },
        { duration: '30s', target: 20 },
      ],
      tags: { test_type: 'surge_load', environment: 'production' },
      exec: 'surgeLoadFlow',
    },
  },
  
  thresholds: {
    'http_req_duration{name:homepage}': ['p(95)<1000'],
    'http_req_duration{name:products_page}': ['p(95)<1500'],
    'http_req_duration{name:search_results}': ['p(95)<2000'],
    'http_req_duration{name:flash_sale_promotion}': ['p(95)<3000'],
    'http_req_failed{page_type:landing_page}': ['rate<0.01'],
    'http_req_failed{page_type:product_listing}': ['rate<0.02'],
    'http_req_failed{page_type:promotion_page}': ['rate<0.05'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://10.64.8.34';

export function setup() {
  console.log('🏷️ 開始帶標籤的詳細業務測試...');
  console.log('📊 此測試將產生詳細的標籤化數據，類似 JMeter 報告格式');
  console.log('');
  
  // 連通性測試
  const res = http.get(`${BASE_URL}/index.php`, {
    tags: { 
      name: 'connectivity_test',
      endpoint: 'index.php',
      page_type: 'system_check',
      test_phase: 'setup'
    }
  });
  
  if (res.status !== 200) {
    console.error('❌ 目標服務無法連接');
    return null;
  }
  
  console.log('✅ 目標服務連通性測試成功');
  console.log(`   響應時間: ${res.timings.duration}ms`);
  console.log('');
  
  return { targetUrl: BASE_URL };
}

// 預設執行函數
export default function() {
  const data = { targetUrl: BASE_URL };
  normalBusinessFlow(data);
}

// 正常時段業務流程
export function normalBusinessFlow(data) {
  simulateCompleteUserJourney(data, 'normal_hours');
  sleep(Math.random() * 3 + 2);
}

// 高峰時段業務流程  
export function peakBusinessFlow(data) {
  simulateCompleteUserJourney(data, 'peak_hours');
  sleep(Math.random() * 2 + 1);
}

// 瞬間湧入業務流程
export function surgeLoadFlow(data) {
  simulateCompleteUserJourney(data, 'surge_load');
  sleep(Math.random() * 1 + 0.5);
}

// 完整用戶旅程模擬
function simulateCompleteUserJourney(data, scenario) {
  const journeyStart = Date.now();
  
  // 1. 首頁載入
  const homeRes = http.get(`${data.targetUrl}/index.php`, {
    tags: { 
      name: 'homepage',
      scenario: scenario,
      endpoint: 'index.php',
      page_type: 'landing_page',
      user_action: 'initial_visit',
      content_type: 'html'
    }
  });
  
  const homeCheck = check(homeRes, {
    '首頁載入成功': (r) => r.status === 200,
    '首頁響應時間正常': (r) => r.timings.duration < 3000,
    '首頁內容完整': (r) => r.body.length > 1000,
  }, { 
    page: 'homepage', 
    scenario: scenario 
  });
  
  // 記錄頁面載入指標
  pageLoadMetrics.add(homeRes.timings.duration, {
    page: 'homepage',
    scenario: scenario,
    status: homeRes.status.toString()
  });
  
  requestsByPageType.add(1, {
    page_type: 'landing_page',
    scenario: scenario
  });
  
  if (!homeCheck) {
    errorsByEndpoint.add(1, {
      endpoint: 'index.php',
      error_type: 'page_load_failure'
    });
  }
  
  sleep(1); // 模擬用戶瀏覽時間
  
  // 2. 產品頁瀏覽
  const productsRes = http.get(`${data.targetUrl}/index.php?page=products`, {
    tags: { 
      name: 'products_page',
      scenario: scenario,
      endpoint: 'index.php?page=products',
      page_type: 'product_listing',
      user_action: 'browse_products',
      content_type: 'html'
    }
  });
  
  check(productsRes, {
    '產品頁載入成功': (r) => r.status === 200,
    '產品頁響應時間合理': (r) => r.timings.duration < 2000,
  }, { 
    page: 'products', 
    scenario: scenario 
  });
  
  pageLoadMetrics.add(productsRes.timings.duration, {
    page: 'products_listing',
    scenario: scenario,
    status: productsRes.status.toString()
  });
  
  requestsByPageType.add(1, {
    page_type: 'product_listing',
    scenario: scenario
  });
  
  sleep(2); // 瀏覽產品
  
  // 3. 搜尋功能
  const searchRes = http.get(`${data.targetUrl}/index.php?search=商品關鍵字&category=electronics`, {
    tags: { 
      name: 'search_results',
      scenario: scenario,
      endpoint: 'index.php?search=商品關鍵字',
      page_type: 'search_page',
      user_action: 'search_products',
      search_term: '商品關鍵字',
      content_type: 'html'
    }
  });
  
  check(searchRes, {
    '搜尋結果載入成功': (r) => r.status === 200,
    '搜尋響應時間快速': (r) => r.timings.duration < 1500,
  }, { 
    page: 'search', 
    scenario: scenario 
  });
  
  apiResponseMetrics.add(searchRes.timings.duration, {
    api_type: 'search',
    scenario: scenario,
    status: searchRes.status.toString()
  });
  
  requestsByPageType.add(1, {
    page_type: 'search_page',
    scenario: scenario
  });
  
  sleep(1);
  
  // 4. 產品詳細頁
  const detailRes = http.get(`${data.targetUrl}/index.php?page=detail&id=12345&variant=red`, {
    tags: { 
      name: 'product_detail',
      scenario: scenario,
      endpoint: 'index.php?page=detail&id=12345',
      page_type: 'product_detail',
      user_action: 'view_product_detail',
      product_id: '12345',
      content_type: 'html'
    }
  });
  
  check(detailRes, {
    '產品詳情載入成功': (r) => r.status === 200,
    '詳情頁響應時間正常': (r) => r.timings.duration < 2500,
  }, { 
    page: 'product_detail', 
    scenario: scenario 
  });
  
  pageLoadMetrics.add(detailRes.timings.duration, {
    page: 'product_detail',
    scenario: scenario,
    status: detailRes.status.toString()
  });
  
  requestsByPageType.add(1, {
    page_type: 'product_detail',
    scenario: scenario
  });
  
  // 5. 模擬不同情境的特殊行為
  if (scenario === 'surge_load') {
    // 促銷頁面 (瞬間湧入時)
    const promoRes = http.get(`${data.targetUrl}/index.php?promo=flash_sale&discount=50`, {
      tags: { 
        name: 'flash_sale_promotion',
        scenario: scenario,
        endpoint: 'index.php?promo=flash_sale',
        page_type: 'promotion_page',
        user_action: 'access_promotion',
        promotion_type: 'flash_sale',
        content_type: 'html'
      }
    });
    
    check(promoRes, {
      '促銷頁載入成功': (r) => r.status === 200,
      '促銷頁在高負載下可用': (r) => r.timings.duration < 5000,
    }, { 
      page: 'promotion', 
      scenario: scenario 
    });
    
    pageLoadMetrics.add(promoRes.timings.duration, {
      page: 'flash_sale',
      scenario: scenario,
      status: promoRes.status.toString()
    });
    
    requestsByPageType.add(1, {
      page_type: 'promotion_page',
      scenario: scenario
    });
  }
  
  // 記錄完整用戶旅程時間
  const journeyEnd = Date.now();
  const totalJourneyTime = journeyEnd - journeyStart;
  
  userJourneyMetrics.add(totalJourneyTime, {
    scenario: scenario,
    journey_type: 'complete_user_flow'
  });
}

export function teardown(data) {
  console.log('');
  console.log('🏁 帶標籤的詳細業務測試完成！');
  console.log('');
  console.log('📋 標籤化數據摘要：');
  console.log('   ✅ 頁面載入時間 (依頁面類型分組)');
  console.log('   ✅ API 響應時間 (依 API 類型分組)');
  console.log('   ✅ 用戶旅程時間 (依情境分組)');
  console.log('   ✅ 錯誤率 (依端點分組)');
  console.log('   ✅ 請求量 (依頁面類型分組)');
  console.log('');
  console.log('🔍 在 Grafana 中可以看到以下標籤分組：');
  console.log('   • name: homepage, products_page, search_results, product_detail, flash_sale_promotion');
  console.log('   • page_type: landing_page, product_listing, search_page, product_detail, promotion_page');
  console.log('   • scenario: normal_hours, peak_hours, surge_load');
  console.log('   • user_action: initial_visit, browse_products, search_products, view_product_detail');
  console.log('   • endpoint: 具體的 URL 路徑');
  console.log('');
  console.log('📊 這樣的標籤設計可以讓您像 JMeter 一樣詳細分析每個端點的效能！');
  console.log('');
}
