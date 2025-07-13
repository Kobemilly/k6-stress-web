# k6 + Grafana Performance Testing Environment

## Quick Start Guide

### 1. Environment Setup
```bash
cd /root/k8s/lab/k6
docker-compose up -d
```

### 2. Running Tests

#### Using the Test Runner Script (Recommended)
```bash
# 查看使用說明
./run-test.sh

# 基本負載測試
./run-test.sh basic

# 進階場景測試
./run-test.sh advanced --vus 20 --duration 2m

# API 測試
./run-test.sh api --output /results/api-test-results.json

# 真實業務情境測試 (10,000人/天)
./run-test.sh business

# 自定義測試
./run-test.sh custom
```

#### Available Test Scripts

#### Basic Load Test (basic-test.js)
```bash
# 分階段壓力測試 (20/40/100 用戶)
docker-compose run --rm k6 run /scripts/basic-test.js

# 使用腳本執行器 (推薦)
./run-test.sh basic --vus 10 --duration 30s
```

#### Advanced Test (advanced-test.js)
```bash
# 進階場景測試
docker-compose run --rm k6 run /scripts/advanced-test.js

# 使用腳本執行器
./run-test.sh advanced
```

#### API Test (api-test.js)
```bash
# API 專項測試
docker-compose run --rm k6 run /scripts/api-test.js

# 使用腳本執行器
./run-test.sh api
```

#### Business Test (realistic-business-test.js)
```bash
# 真實業務情境測試 (基於一天 10,000 人流量)
docker-compose run --rm k6 run /scripts/realistic-business-test.js

# 使用腳本執行器
./run-test.sh business
```

#### Spike Test
```bash
# Sudden traffic spike simulation
docker-compose run --rm k6 run /scripts/spike-test.js
```

#### Multi-Scenario Test
```bash
# Complex multi-scenario test
docker-compose run --rm k6 run /scripts/multi-scenario-test.js
```

#### Dynamic Load Test (dynamic-load-test.js)
```bash
# 動態負載測試 (6.5 分鐘漸進式測試)
docker-compose run --rm k6 run /scripts/dynamic-load-test.js
```

#### Detailed Labeled Test (detailed-labeled-test.js)
```bash
# 詳細標籤化測試 (類似 JMeter 報告格式)
docker-compose run --rm k6 run /scripts/detailed-labeled-test.js

# 使用腳本執行器
./run-test.sh detailed
```

### 3. Test Runner Features

The `run-test.sh` script provides an easy-to-use interface for running k6 tests:

#### Key Features
- **自動服務檢查**: 自動檢查並啟動必要的服務
- **參數化測試**: 支援自定義 VU 數量、測試時間等
- **彩色輸出**: 清晰的狀態指示和錯誤提示
- **時間記錄**: 自動記錄測試開始和結束時間
- **結果導向**: 自動輸出結果查看連結

#### Usage Examples
```bash
# 基本測試
./run-test.sh basic

# 自定義參數
./run-test.sh advanced --vus 50 --duration 5m

# 輸出到檔案
./run-test.sh api --output ./results/api-test-$(date +%Y%m%d).json

# 檢視幫助
./run-test.sh
```

### 4. Grafana Dashboard Access

**URL**: http://localhost:3000
- **Username**: admin
- **Password**: admin

### 5. Available Dashboards

1. **k6 Load Testing Results** - Real-time metrics
2. **System Performance** - Infrastructure monitoring
3. **Error Analysis** - Failure rate and error breakdown

### 6. Key Metrics to Monitor

#### Performance Metrics
- **Response Time**: http_req_duration (avg, p95, p99)
- **Throughput**: http_reqs (requests per second)
- **Error Rate**: http_req_failed (percentage)
- **Data Transfer**: data_received, data_sent

#### Load Metrics
- **Virtual Users**: vus, vus_max
- **Iterations**: iterations per second
- **Duration**: iteration_duration

### 7. Test Scenarios Explained

#### Basic Test (basic-test.js)
- **Purpose**: 分階段壓力測試，模擬真實世界的負載增長
- **Pattern**: 三階段測試：20用戶 → 40用戶 → 100用戶
- **Duration**: 總測試時間約 12分20秒
- **Stages**: 
  - 階段1：20用戶測試 (2分10秒)
  - 階段2：40用戶測試 (3分20秒) 
  - 階段3：100用戶測試 (6分50秒)

#### Advanced Test (advanced-test.js)
- **Purpose**: 進階場景和複雜業務流程測試
- **Pattern**: 多場景並行執行
- **Features**: 包含登入、查詢、提交等業務流程

#### API Test (api-test.js)
- **Purpose**: API 專項效能測試
- **Pattern**: RESTful API 端點測試
- **Coverage**: GET, POST, PUT, DELETE 操作

