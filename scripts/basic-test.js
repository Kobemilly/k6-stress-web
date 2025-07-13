import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// 自定義指標 - 溫和型壓力測試（20/40/100 用戶），專為 Grafana 監控設計
let moderateLoadErrors = new Rate('moderate_load_errors');
let moderateLoadResponseTime = new Trend('moderate_load_response_time');
let moderateLoadRequests = new Counter('moderate_load_requests');
let responseTimeP95 = new Trend('response_time_p95');
let responseTimeP99 = new Trend('response_time_p99');
let successfulRequests = new Counter('successful_requests');
let failedRequests = new Counter('failed_requests');
let loadStageMetric = new Counter('load_stage_metric');

// 測試配置 - 依據圖片說明的精確測試情境
export const options = {
  // 使用 scenarios 配置 - 分階段測試（20/40/100 用戶）
  scenarios: {
    // 第一階段：20 用戶測試
    // 每隔30秒新增10位使用者，直到20位使用者
    stage_20_users: {
      executor: 'ramping-vus',
      stages: [
        // 加壓期間：每隔30秒新增10位使用者
        { duration: '5s', target: 10 },   // 5秒內啟動完成10位使用者
        { duration: '25s', target: 10 },  // 維持10位使用者25秒（共30秒）
        { duration: '5s', target: 20 },   // 5秒內啟動完成20位使用者
        { duration: '25s', target: 20 },  // 維持20位使用者25秒（共30秒）
        
        // 高峰期間：維持壓力60秒
        { duration: '60s', target: 20 },  // 維持20位使用者60秒
        
        // 降壓期間：每5秒移除10位使用者
        { duration: '5s', target: 10 },   // 5秒內移除10位使用者
        { duration: '5s', target: 0 },    // 5秒內移除剩餘10位使用者
      ],
      gracefulRampDown: '5s',
      gracefulStop: '5s',
      tags: {
        test_type: 'stage_20_users',
        target: 'production',
        max_users: '20'
      }
    },
    
    // 第二階段：40 用戶測試（在第一階段完成後開始）
    // 每隔30秒新增10位使用者，直到40位使用者
    stage_40_users: {
      executor: 'ramping-vus',
      startTime: '130s',  // 第一階段完成後開始
      stages: [
        // 加壓期間：每隔30秒新增10位使用者
        { duration: '5s', target: 10 },   // 5秒內啟動完成10位使用者
        { duration: '25s', target: 10 },  // 維持10位使用者25秒（共30秒）
        { duration: '5s', target: 20 },   // 5秒內啟動完成20位使用者
        { duration: '25s', target: 20 },  // 維持20位使用者25秒（共30秒）
        { duration: '5s', target: 30 },   // 5秒內啟動完成30位使用者
        { duration: '25s', target: 30 },  // 維持30位使用者25秒（共30秒）
        { duration: '5s', target: 40 },   // 5秒內啟動完成40位使用者
        { duration: '25s', target: 40 },  // 維持40位使用者25秒（共30秒）
        
        // 高峰期間：維持壓力60秒
        { duration: '60s', target: 40 },  // 維持40位使用者60秒
        
        // 降壓期間：每5秒移除10位使用者
        { duration: '5s', target: 30 },   // 5秒內移除10位使用者
        { duration: '5s', target: 20 },   // 5秒內移除10位使用者
        { duration: '5s', target: 10 },   // 5秒內移除10位使用者
        { duration: '5s', target: 0 },    // 5秒內移除剩餘10位使用者
      ],
      gracefulRampDown: '5s',
      gracefulStop: '5s',
      tags: {
        test_type: 'stage_40_users',
        target: 'production',
        max_users: '40'
      }
    },
    
    // 第三階段：100 用戶測試（在第二階段完成後開始）
    // 每隔30秒新增10位使用者，直到100位使用者
    stage_100_users: {
      executor: 'ramping-vus',
      startTime: '410s',  // 第二階段完成後開始
      stages: [
        // 加壓期間：每隔30秒新增10位使用者（共需9次，270秒）
        { duration: '5s', target: 10 },   // 5秒內啟動完成10位使用者
        { duration: '25s', target: 10 },  // 維持10位使用者25秒
        { duration: '5s', target: 20 },   // 5秒內啟動完成20位使用者
        { duration: '25s', target: 20 },  // 維持20位使用者25秒
        { duration: '5s', target: 30 },   // 5秒內啟動完成30位使用者
        { duration: '25s', target: 30 },  // 維持30位使用者25秒
        { duration: '5s', target: 40 },   // 5秒內啟動完成40位使用者
        { duration: '25s', target: 40 },  // 維持40位使用者25秒
        { duration: '5s', target: 50 },   // 5秒內啟動完成50位使用者
        { duration: '25s', target: 50 },  // 維持50位使用者25秒
        { duration: '5s', target: 60 },   // 5秒內啟動完成60位使用者
        { duration: '25s', target: 60 },  // 維持60位使用者25秒
        { duration: '5s', target: 70 },   // 5秒內啟動完成70位使用者
        { duration: '25s', target: 70 },  // 維持70位使用者25秒
        { duration: '5s', target: 80 },   // 5秒內啟動完成80位使用者
        { duration: '25s', target: 80 },  // 維持80位使用者25秒
        { duration: '5s', target: 90 },   // 5秒內啟動完成90位使用者
        { duration: '25s', target: 90 },  // 維持90位使用者25秒
        { duration: '5s', target: 100 },  // 5秒內啟動完成100位使用者
        { duration: '25s', target: 100 }, // 維持100位使用者25秒
        
        // 高峰期間：維持壓力60秒
        { duration: '60s', target: 100 }, // 維持100位使用者60秒
        
        // 降壓期間：每5秒移除10位使用者（共需10次，50秒）
        { duration: '5s', target: 90 },   // 5秒內移除10位使用者
        { duration: '5s', target: 80 },   // 5秒內移除10位使用者
        { duration: '5s', target: 70 },   // 5秒內移除10位使用者
        { duration: '5s', target: 60 },   // 5秒內移除10位使用者
        { duration: '5s', target: 50 },   // 5秒內移除10位使用者
        { duration: '5s', target: 40 },   // 5秒內移除10位使用者
        { duration: '5s', target: 30 },   // 5秒內移除10位使用者
        { duration: '5s', target: 20 },   // 5秒內移除10位使用者
        { duration: '5s', target: 10 },   // 5秒內移除10位使用者
        { duration: '5s', target: 0 },    // 5秒內移除剩餘10位使用者
      ],
      gracefulRampDown: '5s',
      gracefulStop: '5s',
      tags: {
        test_type: 'stage_100_users',
        target: 'production',
        max_users: '100'
      }
    },
  },
  // 閾值設定 - 依據圖片說明的測試要求
  thresholds: {
    http_req_duration: ['p(95)<5000'],    // 95%的請求應在5秒內完成
    http_req_failed: ['rate<0.1'],        // 失敗率應低於10%
    http_reqs: ['rate>1'],                // 每秒至少1個請求
    'http_req_duration{expected_response:true}': ['p(95)<3000'], // 成功請求的95%響應時間
    moderate_load_errors: ['rate<0.15'],  // 負載錯誤率應低於15%
    successful_requests: ['count>100'],   // 成功請求數應超過100
  },
  
  // 系統資源配置
  noConnectionReuse: false,       // 重用連接以提升效率
  userAgent: 'k6-moderate-load-test/1.0',
  
  // 輸出到 InfluxDB - 便於 Grafana 監控
  ext: {
    influxdb: {
      url: 'http://localhost:8086',
      database: 'k6',
      measurement: 'staged_load_test',
      tags: {
        test_name: 'staged_20_40_100_users',
        environment: 'production',
        target_host: '10.64.8.34'
      }
    }
  },
};

