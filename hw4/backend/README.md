# 後端 API 設定說明

## 🚀 **快速開始**

### 1. **安裝依賴**
```bash
cd backend
npm install
```

### 2. **環境設定**
```bash
# 複製環境變數範例檔案
cp env.example .env

# 編輯 .env 檔案，設定必要的環境變數
```

### 3. **資料庫設定**
```bash
# 生成 Prisma 客戶端
npm run db:generate

# 推送 schema 到資料庫
npm run db:push
```

### 4. **啟動開發伺服器**
```bash
npm run dev
```

## 📋 **API 端點**

### 健康檢查
- **GET** `/api/health` - 檢查服務狀態
- **GET** `/api` - API 資訊

### 回應格式
```json
{
  "status": "success",
  "message": "服務正常運行",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "environment": "development",
  "database": "connected"
}
```

## 🛠️ **技術架構**

- **Node.js** + **Express.js** + **TypeScript**
- **SQLite** 資料庫 + **Prisma** ORM
- **CORS** 支援前端跨域請求
- **Helmet** 安全性標頭
- **Morgan** 請求日誌

## 🔧 **開發指令**

```bash
npm run dev      # 開發模式（熱重載）
npm run build    # 編譯 TypeScript
npm run start    # 生產模式
npm run db:generate  # 生成 Prisma 客戶端
npm run db:push      # 推送 schema 到資料庫
npm run db:migrate   # 執行資料庫遷移
npm run db:studio    # 開啟 Prisma Studio
```

## 🌐 **CORS 設定**

預設允許 `http://localhost:5173` 的跨域請求，可在 `.env` 中修改 `FRONTEND_URL`。

## 📊 **健康檢查**

健康檢查端點會檢查：
- 伺服器運行狀態
- 資料庫連線狀態
- 服務運行時間
- 環境資訊

## 🔒 **安全性**

- **Helmet** 設定安全性標頭
- **CORS** 限制跨域請求來源
- **請求大小限制** 防止過大請求
- **錯誤處理** 避免敏感資訊洩露
