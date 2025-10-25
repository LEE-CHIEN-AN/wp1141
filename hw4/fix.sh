#!/bin/bash

# 台灣選物店地圖清單 - 快速修復腳本

echo "🔧 台灣選物店地圖清單 - 快速修復"
echo "=================================="

# 檢查是否存在 .env 檔案
if [ ! -f ".env" ]; then
    echo "📝 建立 .env 檔案..."
    cp env.example .env
    echo "✅ .env 檔案已建立"
else
    echo "✅ .env 檔案已存在"
fi

# 檢查 API Key 是否設定
if grep -q "your_google_maps_api_key_here" .env; then
    echo "⚠️  警告：請在 .env 檔案中設定有效的 Google Maps API Key"
    echo "   編輯 .env 檔案，將 'your_google_maps_api_key_here' 替換為您的 API Key"
    echo ""
    echo "📖 設定指南："
    echo "   1. 前往 https://console.cloud.google.com/"
    echo "   2. 建立專案並啟用 Maps JavaScript API"
    echo "   3. 建立 API Key"
    echo "   4. 將 API Key 貼到 .env 檔案中"
    echo ""
else
    echo "✅ API Key 已設定"
fi

# 安裝依賴套件
echo "📦 安裝依賴套件..."
npm install

# 檢查安裝是否成功
if [ $? -eq 0 ]; then
    echo "✅ 依賴套件安裝完成"
else
    echo "❌ 依賴套件安裝失敗"
    exit 1
fi

echo ""
echo "🚀 修復完成！"
echo ""
echo "下一步："
echo "1. 確保 .env 檔案中有有效的 Google Maps API Key"
echo "2. 執行 'npm run dev' 啟動開發伺服器"
echo "3. 開啟 http://localhost:5173"
echo ""
echo "如果仍有問題，請參考 API_KEY_SETUP.md 檔案"