// 測試函數 - 依據圖片說明的精確測試情境
export default function() {
  const startTime = new Date().getTime();
  
  // 獲取當前階段信息
  const currentVU = __VU;
  const currentStage = currentVU <= 20 ? 'stage_20_users' : 
                       currentVU <= 40 ? 'stage_40_users' : 'stage_100_users';
  
  // 測試正式主機
  let response = http.get('http://10.64.8.34/index.php', {
    timeout: '10s',  // 10秒超時
    tags: { 
      test_type: 'staged_load_test', 
      target: 'production',
      stage: currentStage,
      user_count: currentVU.toString()
    }
  });
  
  const endTime = new Date().getTime();
  const responseTime = endTime - startTime;
  
  // 記錄自定義指標 - 依據測試階段分類
  moderateLoadRequests.add(1);
  moderateLoadResponseTime.add(responseTime);
  responseTimeP95.add(responseTime);
  responseTimeP99.add(responseTime);
  
  // 記錄階段特定指標
  if (currentVU <= 20) {
    loadStageMetric.add(1, { stage: 'stage_20_users', phase: 'active' });
  } else if (currentVU <= 40) {
    loadStageMetric.add(1, { stage: 'stage_40_users', phase: 'active' });
  } else if (currentVU <= 100) {
    loadStageMetric.add(1, { stage: 'stage_100_users', phase: 'active' });
  }
  
  // 驗證回應 - 依據圖片說明的測試要求
  let success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 10s': (r) => r.timings.duration < 10000,  // 10秒內響應
    'response time < 5s': (r) => r.timings.duration < 5000,    // 5秒內響應（理想）
    'response time < 2s': (r) => r.timings.duration < 2000,    // 2秒內響應（良好）
    'response time < 1s': (r) => r.timings.duration < 1000,    // 1秒內響應（優秀）
    'response received': (r) => r.body && r.body.length > 0,   // 有接收到內容
    'no server errors': (r) => r.status < 500,                // 無服務器錯誤
  });
  
  // 錯誤分析和記錄 - 為 Grafana 提供詳細數據
  if (!response || response.status !== 200) {
    moderateLoadErrors.add(1);
    failedRequests.add(1);
    
    // 記錄錯誤詳情，包含階段信息
    if (response && response.status >= 500) {
      console.log(`[${currentStage}] 服務器錯誤 - 狀態碼: ${response.status}, 響應時間: ${responseTime}ms, VU: ${currentVU}`);
    } else if (!response || responseTime >= 10000) {
      console.log(`[${currentStage}] 請求超時 - 響應時間: ${responseTime}ms, VU: ${currentVU}`);
    } else if (response && response.status >= 400) {
      console.log(`[${currentStage}] 客戶端錯誤 - 狀態碼: ${response.status}, 響應時間: ${responseTime}ms, VU: ${currentVU}`);
    }
  } else {
    moderateLoadErrors.add(0);
    successfulRequests.add(1);
    
    // 記錄成功的階段性能數據
    if (responseTime > 5000) {
      console.log(`[${currentStage}] 響應較慢 - 響應時間: ${responseTime}ms, VU: ${currentVU}`);
    }
  }
  
  // 階段性能監控 - 依據圖片說明的監控要求
  if (currentVU >= 80) {
    // 100用戶階段的特殊監控
    if (responseTime > 3000) {
      console.log(`[高負載階段] VU:${currentVU}, 響應時間:${responseTime}ms, 狀態:${response.status}`);
    }
  } else if (currentVU >= 30) {
    // 40用戶階段的監控
    if (responseTime > 2000) {
      console.log(`[中負載階段] VU:${currentVU}, 響應時間:${responseTime}ms, 狀態:${response.status}`);
    }
  } else if (currentVU >= 15) {
    // 20用戶階段的監控
    if (responseTime > 1500) {
      console.log(`[低負載階段] VU:${currentVU}, 響應時間:${responseTime}ms, 狀態:${response.status}`);
    }
  }
  
  // 模擬真實用戶行為 - 依據圖片說明的用戶行為模式
  sleep(Math.random() * 1 + 0.5);  // 0.5-1.5秒隨機思考時間
}

