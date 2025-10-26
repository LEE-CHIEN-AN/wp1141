# Google Maps API 棄用警告處理方案

## 🚨 當前警告

1. **AutocompleteService 棄用警告**
   - 舊 API: `google.maps.places.AutocompleteService`
   - 新 API: `google.maps.places.AutocompleteSuggestion`

2. **PlacesService 棄用警告**
   - 舊 API: `google.maps.places.PlacesService`
   - 新 API: `google.maps.places.Place`

3. **Marker 棄用警告**
   - 舊 API: `google.maps.Marker`
   - 新 API: `google.maps.marker.AdvancedMarkerElement`

## 📅 時間表

- **2025年3月1日**: 新客戶無法使用舊 API
- **至少12個月通知**: 在完全停止支援前會提前通知
- **目前狀態**: 舊 API 仍可使用，但建議遷移到新 API

## 🔧 修復方案

### 方案 1: 暫時抑制警告（快速修復）

在 `src/components/StoreForm/PlaceSearchDialog.tsx` 中添加警告抑制：

```typescript
// 在組件頂部添加
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  const message = args[0];
  if (typeof message === 'string' && 
      (message.includes('AutocompleteService') || 
       message.includes('PlacesService') || 
       message.includes('Marker'))) {
    // 抑制 Google Maps 棄用警告
    return;
  }
  originalConsoleWarn(...args);
};
```

### 方案 2: 遷移到新 API（推薦）

#### 2.1 更新 Google Maps API 載入

```typescript
// 在 HomePage.tsx 中更新 API 載入
script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker&loading=async&v=beta`
```

#### 2.2 遷移 Marker 到 AdvancedMarkerElement

```typescript
// 在 GoogleMap.tsx 中
import { AdvancedMarkerElement } from '@googlemaps/marker';

// 替換舊的 Marker
const marker = new AdvancedMarkerElement({
  position: { lat: store.lat, lng: store.lng },
  map: map,
  content: createMarkerContent(store)
});
```

#### 2.3 遷移 Places API

```typescript
// 在 PlaceSearchDialog.tsx 中
// 使用新的 AutocompleteSuggestion API
const autocompleteService = new google.maps.places.AutocompleteSuggestion();
```

## 🎯 建議行動

### 立即行動（今天）
1. 實施方案 1 來抑制警告
2. 確保應用正常運行

### 短期行動（1-2週）
1. 開始遷移 Marker 到 AdvancedMarkerElement
2. 測試新 API 的兼容性

### 長期行動（1-3個月）
1. 完全遷移到新的 Places API
2. 更新所有相關組件
3. 移除舊 API 的使用

## ⚠️ 注意事項

- 舊 API 目前仍然可用，不會立即停止支援
- 新 API 可能需要不同的實現方式
- 建議先在測試環境中驗證新 API
- 保持向後兼容性

## 🔗 相關連結

- [Google Maps Legacy API 文檔](https://developers.google.com/maps/legacy)
- [Places API 遷移指南](https://developers.google.com/maps/documentation/javascript/places-migration-overview)
- [Advanced Markers 遷移指南](https://developers.google.com/maps/documentation/javascript/advanced-markers/migration)
