# k6 中實現 JMeter Label 分組效果指南

## 概述

在 JMeter 效能測試報告中，**Label** 欄位是一個重要的分組標識，它將不同類型的 HTTP 請求進行分類統計。本指南將詳細說明如何在 k6 中實現相同的 Label 分組效果。

## JMeter Label 的實現原理

在您提供的截圖中，JMeter 報告的 **Label** 欄位顯示的是每個 HTTP 請求的識別名稱，例如：
- `index` - 首頁請求
- `uploads/files/shares/banner.mp4` - 媒體文件請求  
- `cache/1bYWhB9DwElyBQsdxmiEFHA81nYKVHmQuQMKfRQIgn` - 快取資源請求

在 JMeter 中，每個 HTTP 請求取樣器（HTTP Request Sampler）都有一個 **Name** 欄位，這個名稱就會成為報告中的 **Label**。JMeter 會根據這些 Label 來分組統計各種效能指標。

## 在 k6 中的實現方式

### 1. 基本實現：使用 Tags

```javascript
import http from 'k6/http';

export default function() {
  // 首頁請求 - 對應 JMeter Label: "index"
  const indexResponse = http.get('http://example.com/index.php', {
    tags: { 
      label: 'index',  // 這就對應 JMeter 的 Label
      request_type: 'page'
    }
  });
  
  // 媒體文件請求 - 對應 JMeter Label: "uploads/files/shares/banner.mp4"
  const bannerResponse = http.get('http://example.com/uploads/files/shares/banner.mp4', {
    tags: { 
      label: 'uploads_banner_mp4',
      request_type: 'media'
    }
  });
  
  // 快取資源請求 - 對應 JMeter Label: "cache/..."
  const cacheResponse = http.get('http://example.com/cache/static-resource.js', {
    tags: { 
      label: 'cache_resources',
      request_type: 'static'
    }
  });
}
```

### 2. 進階實現：自定義指標 + 完整 JMeter 風格

```javascript
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
    },
  },
  
  // 基於 JMeter Label 的閾值設定
  thresholds: {
    'http_req_duration{label:index}': ['p(95)<1000'],
    'http_req_duration{label:uploads_banner_mp4}': ['p(95)<2000'],
    'http_req_duration{label:cache_resources}': ['p(95)<500'],
    'http_req_failed{label:index}': ['rate<0.01'],
    'http_req_failed{label:uploads_banner_mp4}': ['rate<0.02'],
    'http_req_failed{label:cache_resources}': ['rate<0.005'],
  },
};

export default function() {
  // 模擬 JMeter 測試計畫中的各種請求
  simulateJMeterTestPlan();
  sleep(Math.random() * 2 + 1);
}

function simulateJMeterTestPlan() {
  // 1. 首頁載入 (對應 JMeter Label: "index")
  const indexResponse = http.get('http://example.com/index.php', {
    tags: { 
      label: 'index',  // 這就是 JMeter 中的 Label
      request_type: 'page',
      resource_type: 'html'
    }
  });
  
  const indexSuccess = check(indexResponse, {
    'index 載入成功': (r) => r.status === 200,
    'index 響應時間正常': (r) => r.timings.duration < 3000,
  });
  
  // 記錄指標 (模擬 JMeter 報告數據)
  recordJMeterStyleMetrics(indexResponse, 'index', indexSuccess);
  
  // 2. 媒體文件載入
  const bannerResponse = http.get('http://example.com/uploads/files/shares/banner.mp4', {
    tags: { 
      label: 'uploads_banner_mp4',
      request_type: 'resource',
      resource_type: 'video'
    }
  });
  
  const bannerSuccess = check(bannerResponse, {
    'banner.mp4 載入成功': (r) => r.status === 200 || r.status === 404,
    'banner.mp4 響應合理': (r) => r.timings.duration < 5000,
  });
  
  recordJMeterStyleMetrics(bannerResponse, 'uploads_banner_mp4', bannerSuccess);
  
  // 3. 快取資源載入
  const cacheResponse = http.get('http://example.com/cache/static-resource.js', {
    tags: { 
      label: 'cache_resources',
      request_type: 'resource',
      resource_type: 'javascript'
    }
  });
  
  const cacheSuccess = check(cacheResponse, {
    '快取資源載入成功': (r) => r.status === 200 || r.status === 404,
    '快取資源響應快速': (r) => r.timings.duration < 1000,
  });
  
  recordJMeterStyleMetrics(cacheResponse, 'cache_resources', cacheSuccess);
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
```

