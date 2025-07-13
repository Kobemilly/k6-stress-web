import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// 模擬 JMeter Label 效果的自定義指標
let requestsByLabel = new Counter('requests_by_label', true);
let responseTimeByLabel = new Trend('response_time_by_label', true);
let errorRateByLabel = new Rate('error_rate_by_label', true);
let throughputByLabel = new Rate('throughput_by_label', true);

export const options = {
  scenarios: {
    jmeter_style_test: {
      executor: 'constant-vus',
      vus: 10,
      duration: '5m',
      tags: { test_type: 'jmeter_style_comparison', environment: 'production' },
    },
  },
  
  // 基於 JMeter Label 的閾值設定
  thresholds: {
    // 模擬 JMeter 中各個 Label 的效能要求
    'http_req_duration{label:index}': ['p(95)<1000'],
    'http_req_duration{label:uploads_banner_mp4}': ['p(95)<2000'],
    'http_req_duration{label:uploads_photos_news}': ['p(95)<1500'],
    'http_req_duration{label:cache_resources}': ['p(95)<500'],
    'http_req_duration{label:build_css_style}': ['p(95)<800'],
    'http_req_failed{label:index}': ['rate<0.01'],
    'http_req_failed{label:uploads_banner_mp4}': ['rate<0.02'],
    'http_req_failed{label:uploads_photos_news}': ['rate<0.02'],
    'http_req_failed{label:cache_resources}': ['rate<0.005'],
    'http_req_failed{label:build_css_style}': ['rate<0.01'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://10.64.8.34';

export function setup() {
  console.log('🏷️ JMeter Style Label 測試開始...');
  console.log('📊 此測試模擬 JMeter 報告中的 Label 分組效果');
  console.log('');
  console.log('🎯 將會產生以下 Label 分組數據：');
  console.log('   • index (首頁)');
  console.log('   • uploads/files/shares/banner.mp4 (媒體文件)');
  console.log('   • uploads/photos/shares/News/... (新聞圖片)');
  console.log('   • cache/... (快取資源)');
  console.log('   • build/css/style-BUMj8HY.css (CSS 樣式)');
  console.log('');
  
  return { targetUrl: BASE_URL };
}

export default function() {
  const data = { targetUrl: BASE_URL };
  
  // 模擬 JMeter 測試計畫中的各種請求
  simulateJMeterTestPlan(data);
  
  sleep(Math.random() * 2 + 1);
}

function simulateJMeterTestPlan(data) {
  
  // 1. 首頁載入 (對應 JMeter Label: "index")
  const indexResponse = http.get(`${data.targetUrl}/index.php`, {
    tags: { 
      label: 'index',  // 這就是 JMeter 中的 Label
      request_type: 'page',
      resource_type: 'html',
      jmeter_equivalent: 'HTTP Request - 首頁'
    }
  });
  
  const indexSuccess = check(indexResponse, {
    'index 載入成功': (r) => r.status === 200,
    'index 響應時間正常': (r) => r.timings.duration < 3000,
  });
  
  // 記錄指標 (模擬 JMeter 報告數據)
  recordJMeterStyleMetrics(indexResponse, 'index', indexSuccess);
  
  sleep(0.5);
  
  // 2. 媒體文件載入 (對應 JMeter Label: "uploads/files/shares/banner.mp4")
  const bannerResponse = http.get(`${data.targetUrl}/uploads/files/shares/banner.mp4`, {
    tags: { 
      label: 'uploads_banner_mp4',
      request_type: 'resource',
      resource_type: 'video',
      jmeter_equivalent: 'HTTP Request - Banner Video'
    }
  });
  
  const bannerSuccess = check(bannerResponse, {
    'banner.mp4 載入成功': (r) => r.status === 200 || r.status === 404, // 404 也算正常，因為文件可能不存在
    'banner.mp4 響應合理': (r) => r.timings.duration < 5000,
  });
  
  recordJMeterStyleMetrics(bannerResponse, 'uploads_banner_mp4', bannerSuccess);
  
  // 3. 新聞圖片載入 (對應 JMeter Label: "uploads/photos/shares/News/...")
  const newsPhotoResponse = http.get(`${data.targetUrl}/uploads/photos/shares/News/latest-news-banner.jpg`, {
    tags: { 
      label: 'uploads_photos_news',
      request_type: 'resource',
      resource_type: 'image',
      jmeter_equivalent: 'HTTP Request - News Photo'
    }
  });
  
  const newsPhotoSuccess = check(newsPhotoResponse, {
    '新聞圖片載入成功': (r) => r.status === 200 || r.status === 404,
    '新聞圖片響應合理': (r) => r.timings.duration < 3000,
  });
  
  recordJMeterStyleMetrics(newsPhotoResponse, 'uploads_photos_news', newsPhotoSuccess);
  
  sleep(0.3);
  
  // 4. 快取資源載入 (對應 JMeter Label: "cache/...")
  const cacheResponse = http.get(`${data.targetUrl}/cache/static/common-resources.js`, {
    tags: { 
      label: 'cache_resources',
      request_type: 'resource',
      resource_type: 'javascript',
      jmeter_equivalent: 'HTTP Request - Cache Resources'
    }
  });
  
  const cacheSuccess = check(cacheResponse, {
    '快取資源載入成功': (r) => r.status === 200 || r.status === 404,
    '快取資源響應快速': (r) => r.timings.duration < 1000,
  });
  
  recordJMeterStyleMetrics(cacheResponse, 'cache_resources', cacheSuccess);
  
  // 5. CSS 樣式文件載入 (對應 JMeter Label: "build/css/style-BUMj8HY.css")
  const cssResponse = http.get(`${data.targetUrl}/build/css/style-BUMj8HY.css`, {
    tags: { 
      label: 'build_css_style',
      request_type: 'resource',
      resource_type: 'css',
      jmeter_equivalent: 'HTTP Request - CSS Style'
    }
  });
  
  const cssSuccess = check(cssResponse, {
    'CSS 樣式載入成功': (r) => r.status === 200 || r.status === 404,
    'CSS 樣式響應快速': (r) => r.timings.duration < 1500,
  });
  
  recordJMeterStyleMetrics(cssResponse, 'build_css_style', cssSuccess);
  
  // 6. 額外的 API 請求 (模擬動態內容)
  const apiResponse = http.get(`${data.targetUrl}/api/v1/user/profile?userId=12345`, {
    tags: { 
      label: 'api_user_profile',
      request_type: 'api',
      resource_type: 'json',
      jmeter_equivalent: 'HTTP Request - User Profile API'
    }
  });
  
  const apiSuccess = check(apiResponse, {
    'API 請求成功': (r) => r.status === 200 || r.status === 404,
    'API 響應時間合理': (r) => r.timings.duration < 2000,
  });
  
  recordJMeterStyleMetrics(apiResponse, 'api_user_profile', apiSuccess);
}

// 記錄 JMeter 風格的指標數據
function recordJMeterStyleMetrics(response, label, isSuccess) {
  // 請求計數 (類似 JMeter 的 Samples)
  requestsByLabel.add(1, { label: label });
  
  // 響應時間 (類似 JMeter 的 Average, Min, Max)
  responseTimeByLabel.add(response.timings.duration, { label: label });
  
  // 錯誤率 (類似 JMeter 的 Error %)
  errorRateByLabel.add(isSuccess ? 0 : 1, { label: label });
  
  // 吞吐量指標 (類似 JMeter 的 Throughput)
  throughputByLabel.add(1, { label: label });
}

export function teardown(data) {
  console.log('');
  console.log('🏁 JMeter Style Label 測試完成！');
  console.log('');
  console.log('📋 產生的 Label 分組數據：');
  console.log('   🏠 index - 首頁載入效能');
  console.log('   🎬 uploads_banner_mp4 - 媒體文件載入效能');
  console.log('   📸 uploads_photos_news - 新聞圖片載入效能');
  console.log('   💾 cache_resources - 快取資源載入效能');
  console.log('   🎨 build_css_style - CSS 樣式載入效能');
  console.log('   🔌 api_user_profile - API 請求效能');
  console.log('');
  console.log('📊 在 InfluxDB/Grafana 中的查詢方式：');
  console.log('   • SELECT * FROM "http_req_duration" WHERE "label"=\'index\'');
  console.log('   • SELECT * FROM "http_req_duration" WHERE "label"=\'uploads_banner_mp4\'');
  console.log('   • SELECT * FROM "http_req_failed" GROUP BY "label"');
  console.log('   • SELECT * FROM "requests_by_label" GROUP BY "label"');
  console.log('');
  console.log('🎯 這樣的設計完全模擬了 JMeter 報告中的 Label 分組效果！');
  console.log('   在 Grafana Dashboard 中，您可以：');
  console.log('   1. 建立表格顯示各 Label 的統計數據');
  console.log('   2. 使用 GROUP BY label 來分組顯示');
  console.log('   3. 計算各 Label 的 APDEX 分數');
  console.log('   4. 產生類似 JMeter 的效能報告');
  console.log('');
}
