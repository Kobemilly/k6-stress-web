#!/bin/bash

# k6 測試執行腳本

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函數定義
print_usage() {
    echo "使用方法: $0 [測試類型] [選項]"
    echo ""
    echo "測試類型:"
    echo "  basic     - 基本負載測試"
    echo "  advanced  - 進階場景測試"
    echo "  api       - API 測試"
    echo "  business  - 真實業務情境測試 (10,000人/天)"
    echo "  detailed  - 詳細標籤化測試 (類似 JMeter)"
    echo "  jmeter    - JMeter 風格 Label 測試"
    echo "  custom    - 自定義測試"
    echo ""
    echo "選項:"
    echo "  --vus NUM     - 虛擬用戶數 (預設: 10)"
    echo "  --duration TIME - 測試持續時間 (預設: 30s)"
    echo "  --output PATH - 輸出檔案路徑"
    echo ""
    echo "範例:"
    echo "  $0 basic"
    echo "  $0 advanced --vus 20 --duration 2m"
    echo "  $0 api --output /results/api-test-results.json"
}

run_test() {
    local test_type=$1
    local script_file=""
    local extra_args=""
    
    case $test_type in
        "basic")
            script_file="/scripts/basic-test.js"
            echo -e "${GREEN}🧪 執行基本負載測試...${NC}"
            ;;
        "advanced")
            script_file="/scripts/advanced-test.js"
            echo -e "${GREEN}🧪 執行進階場景測試...${NC}"
            ;;
        "api")
            script_file="/scripts/api-test.js"
            echo -e "${GREEN}🧪 執行 API 測試...${NC}"
            ;;
        "business")
            script_file="/scripts/realistic-business-test.js"
            echo -e "${GREEN}🏢 執行真實業務情境測試 (10,000人/天)...${NC}"
            ;;
        "detailed")
            script_file="/scripts/detailed-labeled-test.js"
            echo -e "${GREEN}🏷️ 執行詳細標籤化測試 (類似 JMeter)...${NC}"
            ;;
        "jmeter")
            script_file="/scripts/jmeter-style-labeled-test.js"
            echo -e "${GREEN}📊 執行 JMeter 風格 Label 測試...${NC}"
            ;;
        "custom")
            echo -e "${YELLOW}📝 請輸入自定義測試腳本路徑:${NC}"
            read -r script_file
            if [ ! -f "./scripts/$(basename "$script_file")" ]; then
                echo -e "${RED}❌ 找不到測試腳本: $script_file${NC}"
                exit 1
            fi
            script_file="/scripts/$(basename "$script_file")"
            ;;
        *)
            echo -e "${RED}❌ 未知的測試類型: $test_type${NC}"
            print_usage
            exit 1
            ;;
    esac
    
    # 解析額外參數
    shift
    while [[ $# -gt 0 ]]; do
        case $1 in
            --vus)
                extra_args="$extra_args --vus $2"
                shift 2
                ;;
            --duration)
                extra_args="$extra_args --duration $2"
                shift 2
                ;;
            --output)
                extra_args="$extra_args --out json=$2"
                shift 2
                ;;
            *)
                echo -e "${RED}❌ 未知選項: $1${NC}"
                print_usage
                exit 1
                ;;
        esac
    done
    
    # 檢查服務是否運行
    if ! docker-compose ps | grep -q "Up"; then
        echo -e "${YELLOW}⚠️  服務未運行，正在啟動...${NC}"
        docker-compose up -d grafana influxdb test-app
        sleep 10
    fi
    
    # 執行測試
    echo -e "${BLUE}📋 執行命令: docker-compose run --rm k6 run $extra_args $script_file${NC}"
    echo ""
    
    # 記錄測試開始時間
    start_time=$(date)
    echo -e "${GREEN}🕐 測試開始時間: $start_time${NC}"
    echo ""
    
    # 執行 k6 測試
    docker-compose run --rm k6 run $extra_args --out influxdb=http://influxdb:8086/k6 $script_file
    
    # 記錄測試結束時間
    end_time=$(date)
    echo ""
    echo -e "${GREEN}✅ 測試完成！${NC}"
    echo -e "${GREEN}🕐 測試結束時間: $end_time${NC}"
    echo ""
    echo -e "${BLUE}📊 查看結果:${NC}"
    echo -e "   - Grafana Dashboard: http://localhost:3000"
    echo -e "   - 測試報告: ./results/"
    echo ""
}

# 主程序
cd "$(dirname "$0")"

if [ $# -eq 0 ]; then
    print_usage
    exit 1
fi

run_test "$@"