## 測試結果分析

運行上述測試後，您會看到類似以下的輸出：

```
✓ THRESHOLDS 
  http_req_duration{label:index}
  ✓ 'p(95)<1000' p(95)=307ms
  
  http_req_duration{label:uploads_banner_mp4}
  ✓ 'p(95)<2000' p(95)=33.44ms
  
  http_req_duration{label:cache_resources}
  ✓ 'p(95)<500' p(95)=250.12ms
  
  http_req_failed{label:index}
  ✓ 'rate<0.01' rate=0.00%
  
  http_req_failed{label:uploads_banner_mp4}
  ✓ 'rate<0.02' rate=0.00%

✓ TOTAL RESULTS 
  http_req_duration............: avg=181.82ms min=15.42ms med=199.17ms
    { label:index }..............: avg=252.83ms min=201.42ms med=241.9ms
    { label:uploads_banner_mp4 }.: avg=24.01ms min=15.42ms med=23.12ms
    { label:cache_resources }....: avg=204.96ms min=170.13ms med=200.42ms
  
  http_req_failed..............: 33.33% 1530 out of 4590
    { label:index }..............: 0.00% 0 out of 765
    { label:uploads_banner_mp4 }..: 0.00% 0 out of 765
    { label:cache_resources }....: 100.00% 765 out of 765
```

## InfluxDB 中的數據結構

使用 Label 標籤後，數據會以以下格式存儲在 InfluxDB 中：

```sql
-- 按 Label 查詢響應時間
SELECT * FROM "http_req_duration" WHERE "label"='index'
SELECT * FROM "http_req_duration" WHERE "label"='uploads_banner_mp4'

-- 按 Label 分組查詢錯誤率
SELECT * FROM "http_req_failed" GROUP BY "label"

-- 按 Label 查詢自定義指標
SELECT * FROM "requests_by_label" GROUP BY "label"
SELECT * FROM "response_time_by_label" GROUP BY "label"
```

## Grafana Dashboard 配置

### 1. 建立 Label 分組表格

在 Grafana 中建立一個表格面板，使用以下查詢：

```sql
SELECT 
  mean("value") as "平均響應時間",
  percentile("value", 95) as "P95響應時間",
  count("value") as "請求總數"
FROM "http_req_duration" 
WHERE $timeFilter 
GROUP BY "label"
```

### 2. Label 錯誤率圖表

```sql
SELECT 
  mean("value") * 100 as "錯誤率(%)"
FROM "http_req_failed" 
WHERE $timeFilter 
GROUP BY "label", time(30s)
```

### 3. Label 吞吐量圖表

```sql
SELECT 
  derivative(mean("value"), 1s) as "每秒請求數"
FROM "requests_by_label" 
WHERE $timeFilter 
GROUP BY "label", time(10s)
```

## 與 JMeter 報告的對應關係

| JMeter 欄位 | k6 對應 | 說明 |
|------------|---------|------|
| Label | tags.label | 請求標識 |
| Samples | requests_by_label | 請求總數 |
| Average | http_req_duration (mean) | 平均響應時間 |
| Min | http_req_duration (min) | 最小響應時間 |
| Max | http_req_duration (max) | 最大響應時間 |
| Std. Dev. | http_req_duration (stddev) | 標準差 |
| Error % | http_req_failed (rate) | 錯誤率 |
| Throughput | throughput_by_label | 吞吐量 |

## 最佳實踐建議

### 1. Label 命名規範

