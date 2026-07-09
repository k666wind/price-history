# Price History 2.1 — Handover

專案：Firebase PWA 記價工具（repo 名稱：`price-history`，部署路徑 `/price-history/`）

## 專案結構

```
price-history-2.1/
├── index.html          # 登入 / 分類列表首頁
├── tracker.html         # 分類記錄頁（亮色主題，正式/預設版）
├── tracker-dark.html    # 分類記錄頁（暗色主題，原名 Tracker.html，已改名避免大小寫衝突）
├── firebase.js          # Firebase 初始化 (auth, db)
├── sw.js                # Service Worker，BASE_PATH = /price-history/
├── manifest.json         # PWA manifest，start_url/scope = /price-history/
├── firestore.rules      # ⚠️ 目前與實際資料路徑不符（見下方「已知未解決問題」）
├── style.css
└── README.md
```

資料模型（Firestore）：
```
users/{uid}/categories/{catId}          # 使用者自訂分類
users/{uid}/records_{catId}/{docId}     # 每個分類底下的價格記錄
```
每筆 record 欄位：`product`(lowercase), `productOriginal`, `store`(lowercase), `storeOriginal`, `price`(number), `currency`(string，新加), `date`(ISO string)

---

## Session 5 已完成的修改（清哂上次 review 提出嘅 optional fix + feature idea）

1. **`meta/counts` backfill**：`index.html` 嘅 `loadRecordCounts()` 讀完 cache 之後，會自動對「未喺 `meta/counts` 出現過」嘅分類（即係呢個 feature 上線之前已經有記錄、但用戶未開過嗰個分類 tracker 頁）逐個做返一次舊式 `getDocs` 查真實數量，寫返去 cache（`backfillMissingCounts()`）。之後嗰個分類就會一直命中 cache，唔會變返 N+1。冇寫獨立 admin/Cloud Function script，因為呢個 repo 冇 server-side infra，用「client-side lazy backfill」代替。
2. **舊自訂分類一鍵重新配色**：`index.html` 加咗 `🎨 Recolor legacy categories` 按鈕（`renderCustomList()` 會判斷有冇 `color` 欄位缺失嘅自訂分類先顯示呢個按鈕），click 會幫全部冇 `color/blob/pill/pillText` 嘅自訂分類，用返同新建分類一樣嘅 `CAT_PALETTE` 輪流配色，並 `setDoc(...,{merge:true})` 寫返去 Firestore。
3. **Price hint 整合歷史最低價（即時破新低提示）**：`tracker.html` 嘅 `updatePriceHint()`（本身已經係 input 打緊字就即時觸發，唔使等 submit）而家會優先檢查打緊嘅價錢係咪低過呢個商品嘅歷史最低價，係嘅話顯示金色 `🎉🏆 New record low!` 提示（比單純「同上次比較」更值得留意）；如果唔係新低先跌返去原本「同上次比較」嘅邏輯。呢個同時解決埋 review 度提出嘅「price hint 同 trend badge 冧唔埋歷史最低價」呢個 logic concern。
4. **跨分類搜尋最平價**：`index.html` 首頁加咗 `🔎 Find Cheapest Across Categories` 卡片，輸入商品名（跟返 code 入面既 normalize 規則：trim + lowercase）之後，會逐個分類（`DEFAULT_CATS` + `customCats`）發一次 `where('product','==',term)` 查詢，收集全部命中記錄，按價錢由平到貴排序，最平嗰筆用綠色高亮 + 🏆，最多顯示 10 筆。呢個只喺用戶主動搜尋先觸發查詢，唔會拖慢首頁載入速度。
5. **`sw.js` cache 版本**：跟住呢輪改動升到 `price-history-v6`。

以上全部改動都用 `node --check`（script）+ `html.parser`（HTML）+ `json.load`（manifest.json）+ 括號配對（firestore.rules）驗證過語法。

---

## Session 4 已完成的修改（5 個新功能）

1. **Count denormalization（解決 N+1 查詢）**：新增 `users/{uid}/meta/counts` 文件，格式 `{counts:{catId:number}}`。`tracker.html` 每次 `fetchRecords()` 真正向 server 攞新資料後，都會 `setDoc(...,{merge:true})` 寫返實際長度（唔用 `increment()`，直接寫返真實數字，等有偏差都自動修正）。`index.html` 嘅 `loadRecordCounts()` 而家淨係一個 `getDoc`，唔再逐個分類 `getDocs`。
   - ⚠️ **Migration 限制**：呢個 feature 上線之前已經有記錄、但用戶未開過嗰個分類嘅 tracker 頁，會顯示 0/"New"，一旦打開一次個分類就會自動補返正確數字（self-healing）。冇做主動 backfill script。
   - `firestore.rules` 已加 `meta` 做合法 `collectionId`。