#### Business Test (realistic-business-test.js)
- **Purpose**: 真實業務情境模擬測試
- **Pattern**: 基於一天 10,000 人的網站流量分佈
- **Duration**: 總測試時間約 22 分鐘
- **流量分析**:
  - 正常時段 (5分鐘): 5 VU (模擬平均流量)
  - 高峰時段 (13分鐘): 15-45 VU (模擬集中流量)
  - 瞬間湧入 (4分鐘): 70 VU (模擬 10 倍流量衝擊)
- **真實場景**: 包含正常瀏覽、高峰期購物、促銷活動湧入等

#### Spike Test
- **Purpose**: Sudden traffic surge testing
- **Pattern**: Normal → Spike → Normal
- **Peak Load**: 1000 VUs for 3 minutes
- **Critical Period**: 30-second ramp to peak

#### Multi-Scenario Test
- **Purpose**: Complex real-world simulation
- **Scenarios**: 
  - Constant background load (20 VUs)
  - Peak hours simulation (50 VUs)
  - Stress burst testing (up to 500 VUs)

#### Dynamic Load Test (dynamic-load-test.js)
- **Purpose**: 動態負載模擬
- **Pattern**: 漸進式負載增加
- **Duration**: 6.5 分鐘
- **Stages**: 平滑的負載變化曲線

#### Detailed Labeled Test (detailed-labeled-test.js)
- **Purpose**: 產生詳細的標籤化報告
- **Pattern**: 類似 JMeter 的報告格式
- **Features**: 包含每個請求的詳細標籤和性能數據

### 8. Thresholds & SLA Monitoring

#### Response Time SLAs
- **95th percentile < 1000ms** (normal load)
- **95th percentile < 2000ms** (peak hours)
- **99th percentile < 3000ms** (overall)

#### Error Rate SLAs
- **< 5% error rate** (spike test)
- **< 10% error rate** (stress test)
- **< 1% error rate** (normal operations)

### 9. Advanced Usage

#### Test Runner Script Options
```bash
# 查看完整使用說明
./run-test.sh

# 測試類型說明：
# basic     - 基本負載測試 (分階段 20/40/100 用戶)
# advanced  - 進階場景測試
# api       - API 測試
# business  - 真實業務情境測試 (10,000人/天)
# custom    - 自定義測試腳本

# 選項說明：
# --vus NUM        - 虛擬用戶數 (預設: 10)
# --duration TIME  - 測試持續時間 (預設: 30s)  
# --output PATH    - 輸出檔案路徑
```

#### Custom Environment Variables
```bash
# Test specific endpoint
docker-compose run --rm k6 run /scripts/load-test.js -e TARGET_URL=https://api.example.com

# Set scenario type
docker-compose run --rm k6 run /scripts/multi-scenario-test.js -e SCENARIO=peak_hours
```

#### Output Formats
```bash
# JSON output
docker-compose run --rm k6 run /scripts/load-test.js --out json=results.json

# InfluxDB output (already configured)
docker-compose run --rm k6 run /scripts/load-test.js --out influxdb=http://influxdb:8086/k6
```

### 10. Monitoring & Alerting

#### Grafana Alerts
- Response time degradation
- Error rate spikes  
- Throughput drops
- Resource exhaustion

#### Real-time Monitoring
- Live dashboard updates
- Color-coded status indicators
- Trend analysis graphs
- Comparative baseline metrics

### 11. Troubleshooting

#### Common Issues
1. **High Error Rates**: Check target service health
2. **Slow Response Times**: Monitor network latency
3. **Memory Issues**: Reduce VU count or test duration
4. **Connection Failures**: Verify target service availability

#### Debug Commands
```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs k6
docker-compose logs grafana
docker-compose logs influxdb

# Restart services
docker-compose restart
```

### 12. Performance Baseline Examples

#### Typical Good Performance
- **Response Time**: p95 < 500ms
- **Throughput**: > 100 RPS per VU  
- **Error Rate**: < 0.1%
- **Resource Usage**: < 70% CPU/Memory

#### Warning Thresholds
- **Response Time**: p95 > 1000ms
- **Error Rate**: > 1%
- **Throughput Drop**: > 20% below baseline

#### Critical Thresholds  
- **Response Time**: p95 > 5000ms
- **Error Rate**: > 5%
- **Service Unavailable**: > 10% 5xx errors

---

## Environment Verification

### Quick Health Check
```bash
# 檢查所有服務狀態
docker-compose ps

# 驗證 k6 運行狀態
docker-compose run --rm k6 version

# 快速測試執行
./run-test.sh basic --vus 1 --duration 5s
```

### Expected Output
When everything is working correctly, you should see:
- ✅ All services in "Up" state
- ✅ k6 version information displayed
- ✅ Test execution with 0% error rate
- ✅ Grafana dashboard accessible at http://localhost:3000

## Next Steps

1. **Access Grafana**: http://localhost:3000
2. **Run a test**: Choose from the scenarios above
3. **Monitor results**: Watch real-time metrics in Grafana
4. **Analyze performance**: Review dashboards and identify bottlenecks
5. **Set up alerts**: Configure notifications for SLA violations

Happy load testing! 🚀