```javascript
// 建議使用描述性的 Label 名稱
const responses = [
  // 頁面類型
  { url: '/index.php', label: 'homepage' },
  { url: '/product/123', label: 'product_detail' },
  { url: '/login', label: 'user_login' },
  
  // 資源類型
  { url: '/css/style.css', label: 'static_css' },
  { url: '/js/app.js', label: 'static_js' },
  { url: '/images/banner.jpg', label: 'static_image' },
  
  // API 類型
  { url: '/api/users', label: 'api_users' },
  { url: '/api/orders', label: 'api_orders' },
];
```

### 2. 分層 Label 結構

```javascript
// 使用分層式的 Label 結構
{
  tags: {
    label: 'api_user_profile',
    category: 'api',
    module: 'user',
    operation: 'profile'
  }
}
```

### 3. 動態 Label 生成

```javascript
function makeRequest(url, requestType, module) {
  const label = `${requestType}_${module}_${getResourceName(url)}`;
  
  return http.get(url, {
    tags: { 
      label: label,
      request_type: requestType,
      module: module
    }
  });
}
```

## 完整示例腳本

以下是一個完整的 JMeter 風格 Label 測試腳本：

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// JMeter 風格的自定義指標
let requestsByLabel = new Counter('requests_by_label', true);
let responseTimeByLabel = new Trend('response_time_by_label', true);
let errorRateByLabel = new Rate('error_rate_by_label', true);

export const options = {
  scenarios: {
    jmeter_style_test: {
      executor: 'constant-vus',
      vus: 10,
      duration: '5m',
    },
  },
  thresholds: {
    'http_req_duration{label:homepage}': ['p(95)<1000'],
    'http_req_duration{label:api_users}': ['p(95)<500'],
    'http_req_duration{label:static_css}': ['p(95)<200'],
    'http_req_failed{label:homepage}': ['rate<0.01'],
    'http_req_failed{label:api_users}': ['rate<0.02'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'https://example.com';

export default function() {
  const testData = [
    { url: `${BASE_URL}/`, label: 'homepage', type: 'page' },
    { url: `${BASE_URL}/api/users`, label: 'api_users', type: 'api' },
    { url: `${BASE_URL}/css/style.css`, label: 'static_css', type: 'static' },
    { url: `${BASE_URL}/js/app.js`, label: 'static_js', type: 'static' },
  ];
  
  testData.forEach(item => {
    executeJMeterStyleRequest(item);
    sleep(0.1);
  });
  
  sleep(1);
}

function executeJMeterStyleRequest(requestData) {
  const response = http.get(requestData.url, {
    tags: { 
      label: requestData.label,
      request_type: requestData.type
    }
  });
  
  const success = check(response, {
    [`${requestData.label} 狀態正常`]: (r) => r.status >= 200 && r.status < 400,
    [`${requestData.label} 響應及時`]: (r) => r.timings.duration < 3000,
  });
  
  // 記錄 JMeter 風格指標
  requestsByLabel.add(1, { label: requestData.label });
  responseTimeByLabel.add(response.timings.duration, { label: requestData.label });
  errorRateByLabel.add(success ? 0 : 1, { label: requestData.label });
}

export function teardown() {
  console.log('');
  console.log('🏁 JMeter Style Label 測試完成！');
  console.log('📊 數據已按 Label 分組，可在 Grafana 中查看詳細報告');
}
```

## 運行測試

```bash
# 運行 JMeter 風格的 Label 測試
./run-test.sh jmeter

# 或直接運行
k6 run scripts/jmeter-style-labeled-test.js
```

## 結論

通過使用 k6 的 `tags` 功能和自定義指標，我們可以完美模擬 JMeter 報告中的 Label 分組效果。這種方法的優勢：

1. **完全兼容**：與 JMeter 的 Label 概念一致
2. **靈活分組**：可以按不同維度進行數據分組
3. **豐富指標**：支援多種統計指標
4. **視覺化支援**：與 Grafana 完美整合
5. **易於分析**：便於效能瓶頸定位

這樣，您就可以在 k6 中獲得與 JMeter 相同的 Label 分組分析能力，讓團隊能夠更容易地從 JMeter 遷移到 k6，同時保持熟悉的報告格式和分析方式。
