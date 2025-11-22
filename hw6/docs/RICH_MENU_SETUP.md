# LINE Rich Menu（圖文選單）設定指南

## 概述

Rich Menu 是 LINE 提供的常駐選單功能，可以讓使用者在聊天室底部看到圖文選單，方便快速存取常用功能。

## 主選單設計

根據對話腳本設計，主選單包含四個核心功能：
1. 🚫 無法上網
2. 📝 如何註冊
3. 🐢 網速很慢
4. 📞 聯絡網管

## 方法一：使用 LINE Official Account Manager（網頁後台）

### 步驟 1：準備 Rich Menu 圖片

1. **圖片規格要求：**
   - 尺寸：**2500 x 1686 像素**（全螢幕）或 **2500 x 843 像素**（半螢幕）
   - 格式：PNG 或 JPEG
   - 檔案大小：建議小於 1MB
   - 解析度：建議 72 dpi 以上

2. **設計建議：**
   - 將四個功能按鈕平均分配在圖片上
   - 每個按鈕區域約為 625 x 843 像素（全螢幕）或 625 x 421 像素（半螢幕）
   - 使用清晰的圖示和文字標籤
   - 保持一致的視覺風格

### 步驟 2：在 LINE Official Account Manager 中建立 Rich Menu

1. **登入 LINE Official Account Manager**
   - 前往：https://manager.line.biz/
   - 登入您的 LINE Official Account

2. **進入 Rich Menu 設定**
   - 點擊左側選單的「**Messaging API**」
   - 選擇「**Rich Menu**」選項

3. **建立新的 Rich Menu**
   - 點擊「**建立**」或「**Create**」按鈕
   - 輸入 Rich Menu 名稱（例如：「台大女八舍宿網小精靈 - 主選單」）

4. **上傳圖片**
   - 點擊「**上傳圖片**」
   - 選擇您準備好的 Rich Menu 圖片
   - 等待上傳完成

5. **設定按鈕區域**
   - 在圖片上拖曳設定每個按鈕的點擊區域
   - 設定四個按鈕，對應四個功能：

   **按鈕 1：無法上網**
   - 動作類型：**Postback**
   - 標籤：`無法上網`
   - 資料：`action:connection_troubleshoot`
   - 顯示文字：`無法上網`

   **按鈕 2：如何註冊**
   - 動作類型：**Postback**
   - 標籤：`如何註冊`
   - 資料：`action:registration_guide`
   - 顯示文字：`如何註冊`

   **按鈕 3：網速很慢**
   - 動作類型：**Postback**
   - 標籤：`網速很慢`
   - 資料：`action:speed_check`
   - 顯示文字：`網速很慢`

   **按鈕 4：聯絡網管**
   - 動作類型：**Postback**
   - 標籤：`聯絡網管`
   - 資料：`action:contact`
   - 顯示文字：`聯絡網管`

6. **設定為預設 Rich Menu**
   - 勾選「**設為預設 Rich Menu**」
   - 這樣所有使用者都會看到這個選單

7. **儲存並發布**
   - 點擊「**儲存**」或「**Save**」
   - 點擊「**發布**」或「**Publish**」來啟用 Rich Menu

## 方法二：透過 API 程式化設定（推薦）

專案中已包含 Rich Menu 設定 API，您可以直接使用：

### 使用方式

1. **準備 Rich Menu 圖片**
   - 建立 2500x1686 像素的圖片
   - 將圖片上傳到公開可存取的 URL（例如：GitHub、Imgur、或您的網站）
   - 或使用 base64 編碼的圖片