2. **CSV 匯入去重**：`product|store|price|date` 做 signature，匯入前攞晒現有記錄嘅 signature set，遇到重複就跳過（同時防止同一份 CSV 入面自己有重複行）。Import 完成 toast 會顯示 `skipped N duplicate(s)`。
3. **歷史最低價慶祝提示**：Add Record 之前，先攞返呢個商品現有嘅最低價同新價錢比較；如果呢個商品之前有記錄（唔係第一次新增）並且創咗新低，Add 完會顯示 `🎉 New record low for "xxx"!` 特別 toast，唔係就顯示返平時嘅 `Record added ✓`。
4. **Expand all / Collapse all 按鈕**：喺 search bar 下面、dashboard 上面加咗個按鈕，按鈕文字會根據目前狀態自動切換（`Expand all ▾` / `Collapse all ▴`），冇記錄時自動隱藏。`toggleDetails(domId, forceOpen)` 加咗第二個參數，畀單一 item click 同呢個全域按鈕共用同一套邏輯。
5. **自訂分類自動配色**：新增 `CAT_PALETTE`（8 組 `color/blob/pill/pillText`），建立自訂分類時根據現有自訂分類數量輪流揀一組寫入 Firestore，令自訂分類唔會全部都係 fallback 橙色，`index.html` 分類卡片同 `tracker.html` 個 `--cat-color` 都會用返呢啲顏色。
   - ⚠️ **舊有自訂分類唔會自動補色**：喺呢個功能上線之前建立嘅自訂分類冇 `color/blob/pill` 欄位，會繼續 fallback 用返 `#f4845f`。如果想全部補齊，可以之後寫個一次性 migration script 幫佢哋逐個 `setDoc(...,{merge:true})` 補返顏色。

以上全部改動都用 `node --check`（script）+ `html.parser`（HTML）+ `json.load`（manifest.json）驗證過語法。

---

## Session 3 已完成的修改（firestore.rules / manifest.json / style.css 清理）

1. **`firestore.rules` 改到符合實際資料路徑**：舊規則只覆蓋 `/records/{docId}`（程式碼根本冇用呢個 collection），而家改成 `match /users/{uid}/{collectionId}/{docId}`，加咗 `request.auth.uid == uid` ownership check，並限制 `collectionId` 一定要係 `categories` 或者 `records_*`，其他一律 catch-all deny。**呢個係本來 review 度標示嘅最高優先級問題，而家已修好，記得 `firebase deploy --only firestore:rules` 部署上去，同埋去 Firebase Console 對一次現行規則有冇跟住更新。**
2. **`manifest.json` 顏色對齊**：`theme_color` 由 `#3880ff`（藍色，舊版殘留）改成 `#fdf6ee`；`background_color` 都由 `#ffffff` 改成 `#fdf6ee`，等 splash screen 同實際 UI 一致，唔會白閃一下。
3. **刪走死檔案 `style.css`**：確認冇任何 HTML `<link>` 引用之後刪除，`sw.js` 快取清單同步移除，`CACHE_NAME` 再升到 `price-history-v5`。

---

## Session 2 已完成的修改（移除 dark theme + 圖表 collapse + Y 軸精度）

1. **移除 dark theme**：刪除 `tracker-dark.html`，`tracker.html` 移除 🌙 theme toggle 按鈕、相關 CSS 同 JS。`sw.js` 快取清單移除該檔案，`CACHE_NAME` 升到 `price-history-v4`（強制舊 SW 更新，唔會再嘗試 cache 一個已刪除嘅檔案）。`README.md` 同步移除相關描述。
   - ⚠️ **未處理**：`style.css` 入面仲有 `body.dark` 呢個 legacy rule，但呢個檔案根本冇被任何 HTML `<link>` 引用（死檔案，疑似舊 Ionic 版本殘留），今次冇動佢，建議日後直接刪走個檔案。
2. **每個商品卡片改成 collapse 模式**：`prod-header` 保留 Latest / Lowest badge，並加咗日期（`Latest £1.29 · Tesco · 2026-06-01`）；下面新增一個 `Show price history & chart (N)` 按鈕，click 先展開 `.entries`（完整價格記錄列表）同 `.charts`（Chart.js 圖表）。
   - Chart.js instance 改成 **lazy build**：只有展開果吓先起 chart，收合時會 `.destroy()` 個 instance 慳記憶體；`expandedKeys` set 會記住邊啲商品已展開，`refresh()`（新增/刪除/搜尋後）都會保持展開狀態。
   - 呢個做法同時解決咗原本「Chart.js instance 唔會 destroy」嘅已知 memory leak（見下面舊 issue 已消化）。
   - `renderDashboard()` 開頭而家會先 destroy 晒現存所有 chart instance 先至清空 `#dashboard`，避免因為 `innerHTML=''` 令 canvas 消失但 Chart.js instance 冇被 destroy（detached chart leak）。
3. **修正 Chart.js Y 軸浮點數精度**：兩個 chart（line/bar）嘅 y-axis tick `callback` 改用 `Number(v).toFixed(2)`，唔再直接用原始浮點數（會出現 `13.000000000002` 呢種顯示）。

以上修改都已用 `node --check` 對抽出嚟嘅 `<script type="module">` 內容做過語法檢查，無錯誤。

---

## Session 1 已完成的修改

