#!/bin/bash

# k6 + Grafana 環境快速啟動腳本

set -e

echo "🚀 正在啟動 k6 + Grafana 測試環境..."

# 檢查 Docker 和 Docker Compose
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安裝，請先安裝 Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安裝，請先安裝 Docker Compose"
    exit 1
fi

# 進入腳本所在目錄
cd "$(dirname "$0")"

echo "📁 當前工作目錄: $(pwd)"

# 啟動基礎服務
echo "🔧 啟動基礎服務 (Grafana, InfluxDB, 測試應用)..."
docker-compose up -d grafana influxdb test-app

# 等待服務啟動
echo "⏳ 等待服務啟動..."
sleep 10

# 檢查服務狀態
echo "🔍 檢查服務狀態..."
docker-compose ps

echo ""
echo "✅ 環境啟動完成！"
echo ""
echo "📊 服務訪問地址："
echo "   - Grafana:     http://localhost:3000 (admin/admin123)"
echo "   - InfluxDB:    http://localhost:8086"
echo "   - 測試應用:     http://localhost:8080"
echo ""
echo "🧪 執行測試命令："
echo "   基本測試:      ./run-test.sh basic"
echo "   進階測試:      ./run-test.sh advanced"
echo "   API 測試:      ./run-test.sh api"
echo "   自定義測試:    ./run-test.sh custom"
echo ""
echo "🛑 停止環境:      ./stop.sh"
echo ""