// 設置階段 - 依據圖片說明的精確測試情境
export function setup() {
  console.log('🚀 開始分階段壓力測試...');
  console.log('🎯 測試目標：http://10.64.8.34/index.php');
  console.log('📊 測試設計：依據圖片說明的精確情境');
  console.log('');
  console.log('⏱️ 測試階段時間計算：');
  console.log('');
  console.log('🔵 階段1 - 20位使用者測試：');
  console.log('   • 加壓期間：每隔30秒新增10位使用者');
  console.log('     - 0-5秒：啟動10位使用者');
  console.log('     - 5-30秒：維持10位使用者');
  console.log('     - 30-35秒：啟動20位使用者');
  console.log('     - 35-60秒：維持20位使用者');
  console.log('   • 高峰期間：維持20位使用者60秒 (60-120秒)');
  console.log('   • 降壓期間：每5秒移除10位使用者');
  console.log('     - 120-125秒：移除10位使用者');
  console.log('     - 125-130秒：移除剩餘10位使用者');
  console.log('   總時間：130秒 (2分10秒)');
  console.log('');
  console.log('🟡 階段2 - 40位使用者測試：');
  console.log('   • 開始時間：130秒後');
  console.log('   • 加壓期間：每隔30秒新增10位使用者');
  console.log('     - 需4個周期達到40位使用者 (120秒)');
  console.log('   • 高峰期間：維持40位使用者60秒');
  console.log('   • 降壓期間：每5秒移除10位使用者 (20秒)');
  console.log('   總時間：200秒 (3分20秒)');
  console.log('');
  console.log('🔴 階段3 - 100位使用者測試：');
  console.log('   • 開始時間：410秒後');
  console.log('   • 加壓期間：每隔30秒新增10位使用者');
  console.log('     - 需10個周期達到100位使用者 (300秒)');
  console.log('   • 高峰期間：維持100位使用者60秒');
  console.log('   • 降壓期間：每5秒移除10位使用者 (50秒)');
  console.log('   總時間：410秒 (6分50秒)');
  console.log('');
  console.log('📈 總測試時間：約 12分20秒');
  console.log('');
  console.log('🎯 每秒使用者數速率估算：');
  console.log('   加壓期間：每秒平均約 0.33 位使用者加入');
  console.log('   高峰期間：每秒最多同時執行請求的使用者數為 20/40/100');
  console.log('   降壓期間：每秒約 2 位使用者減少');
  console.log('');
  
  // 測試目標服務器連通性
  try {
    let testResponse = http.get('http://10.64.8.34/index.php', { timeout: '10s' });
    if (testResponse.status === 200) {
      console.log('✅ 目標服務器連通性測試成功');
      console.log(`   響應時間: ${testResponse.timings.duration}ms`);
      console.log(`   響應大小: ${testResponse.body.length} bytes`);
    } else {
      console.log(`⚠️ 目標服務器返回狀態碼: ${testResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ 目標服務器連通性測試失敗: ${error}`);
  }
  
  console.log('');
  console.log('🎬 開始測試執行...');
  
  return { 
    startTime: new Date().toISOString(),
    testType: 'staged_20_40_100_users',
    testDescription: 'Precise staged load test as per image specification'
  };
}

// 清理階段
export function teardown(data) {
  console.log('');
  console.log('🏁 分階段壓力測試完成！');
  console.log(`測試類型: ${data.testType}`);
  console.log(`測試描述: ${data.testDescription}`);
  console.log(`開始時間: ${data.startTime}`);
  console.log(`結束時間: ${new Date().toISOString()}`);
  console.log('');
  console.log('📊 測試總結：');
  console.log('   階段1 (20用戶)：2分10秒');
  console.log('   階段2 (40用戶)：3分20秒');
  console.log('   階段3 (100用戶)：6分50秒');
  console.log('   總測試時間：12分20秒');
  console.log('');
  console.log('🔍 數據收集完成，請檢查：');
  console.log('   - InfluxDB 中的分階段測試數據');
  console.log('   - Grafana 監控儀表板');
  console.log('   - 每個階段的性能對比');
  console.log('   - 響應時間在不同負載下的變化');
  console.log('');
  console.log('� 建議分析的關鍵指標：');
  console.log('   - 每個階段的平均響應時間');
  console.log('   - 95%響應時間在不同負載下的分布');
  console.log('   - 錯誤率隨負載變化的趨勢');
  console.log('   - 系統在20/40/100用戶下的吞吐量');
  console.log('   - 負載增加和減少時的系統表現');
}
