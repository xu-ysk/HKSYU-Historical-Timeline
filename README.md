# 香港樹仁大學互動歷史相冊

第一版使用本地示例內容，真實 Excel、照片與展廳觸控於第二版接入。產品範圍見 [PRD.md](./PRD.md)，執行計劃見 [spec.md](./spec.md)。

需要 Node.js 24 和 npm（開發環境為 Node.js 24.15.0、npm 12.0.2）。

```powershell
Set-Location -LiteralPath 'D:\MyCodingProject\HKSYU Museum Timeline'
npm ci
npm run dev
```

在 [本地開發頁面](http://127.0.0.1:5173) 體驗。端口固定，遇到佔用請先檢查來源，不要直接終止未知進程。

`npm run build` 生成 dist；`npm run preview` 在 http://localhost:4173 預覽構建。

## 操作

- 初次進入為立體相冊全覽。滾動鼠標、拖曳相冊或點選「瀏覽」即可近距離探索。
- 使用副標題下的「全覽／瀏覽」切換相冊視圖。
- 點相片將其抽出；同事件兩張相片會一起展示。點擊頁面任意位置或按 Esc 歸位。
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

`npm run test:e2e -- tests/e2e/detail.spec.ts --project=chromium` 可針對開發中的詳情功能復測，但交付前仍須執行完整矩陣。報告見 `playwright-report/index.html`，已記錄的結果見 [docs/validation.md](./docs/validation.md)。

最新標題、主題按鈕與點擊返回操作的驗證見 [docs/ui-controls-validation.md](./docs/ui-controls-validation.md)。

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

本地 Excel 與四張參考圖保留為原始資料，不會打包成歷史內容或上傳。第一版未讀取 Excel、未訪問學校照片服務，也未實現職員修改資料後的自動更新鏈路；provider 是第二版接入的擴展入口。

本輪驗證電腦尺寸為 1280×720、1440×900、1920×1080。展廳觸控、手機和平板的專門適配、真實照片性能及服務器部署需在第二版完成。