1. **BASE_PATH 統一**：`sw.js` 的 `BASE_PATH` 從 `/shopping-pwa/` 改成 `/price-history/`（對齊 `manifest.json`），`index.html`/`tracker.html`/`tracker-dark.html` 三處 Service Worker 註冊路徑同步改為 `/price-history/sw.js`。快取版本升到 `price-history-v3`。
2. **清理死碼**：刪除已廢棄的 `app.js`；`firebase.js` 移除重複的 `initializeApp` 與註解殘留。
3. **重複檔名處理**：`Tracker.html`（暗色版）重新命名為 `tracker-dark.html`，避免與 `tracker.html` 在 Windows/macOS 等大小寫不敏感檔案系統上衝突。兩個頁面右上角互相加了 🌙/☀️ 主題切換連結（會保留 `id`/`name`/`emoji`/`color`/`currency` 等 URL 參數）。`index.html` 分類卡片預設仍連到 `tracker.html`（亮色）。
4. **貨幣存進資料本身**：新增/CSV 匯入記錄時，`currency` 欄位會一併存進 Firestore。`renderDashboard()` 改成依「商品 + 幣別」分組（`productMap` key 變成 `${product}||${currency}`），漲跌 badge、最低價、圖表 Y 軸符號都只在**同幣別**的記錄之間計算/顯示，不同幣別的記錄會分開顯示成不同卡片並標註幣別。**舊資料**（沒有 `currency` 欄位）會被視為屬於目前顯示中的 currency，向下相容。
5. **CSV 逗號跳脫**：`tracker.html` / `tracker-dark.html` 都加了 `csvEscape()`（匯出時含逗號/引號/換行的欄位會用雙引號包起來）與 `parseCSVLine()`（正確解析含引號的 CSV 行）。CSV 欄位新增 `currency`（`product,store,price,currency,date`），匯入同時相容「舊 4 欄格式（無 currency）」與「新 5 欄格式」。

以上修改都已跑過 Node.js 語法檢查（`new Function()` 解析 script 內容），無語法錯誤。

---

## ⚠️ 已知但尚未解決的問題（使用者決定先擱置）

### `firestore.rules` 與實際資料路徑不符（Critical）
規則檔目前只開放 `match /records/{docId}`，其餘 `match /{document=**} { allow read, write: if false; }` 全部拒絕。但實際 App 讀寫的是 `users/{uid}/categories/{catId}` 和 `users/{uid}/records_{catId}/{docId}`，理論上會被擋掉。

**目前為什麼還能正常用**：Firebase Console 上「實際生效」的規則跟這份 repo 內的 `firestore.rules` 檔案不是同一份（這份檔案可能還沒被 `firebase deploy --only firestore:rules` 部署過，或 Console 上手動改過）。

**風險**：這是一顆未爆彈——現在能動不代表安全，一旦有人依這份檔案重新部署，或測試模式期限到期自動收緊，會瞬間打壞所有讀寫。

**建議修法**（尚未執行，等使用者確認）：
```
match /users/{uid}/categories/{catId} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
match /users/{uid}/records_{catId}/{docId} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

### 其他尚未處理的項目（優先度供參考）
- ~~N+1 查詢~~：**已在 Session 4 解決**，改用 `users/{uid}/meta/counts` denormalized count。
- ~~Chart.js 記憶體洩漏風險~~：**已在 Session 2 解決**。
- ~~CSV 匯入無去重機制~~：**已在 Session 4 解決**。
- ~~`style.css` 係死檔案~~：**已在 Session 3 刪除**。
- ~~`manifest.json` 嘅 `theme_color` 同實際 UI 唔一致~~：**已在 Session 3 修正**（連 `background_color` 都一齊改咗）。
- ~~Firestore 規則同實際路徑不符~~：**已在 Session 3 修正**，但**尚未部署**，記得手動 `firebase deploy --only firestore:rules`。
- ~~價格提示只跟上一筆比~~：**已在 Session 5 解決** —— `updatePriceHint()` 而家會優先檢查歷史最低價。`trendBadge()` 保持原本「同上一筆比較嘅趨勢箭嘴」用途唔變，歷史最低價已經有獨立嘅 🏆 Lowest badge 顯示，唔需要重疊。
- ~~分類顏色資訊不完整~~：**已在 Session 4 部分解決** —— 新建立嘅自訂分類會自動配 `color/blob/pill/pillText`（8 色 palette 輪流），但**舊有自訂分類冇補色**，仍然 fallback 橙色。

---

## 給下一個 Claude 對話的提示

- 這次修改的完整專案已打包成 zip 給使用者下載，若使用者在新對話中重新上傳，請先讀這份 `HANDOVER.md` 了解已完成/未完成的部分，不要重複做同樣的修正。
- 使用者偏好：先問清楚「哪個才是正式版/實際部署路徑」等關鍵假設，不要用預設猜測值直接改重要設定（例如 BASE_PATH、正式版檔案）。
- `firestore.rules` 已喺 Session 3 按使用者要求改到符合實際資料路徑（`users/{uid}/categories`、`users/{uid}/records_*`、`users/{uid}/meta`），但**尚未部署去 Firebase Console**，記得提醒使用者手動 `firebase deploy --only firestore:rules`。
