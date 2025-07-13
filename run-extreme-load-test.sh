#!/bin/bash

# 10,000 人極限負載測試執行腳本
# 目標：http://127.0.0.1/index.php
# 輸出到 InfluxDB 供 Grafana 讀取

echo "🚀 準備執行 10,000 人極限負載測試"
echo "====================================="
echo "測試目標: http://1217.0.0.1/index.php"
echo "最大並發: 10,000 用戶"
echo "測試時間: 約 46 分鐘"
echo "數據輸出: InfluxDB -> Grafana"
echo "====================================="
echo ""

# 檢查 InfluxDB 狀態
echo "🔍 檢查 InfluxDB 狀態..."
curl -s 'http://localhost:8086/ping' > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ InfluxDB 運行正常"
else
    echo "❌ InfluxDB 未運行，請先啟動 InfluxDB"
    exit 1
fi

# 檢查目標服務器連通性
echo "🔍 檢查目標服務器連通性..."
curl -s --max-time 5 'http://127.0.0.1/index.php' > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ 目標服務器連通正常"
else
    echo "⚠️ 目標服務器連通性檢查失敗，但將繼續測試"
fi

# 清理舊數據（可選）
echo "🧹 清理舊測試數據..."
curl -G 'http://localhost:8086/query' --data-urlencode "db=k6" --data-urlencode "q=DROP MEASUREMENT extreme_load_test" > /dev/null 2>&1

echo ""
echo "⚠️  最後確認："
echo "   - 確保目標服務器有足夠資源"
echo "   - 確保網絡帶寬充足"
echo "   - 確保已獲得測試許可"
echo "   - 確保監控系統準備就緒"
echo ""
echo "按 Enter 鍵開始測試，或按 Ctrl+C 取消..."
read -r

echo "🚀 開始執行 10,000 人極限負載測試..."
echo "測試開始時間: $(date)"

# 執行 k6 測試，輸出到 InfluxDB
docker run --rm -i \
  --network="host" \
  -v "$PWD/scripts:/scripts" \
  grafana/k6:latest run \
  --out influxdb=http://localhost:8086/k6 \
  --tag testname=extreme_load_10k \
  --tag environment=production \
  --tag target=10.64.8.34 \
  /scripts/basic-test.js

echo ""
echo "測試完成時間: $(date)"
echo ""
echo "📊 查看測試結果："
echo "   - Grafana 儀表板: http://localhost:3000"
echo "   - InfluxDB 查詢: http://localhost:8086"
echo ""
echo "📈 建議查看的 Grafana 監控指標："
echo "   - 響應時間趨勢"
echo "   - 吞吐量變化"
echo "   - 錯誤率分布"
echo "   - 虛擬用戶負載曲線"
echo "   - 服務器過載率"
echo "   - 超時率"
echo ""
echo "🎯 測試報告已保存到 InfluxDB 的 k6 數據庫中"
