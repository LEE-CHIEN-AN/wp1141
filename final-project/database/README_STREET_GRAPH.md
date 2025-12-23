# 路網圖 Supabase 匯入指南

這個指南說明如何將整個台北的路網圖匯入到 Supabase 資料庫中，以加速路網查詢。

## 優點

將路網圖存到 Supabase 的優點：
- **減少網路請求**：不需要每次都用 OSMnx 從 OpenStreetMap 下載
- **加快查詢速度**：使用 PostGIS 空間索引 (GiST) 加速查詢
- **減少 OSM 伺服器負載**：避免頻繁請求 OpenStreetMap API
- **更穩定的效能**：不依賴外部服務的可用性

## 前置需求

1. 已完成 Supabase 資料庫設定
2. 已執行建築物的 migrations (`001_create_buildings_table.sql` 和 `002_create_rpc_functions.sql`)
3. 環境變數已設定（`SUPABASE_URL` 和 `SUPABASE_KEY`）

## 步驟 1: 執行資料庫 Migrations

在 Supabase SQL Editor 中執行以下 migrations（按順序）：

1. **`003_create_street_graph_tables.sql`**
   - 建立 `street_graph_nodes` 和 `street_graph_edges` 表
   - 建立空間索引以加速查詢

2. **`004_create_street_graph_rpc_functions.sql`**
   - 建立 RPC 函數來查詢路網圖
   - `get_street_nodes_in_bbox`: 查詢指定範圍內的節點
   - `get_street_edges_in_bbox`: 查詢指定範圍內的邊
   - `get_street_edges_for_nodes`: 查詢指定節點的所有邊

## 步驟 2: 匯入台北路網圖

執行匯入腳本：

```bash
cd database/scripts
python import_street_graph_to_supabase.py
```

這個腳本會：
1. 使用 OSMnx 下載整個台北市的步行路網圖
2. 將 nodes 和 edges 轉換為適合資料庫的格式
3. 批次匯入到 Supabase

**注意**：
- 整個過程可能需要 10-30 分鐘（取決於網路速度和資料量）
- 台北市的範圍定義在腳本中（緯度：25.0-25.15，經度：121.45-121.65）
- 腳本會先清除現有資料再匯入（可修改以保留現有資料）

**資料大小估算**：
- 台北市主要區域（約 309 平方公里）預估：
  - 節點數：約 30-60 萬個
  - 邊數：約 50-120 萬條
  - 資料大小：約 **200-400 MB**（包含索引）
- Supabase 免費方案限制：**500 MB**
- 建議先執行 `estimate_street_graph_size.py` 來估算實際大小

## 步驟 3: 啟用 Supabase 路網圖查詢

在 `.env` 檔案中設定：

```bash
SHADOW_USE_SUPABASE_STREET_GRAPH=true
```

或者在程式碼中，這個設定會自動從環境變數讀取。

## 使用方式

啟用後，`extract_street_graph()` 函數會自動從 Supabase 讀取路網圖，而不是使用 OSMnx 下載。

如果 Supabase 查詢失敗，會自動 fallback 到原本的 OSMnx 方法。

## 驗證

執行以下測試來驗證匯入是否成功：

```python
from database.queries_street_graph import get_street_graph_in_bbox

# 測試查詢台大附近的路網圖
G, nodes, edges = get_street_graph_in_bbox(
    min_lon=121.53,
    min_lat=25.01,
    max_lon=121.55,
    max_lat=25.03
)

print(f"節點數: {len(nodes)}")
print(f"邊數: {len(edges)}")
print(f"圖形節點數: {len(G.nodes)}")
print(f"圖形邊數: {len(G.edges)}")
```

## 資料結構

### street_graph_nodes 表

- `osmid` (BIGINT, PRIMARY KEY): OpenStreetMap 節點 ID
- `geometry` (GEOMETRY(POINT, 4326)): 節點座標（PostGIS 點）
- `y` (DOUBLE PRECISION): 緯度
- `x` (DOUBLE PRECISION): 經度
- `street_count` (INTEGER): 連接到此節點的街道數量
- `created_at` (TIMESTAMP): 建立時間

### street_graph_edges 表

- `id` (BIGSERIAL, PRIMARY KEY): 自動遞增 ID
- `u` (BIGINT, FOREIGN KEY): 來源節點 OSM ID
- `v` (BIGINT, FOREIGN KEY): 目標節點 OSM ID
- `key` (INTEGER): MultiDiGraph 邊的 key（預設 0）
- `geometry` (GEOMETRY(LINESTRING, 4326)): 邊的幾何形狀（PostGIS 線段）
- `length` (DOUBLE PRECISION): 邊的長度（公尺）
- `name` (TEXT): 街道名稱（可選）
- `highway` (TEXT): 道路類型（可選）
- `created_at` (TIMESTAMP): 建立時間

## 效能考量

- **空間索引**：使用 GiST 索引加速空間查詢
- **批次查詢**：RPC 函數使用 bounding box 查詢，再利用空間索引過濾
- **快取**：雖然資料在資料庫中，但應用層仍可使用快取來減少重複查詢

## 疑難排解

### 匯入失敗

- 檢查 Supabase 連線設定
- 確認 migrations 已執行
- 檢查磁碟空間（Supabase 免費方案有空間限制）

### 查詢很慢

- 確認空間索引已建立（`street_graph_nodes_geometry_idx` 和 `street_graph_edges_geometry_idx`）
- 檢查查詢範圍是否太大
- 考慮使用較小的 bounding box 進行查詢

### 資料不完整

- 確認匯入過程沒有錯誤
- 檢查 Supabase 資料表中的記錄數量
- 可以重新執行匯入腳本（會先清除現有資料）

