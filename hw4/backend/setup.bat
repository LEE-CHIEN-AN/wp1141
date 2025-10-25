@echo off
echo 正在設定後端環境...

echo.
echo 1. 安裝依賴套件...
cd backend
npm install

echo.
echo 2. 設定環境變數...
if not exist .env (
    copy env.example .env
    echo 已建立 .env 檔案，請編輯設定
) else (
    echo .env 檔案已存在
)

echo.
echo 3. 生成 Prisma 客戶端...
npm run db:generate

echo.
echo 4. 初始化資料庫...
npm run db:push

echo.
echo ✅ 後端設定完成！
echo.
echo 啟動開發伺服器：
echo npm run dev
echo.
echo 健康檢查：
echo http://localhost:3001/api/health
echo.
pause
