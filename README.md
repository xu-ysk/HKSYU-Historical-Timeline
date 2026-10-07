# 香港樹仁大學互動歷史相冊

第二版已接入 Excel 匯出的校史內容及 186 張真實照片，並保留第一版的時間軸互動和照片集版式。產品範圍見 [PRD.md](./PRD.md)，執行計劃見 [spec.md](./spec.md)。

需要 Node.js 24 和 npm（開發環境為 Node.js 24.15.0、npm 12.0.2）。重新匯入資料另外需要 Python 3；匯入程式只使用 Python 標準庫。

```powershell
Set-Location -LiteralPath 'D:\MyCodingProject\HKSYU Museum Timeline'
npm ci
npm run dev
```

在 [本地開發頁面](http://127.0.0.1:5173) 體驗。端口固定，遇到佔用請先檢查來源，不要直接終止未知進程。

`npm run build` 生成 dist；`npm run preview` 在 http://localhost:4173 預覽構建。

## 真實資料

正式構建從 `public/timeline.json` 讀取文字與照片資料，並包含 `public/Historical_Timeline_Images/` 中的 186 張照片。原圖鏡像保存在本地的 `Historical_Timeline_Images/`，不會被 `git` 納入。更新工作簿或照片鏡像後可執行：

```powershell
npm run import:data
```

匯入程式會讀取工作簿的三個資料表，按年份區間的起始年份定位事件，生成三語文字、照片路徑和尺寸，並在本地原圖缺失時直接報錯。更新原圖後，須同步複製到 `public/Historical_Timeline_Images/` 並重新構建正式頁面；本地展廳服務則直接讀取原圖鏡像。工作簿和原始照片包保留在本地，不會被 `git` 納入。

### 無需重建的內容更新

職員直接編輯並儲存 `HKSYU Timeline.xlsx` 的三個工作表，不必修改 JSON 或匯出 CSV。首次部署或修改前端程式後執行一次 `npm run build`，然後在展廳電腦啟動：

```powershell
npm run serve:live
```

先關閉同樣使用 4173 端口的 `npm run preview`，再於 `http://127.0.0.1:4173/` 開啟正式頁面。服務每 2 秒檢查工作簿及原圖鏡像，變更時重新匯入和驗證，並原子替換 `.live-content/timeline.json`；網站從此獨立資料檔讀取，不改動 `dist`。已開啟的頁面每 15 秒檢查新內容，返回可見頁面時亦會檢查。正在查看照片詳情時，更新會等到返回時間軸後才套用，以保留目前閱讀位置。匯入失敗時服務保留上一份有效資料並在終端顯示錯誤；修正工作簿後會自動重試。請讓 `serve:live` 保持運行，並確保 Python 3、工作簿和原圖鏡像留在展廳電腦。

這是本機展廳服務流程；若日後改由學校伺服器發佈，需要把相同的即時資料路徑、照片路徑和自動匯入流程接到該伺服器。展廳服務直接從本地原圖鏡像提供照片，照片更新不需要重新構建頁面。

## 操作

- 初次進入為立體相冊全覽。滾動鼠標、拖曳相冊或點選「瀏覽」即可近距離探索。
- 瀏覽時左下照片按較早年代在上方的順序層疊，右上維持原有前後順序；拖曳與滾輪採用較慢的移動速度，方便逐張觀看。
- 使用副標題下的「全覽／瀏覽」切換相冊視圖。
- 點相片將其抽出；同事件兩張相片會一起展示。點擊頁面任意位置或按 Esc 歸位。
- 展覽觸屏輕觸照片一次即可打開詳情，拖動仍可瀏覽時間軸；長按文字不會選取或顯示 Copy。頁面通過 Pointer Events 處理觸控與滑鼠輸入。
- 右下五個主題框保留名稱與主題色；再次點擊已選中的主題可恢復全部照片。左上繁／簡／英切換界面語言。
- 在打開照片前選擇語言和主題；詳情的長文字仍可用滾輪閱讀。返回後保留原瀏覽位置與選擇，這次返回點擊不會同時觸發底層控件。

## 測試和驗證

```powershell
npx playwright install chromium
npm run typecheck
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```

`npm run check` 依序執行 ESLint、全部單元／組件測試、生產構建（含 TypeScript 檢查）和全部瀏覽器測試。Playwright 會自動啟動 4173 生產預覽並在測試結束後關閉；先停止同端口的手動預覽。

完整矩陣使用 Chromium、本機 Chrome 與 Edge；後兩者需要本機已安裝。`npx playwright install chrome msedge` 可在缺少瀏覽器的驗證機器上安裝。三套測試不設自動重試、不跳過失敗。完整測試包含每個瀏覽器 30 秒性能採樣，約需數分鐘。

上軌年份依可用空間最多分兩層排列；全覽時過密的數字會自動省略，事件圓點仍可點擊或懸停查看年份。放大瀏覽後會恢復顯示更多年份。`npx playwright test --config playwright.real.config.ts` 使用正式資料，驗證三種桌面尺寸下的年份間距、點擊跳轉、視圖切換與縮放。

`npm run test:e2e -- tests/e2e/detail.spec.ts --project=chromium` 可針對開發中的詳情功能復測，但交付前仍須執行完整矩陣。報告見 `playwright-report/index.html`，已記錄的結果見 [docs/validation.md](./docs/validation.md)。

最新標題、主題按鈕與點擊返回操作的驗證見 [docs/ui-controls-validation.md](./docs/ui-controls-validation.md)。

瀏覽層疊順序與滑動減速的驗證見 [docs/browse-refinement-validation.md](./docs/browse-refinement-validation.md)。

## 內容與調校位置

| 模組 | 用途 |
|---|---|
| `src/data/mockTimeline.ts` | 可重現示例內容，覆蓋無照片、單張與雙張照片 |
| `src/data/TimelineProvider.ts` | 第二版可替換的運行時資料來源契約 |
| `src/domain/timeline.ts` | 年份、事件 ID、主題、三語文本與照片模型 |
| `src/config/themes.ts` | 五主題顏色與三語名稱 |
| `src/i18n/messages.ts` | 三語界面標籤 |
| `src/config/scene.ts`、`src/timeline/layout.ts` | 斜角、卡片尺寸、時間長度、中央分離與對齊 |
| `src/timeline/TimelineController.ts` | 滾輪、拖曳、動畫、主題與照片歸位 |
| `src/timeline/detailLayout.ts` | 雙照片排版和保持完整比例的計算 |
| `src/domain/useCurrentYear.ts` | 香港時區跨年及恢復可見時更新 |

第一版 mock 以載入時的當前年份生成；跨年後重新載入並保留焦點。相册中的照片入口使用統一橫向封套，打開詳情時依各照片自己的比例完整顯示。

## 版本邊界

本地 Excel 是匯入來源，照片鏡像是正式靜態資源；兩者都保留在本地，避免依賴只能由校內電腦訪問的伺服器。第二版使用約 85 寸、1920 × 1080 的橫向展覽觸屏，作業系統、縮放比例和瀏覽器仍待場地確認。

本輪瀏覽器驗證尺寸為 1280×720、1440×900、1920×1080；已加入粗指標觸控的命中區處理，並按 1920 × 1080 展屏規格驗證輕觸打開照片及禁止長按文字選取。手機和平板不在第二版適配範圍內。
