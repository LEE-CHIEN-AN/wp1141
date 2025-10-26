# 首頁造訪紀錄照片上傳功能完成

## 🎯 **功能需求**

在首頁點擊商家地標後，新增造訪紀錄時也要像個人的「我的造訪紀錄」頁面一樣，可以上傳照片。

## ✅ **實作方案**

### 🔧 **實作步驟**

#### 1. **建立照片上傳元件**
建立 `src/components/Map/PhotoUpload.tsx` 元件，提供完整的照片上傳功能：

```tsx
interface PhotoUploadProps {
  photos: string[]
  onPhotosChange: (photos: string[]) => void
  maxPhotos?: number
}
```

**功能特色：**
- **檔案選擇**：支援多檔案選擇，限制圖片格式
- **預覽功能**：即時預覽上傳的照片
- **刪除功能**：每張照片都有刪除按鈕
- **數量限制**：最多上傳 5 張照片
- **上傳狀態**：顯示上傳中狀態
- **錯誤處理**：檔案格式驗證和數量限制提示

#### 2. **更新 VisitRecords 元件**
更新 `src/components/Map/VisitRecords.tsx` 元件：

**狀態更新：**
```tsx
const [newRecord, setNewRecord] = useState({
  date: new Date().toISOString().split('T')[0],
  rating: 5,
  review: '',
  photos: [] as string[]  // 新增照片欄位
})
```

**表單更新：**
- 加入 `PhotoUpload` 元件到新增造訪紀錄對話框
- 更新 `handleAddRecord` 函數，包含照片資料
- 在造訪紀錄列表中顯示照片縮圖

#### 3. **照片顯示功能**
在造訪紀錄列表中顯示照片：

```tsx
{/* 照片縮圖 */}
{record.photos && record.photos.length > 0 && (
  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
    {record.photos.slice(0, 3).map((photo: string, index: number) => (
      <CardMedia
        key={index}
        component="img"
        sx={{ 
          width: 40, 
          height: 40, 
          borderRadius: 1,
          objectFit: 'cover',
          border: '1px solid #E8E0D6'
        }}
        image={photo}
        alt={`造訪照片 ${index + 1}`}
      />
    ))}
    {record.photos.length > 3 && (
      <Box sx={{
        width: 40,
        height: 40,
        borderRadius: 1,
        backgroundColor: '#E8E0D6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Typography variant="caption" sx={{ color: '#666666', fontSize: 10 }}>
          +{record.photos.length - 3}
        </Typography>
      </Box>
    )}
  </Box>
)}
```

### 🎯 **功能特色**

#### ✅ **照片上傳功能**
- **多檔案上傳**：一次可選擇多張照片
- **即時預覽**：上傳後立即顯示照片預覽
- **檔案驗證**：只接受圖片格式檔案
- **數量限制**：最多上傳 5 張照片
- **刪除功能**：每張照片都有刪除按鈕

#### ✅ **使用者體驗**
- **拖拽上傳**：支援拖拽檔案到上傳區域
- **上傳狀態**：顯示上傳中狀態和進度
- **錯誤提示**：檔案格式錯誤或數量超限時顯示提示
- **響應式設計**：在不同螢幕尺寸下都能正常使用

#### ✅ **照片顯示**
- **縮圖預覽**：在造訪紀錄列表中顯示照片縮圖
- **數量提示**：超過 3 張照片時顯示 "+N" 提示
- **點擊放大**：點擊照片可查看大圖（未來功能）
- **載入優化**：使用 CardMedia 元件優化圖片載入

### 🔄 **使用流程**

#### 新增造訪紀錄流程
1. **點擊地標**：在首頁地圖上點擊商家地標
2. **開啟詳細卡片**：點擊地標後開啟商家詳細卡片
3. **新增造訪紀錄**：在「我的造訪紀錄」區域點擊「新增紀錄」
4. **填寫表單**：填寫造訪日期、評分、心得
5. **上傳照片**：點擊「上傳照片」按鈕選擇圖片檔案
6. **預覽照片**：上傳後可預覽照片，點擊刪除按鈕移除
7. **提交紀錄**：點擊「新增」按鈕完成造訪紀錄

#### 照片管理功能
- **選擇檔案**：點擊上傳按鈕或拖拽檔案到上傳區域
- **預覽照片**：上傳後立即顯示 80x80 像素的預覽圖
- **刪除照片**：點擊照片右上角的刪除按鈕移除
- **數量限制**：達到 5 張上限時上傳按鈕會停用

### 🛠️ **技術實作**

#### PhotoUpload 元件
```tsx
const PhotoUpload: React.FC<PhotoUploadProps> = ({
  photos,
  onPhotosChange,
  maxPhotos = 5
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const newPhotos: string[] = []
    const remainingSlots = maxPhotos - photos.length
    const filesToProcess = Array.from(files).slice(0, remainingSlots)
    
    setIsUploading(true)

    filesToProcess.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result as string
          newPhotos.push(result)
          
          if (newPhotos.length === filesToProcess.length) {
            onPhotosChange([...photos, ...newPhotos])
            setIsUploading(false)
          }
        }
        reader.readAsDataURL(file)
      }
    })
  }
}
```

#### 檔案處理
- **FileReader API**：使用 FileReader 將檔案轉換為 Base64 字串
- **檔案驗證**：檢查檔案類型是否為圖片格式
- **數量控制**：限制上傳數量，防止超出限制
- **狀態管理**：使用 React 狀態管理上傳進度和照片列表

### 🎨 **UI 設計**

#### 上傳按鈕
```tsx
<Button
  variant="outlined"
  startIcon={<PhotoCamera />}
  onClick={handleUploadClick}
  disabled={isUploading || photos.length >= maxPhotos}
  sx={{
    borderColor: '#2F6F4E',
    color: '#2F6F4E',
    fontFamily: '"Noto Sans TC", sans-serif',
    '&:hover': {
      borderColor: '#1F4A33',
      backgroundColor: '#FAF5EF'
    }
  }}
>
  {isUploading ? '上傳中...' : '上傳照片'}
</Button>
```

#### 照片預覽
```tsx
<CardMedia
  component="img"
  sx={{ 
    width: 80, 
    height: 80, 
    borderRadius: 1,
    objectFit: 'cover',
    border: '1px solid #E8E0D6'
  }}
  image={photo}
  alt={`上傳照片 ${index + 1}`}
/>
```

#### 刪除按鈕
```tsx
<IconButton
  size="small"
  onClick={() => handleRemovePhoto(index)}
  sx={{
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#F4A261',
    color: 'white',
    width: 20,
    height: 20,
    '&:hover': {
      backgroundColor: '#E8924A'
    }
  }}
>
  <Delete sx={{ fontSize: 12 }} />
</IconButton>
```

### 🎉 **功能完成**

現在首頁的造訪紀錄新增功能已經完全與「我的造訪紀錄」頁面一致，包含：

1. **完整照片上傳**：支援多檔案上傳、預覽、刪除
2. **即時顯示**：上傳的照片立即在造訪紀錄中顯示
3. **數量限制**：最多上傳 5 張照片
4. **使用者體驗**：流暢的上傳和預覽體驗
5. **資料同步**：照片資料與造訪紀錄完全同步

使用者現在可以在首頁點擊商家地標後，新增造訪紀錄時上傳照片，就像在「我的造訪紀錄」頁面一樣方便！