2. **呼叫 API 設定 Rich Menu**

   **方法 A：使用 curl**
   ```bash
   curl -X POST https://your-domain.com/api/line/rich-menu/setup \
     -H "Content-Type: application/json" \
     -d '{
       "imageUrl": "https://example.com/rich-menu.png",
       "deleteExisting": true
     }'
   ```

   **方法 B：使用瀏覽器或 Postman**
   - URL: `POST https://your-domain.com/api/line/rich-menu/setup`
   - Body (JSON):
     ```json
     {
       "imageUrl": "https://example.com/rich-menu.png",
       "deleteExisting": true
     }
     ```

   **方法 C：只建立 Rich Menu 定義（不包含圖片）**
   ```bash
   curl -X POST https://your-domain.com/api/line/rich-menu/setup \
     -H "Content-Type: application/json" \
     -d '{"deleteExisting": true}'
   ```
   然後在 LINE Official Account Manager 中手動上傳圖片。

3. **檢查 Rich Menu 列表**
   ```bash
   curl https://your-domain.com/api/line/rich-menu/setup
   ```

4. **刪除 Rich Menu**
   ```bash
   curl -X DELETE "https://your-domain.com/api/line/rich-menu/setup?richMenuId=YOUR_RICH_MENU_ID"
   ```

### API 端點說明

專案已包含完整的 Rich Menu 設定 API：

**API 檔案位置：** `app/api/line/rich-menu/setup/route.ts`

**支援的 HTTP 方法：**
- `POST` - 建立並設定 Rich Menu
- `GET` - 取得現有的 Rich Menu 列表
- `DELETE` - 刪除指定的 Rich Menu

**Rich Menu 定義：**
- 尺寸：2500 x 1686 像素（全螢幕）
- 佈局：2x2 網格，四個按鈕
- 按鈕對應：
  - 左上：無法上網 (`action:connection_troubleshoot`)
  - 右上：如何註冊 (`action:registration_guide`)
  - 左下：網速很慢 (`action:speed_check`)
  - 右下：聯絡網管 (`action:contact`)

## Rich Menu 圖片設計範例

### 佈局建議（2500 x 1686 像素）

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   🚫 無法上網          │   📝 如何註冊                │
│   Connection Issue     │   Registration Guide          │
│   (0,0)               │   (1250,0)                    │
│   1250 x 843          │   1250 x 843                  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   🐢 網速很慢          │   📞 聯絡網管                │
│   Speed Check          │   Contact Admin              │
│   (0,843)              │   (1250,843)                  │
│   1250 x 843          │   1250 x 843                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 設計要點

1. **視覺一致性**
   - 使用統一的配色方案（建議使用台大校色或宿舍主題色）
   - 保持圖示風格一致

2. **可讀性**
   - 文字清晰易讀
   - 圖示與文字對比明顯
   - 避免過於複雜的背景

3. **使用者體驗**
   - 按鈕區域明顯
   - 點擊區域足夠大（至少 250x250 像素）
   - 視覺上清楚標示可點擊區域

## 測試 Rich Menu

1. **在 LINE 官方帳號中測試**
   - 開啟 LINE 官方帳號聊天室
   - 確認 Rich Menu 顯示在聊天室底部
   - 點擊各個按鈕測試功能

2. **檢查 Postback 事件**
   - 確認 webhook 正確接收 postback 事件
   - 確認按鈕資料正確傳遞

## 常見問題

### Q: Rich Menu 沒有顯示？
A: 
- 確認已設定為「預設 Rich Menu」
- 確認圖片已上傳成功
- 確認 Rich Menu 已發布
- 重新開啟 LINE 聊天室

### Q: 按鈕點擊沒有反應？
A:
- 確認 postback 資料格式正確
- 檢查 webhook 是否正確處理 postback 事件
- 查看 LINE 官方帳號的錯誤日誌

### Q: 如何更新 Rich Menu？
A:
- 在 LINE Official Account Manager 中編輯現有的 Rich Menu
- 或刪除舊的 Rich Menu 後建立新的
- 透過 API 更新需要先刪除再建立

## 參考資源

- [LINE Rich Menu API 文件](https://developers.line.biz/en/docs/messaging-api/using-rich-menus/)
- [LINE Official Account Manager](https://manager.line.biz/)
- [Rich Menu 設計指南](https://developers.line.biz/en/docs/messaging-api/using-rich-menus/#rich-menu-image-specifications)

