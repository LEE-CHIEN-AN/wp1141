# Cloudinary 設定與查看指南

## 確認照片和影片已上傳到 Cloudinary

是的，照片和影片確實是存到 Cloudinary 的。以下是確認和查看的方法：

## 1. 在 Cloudinary 控制台查看

### 步驟：

1. **登入 Cloudinary 控制台**
   - 前往：https://console.cloudinary.com/
   - 使用您的 Cloudinary 帳號登入

2. **查看媒體庫（Media Library）**
   - 登入後，點擊左側選單的 **"Media Library"**
   - 您應該會看到所有上傳的圖片和影片

3. **查看資料夾結構**
   - 在 Media Library 中，您可以看到以下資料夾：
     - `x-clone/posts` - 貼文中的圖片和影片
     - `x-clone` - 用戶頭像和橫幅圖片

4. **搜尋特定檔案**
   - 使用搜尋框可以根據檔案名稱或 public_id 搜尋
   - 也可以根據上傳日期篩選

## 2. 檢查環境變數

確保您的 `.env` 檔案包含以下 Cloudinary 環境變數：

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

這些資訊可以在 Cloudinary 控制台的 **Settings** > **Security** 中找到。

## 3. 檢查資料庫中的 URL

您可以在資料庫中檢查 `PostMedia` 表的 `url` 欄位，應該會看到類似這樣的 URL：

```
https://res.cloudinary.com/[cloud_name]/image/upload/v[timestamp]/x-clone/posts/[public_id].[ext]
```

或

```
https://res.cloudinary.com/[cloud_name]/video/upload/v[timestamp]/x-clone/posts/[public_id].[ext]
```

## 4. 驗證上傳流程

上傳流程如下：

1. **前端請求簽名**：`/api/cloudinary/sign`
2. **直接上傳到 Cloudinary**：使用簽名直接上傳到 `https://api.cloudinary.com/v1_1/[cloud_name]/auto/upload`
3. **保存 URL 到資料庫**：將 Cloudinary 返回的 `secure_url` 和 `public_id` 保存到資料庫

## 5. 測試上傳功能

您可以：

1. **在應用程式中上傳一張圖片或影片**
2. **檢查瀏覽器開發者工具的 Network 標籤**
   - 應該會看到對 `/api/cloudinary/sign` 的請求
   - 然後看到對 `api.cloudinary.com` 的上傳請求
3. **檢查資料庫**
   - 查看 `PostMedia` 表，應該會有新記錄
   - `url` 欄位應該包含 Cloudinary 的 URL
4. **在 Cloudinary 控制台確認**
   - 在 Media Library 中應該會看到新上傳的檔案

## 6. 常見問題

### Q: 為什麼在 Cloudinary 控制台看不到檔案？

A: 可能的原因：
- 環境變數設定錯誤
- 上傳失敗（檢查瀏覽器控制台的錯誤訊息）
- 檔案上傳到不同的 Cloudinary 帳號

### Q: 如何確認檔案真的在 Cloudinary？

A: 
1. 檢查資料庫中的 URL 是否以 `res.cloudinary.com` 開頭
2. 在瀏覽器中直接打開該 URL，應該能看到圖片或影片
3. 在 Cloudinary 控制台的 Media Library 中搜尋該檔案的 public_id

### Q: 如何查看上傳的檔案大小和數量？

A: 在 Cloudinary 控制台的 **Settings** > **Usage** 中可以查看：
- 已使用的儲存空間
- 已上傳的檔案數量
- 頻寬使用量

## 7. 查看特定用戶的媒體

如果您想查看特定用戶上傳的所有媒體：

1. 在資料庫中查詢：
```sql
SELECT pm.*, p.authorId 
FROM "PostMedia" pm
JOIN "Post" p ON pm."postId" = p.id
WHERE p."authorId" = 'user_id_here';
```

2. 在 Cloudinary 控制台搜尋：
   - 使用 public_id 搜尋（格式：`x-clone/posts/[public_id]`）







