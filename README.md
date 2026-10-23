# 香港樹仁大學互動歷史相冊

第二版已接入 Excel 匯出的校史內容及 179 張學校伺服器照片，並保留第一版的時間軸互動和照片集版式。產品範圍見 [PRD.md](./PRD.md)，執行計劃見 [spec.md](./spec.md)。

需要 Node.js 24 和 npm（開發環境為 Node.js 24.15.0、npm 12.0.2）。重新匯入資料另外需要 Python 3 和 Pillow（`python -m pip install Pillow`），用來讀取學校圖片的尺寸，保持照片原有比例。

```powershell
Set-Location -LiteralPath 'D:\MyCodingProject\HKSYU Museum Timeline'
npm ci
npm run dev
```

在 [本地開發頁面](http://127.0.0.1:5173) 體驗。端口固定，遇到佔用請先檢查來源，不要直接終止未知進程。

`npm run build` 生成 dist；`npm run preview` 在 http://localhost:4173 預覽構建。

## 真實資料

正式構建從 `public/timeline.json` 讀取三語文字與學校圖片網址。照片直接由 `https://umtimeline.hksyu.edu/Historical_Timeline_Images/` 載入，不再依賴本地原圖或 `public` 中的照片副本。

```powershell
npm run import:data
npm run build
npm run serve:live
```

`import:data` 讀取 Excel 三個工作表，保留完整圖片網址及查詢參數，並聯網讀取圖片尺寸。新連結無法讀取時報錯，避免發佈不完整內容。圖片尺寸在服務執行期間按網址快取，改文字不會重新下載全部圖片。

### 無需重建的內容更新

首次部署或修改前端程式後執行一次 `npm run build`。日常在專案目錄執行 `npm run serve:live`，於 `http://127.0.0.1:4173/` 開啟網頁，保留終端。若已有同端口的 `npm run preview`，先停止它。

職員只需修改並儲存 `HKSYU Timeline.xlsx` 的文字或 `photo-1` 至 `photo-5`。服務每 2 秒檢查 Excel，驗證後原子替換 `.live-content/timeline.json`；網頁每 15 秒及返回前台時檢查，詳情開啟時等返回時間軸再更新。錯誤時保留上一份有效內容，修正 Excel 後自動重試。不需要重新導入、構建、複製照片或下載 Git LFS 原圖。

電腦需聯網，新照片應先上傳到學校圖片伺服器，再把能直接開圖的完整網址填入 Excel。覆蓋遠端同名圖片時，請更換 Excel 中的網址版本參數（例如 `?v=2`）；以新網址觸發圖片檢查和載入。完整演示與部署步驟見 [manual.md](./manual.md)。

正式伺服器可用 `python scripts/publish-static.py --workbook <正式Excel路徑> --output <網站目錄>/timeline.json` 常駐發佈。它不需要 `--photo-root`。舊本地模式可用 `npm run serve:live -- --local-photos`，離線靜態導入可用 `python scripts/import-timeline.py --prepare-photos`。

### Vercel 發佈

Vercel 網站使用上次部署的 `timeline.json`，不會讀取這台電腦上的 Excel。`serve:live` 只更新本地演示；其中的 `.live-content/timeline.json` 不會提交到 Git。一般的 `npm run build` 也不會重新匯入 Excel。

儲存 Excel 後，在本地執行 `npm run prepare:publish`。此命令先檢查並匯出最新 Excel 至 `public/timeline.json`，成功後才構建 `dist`；無效的 Excel 或圖片網址會中止發佈準備並保留原有 JSON。它需要本地 Python 3、Pillow 及網絡連線，不會自動提交、推送或部署。

若 Vercel 已連接 GitHub，將更新後的 Excel 及 `public/timeline.json` 提交、推送到 Vercel 設定的正式分支，等待正式部署成功。Vercel 仍使用 `npm run build`、輸出目錄 `dist`，不用在 Vercel 上執行本地監聽服務。若透過 CLI 發佈，則在準備成功後用原來的正式部署方式發佈最新版本。完整操作見 [manual.md](./manual.md)。

要做到僅儲存 Excel 就自動更新線上站點，需要另接自動上傳／發佈服務。學校開放圖片網址，代表照片可被讀取，並不代表 Excel 的文字及新網址會自動上傳到 Vercel。

## 操作

- 開啟頁面直接進入全覽，操作指引不會自動彈出，閒置後亦不會再次顯示。點擊頁首「全覽」右側的「操作指引」按鈕才會開啟，關閉後保留原本的瀏覽位置。
- 相冊僅保留全覽；滾輪、拖曳及觸控滑動不會切換視角、縮放或移動時間軸。照片詳情內的縮放與拖曳仍可使用。
- 點擊兩條時間線上的任一圓點，文字會直接更新於左側「01 / 樹仁校史」或右側「02 / 高等教育重點政策」標題下方，不再開啟居中彈層。兩側各自保留選中的年份，同年多條記錄完整顯示；使用頁首 EN／繁／简切換語言，點擊時間線圓點切換年份。字級按視窗與內容長度調整，無內部捲動框；時間線與照片集保持原位。
- 點相片將其抽出；同事件多張相片（包括五圖）會一起展示。點擊年代上方的小房子返回時間軸；文字下方的左右箭頭可直接切換上一個或下一個有記錄的年份。首年只顯示右箭頭，末年只顯示左箭頭；詳情開啟三分鐘後亦會自動返回。
- 在照片詳情中，電腦可用滑鼠滾輪縮放、拖曳放大後的照片；展廳觸控螢幕可雙指縮放、單指拖曳。放大倍率會按展示圖片的像素及螢幕像素比設上限，以避免放大造成額外模糊；低解像度照片的可放大範圍較小。
- 展覽觸屏輕觸照片一次即可打開詳情，拖動不會移動時間軸；長按文字不會選取或顯示 Copy。頁面通過 Pointer Events 處理觸控與滑鼠輸入。
- 右下五個主題框保留名稱與主題色；選中後只顯示該主題的照片，照片尺寸較未篩選時放大 25%；再次點擊已選中的主題會保持選中。主題選中時隱藏相冊兩側的時間線、年份、圓點及校史／教育史文字框；返回全覽後恢復。兩處小房子可退出主題、恢復全部照片及原比例，並返回全覽起點；三分鐘自動返回保留。左上 EN／繁／简切換界面語言。
- 在打開照片前選擇語言和主題；詳情文字在展屏尺寸中完整顯示，不設獨立滾動框，較窄視窗可捲動整個詳情頁閱讀。切換年份時沿用所選主題；返回後保留原瀏覽位置與選擇，小房子按鈕不會同時觸發底層控件。

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

全覽及時間線原位文字的針對性驗證：`npx playwright test --config playwright.overview.config.ts --project chromium`。使用正式資料，在獨立的 4186 端口構建及預覽；覆蓋兩條時間線的全部記錄、三語文字、五種桌面／大屏尺寸、兩側獨立選年且文字區不顯示箭頭、鼠標／觸控不移動時間軸，以及原有主題與照片詳情。舊的瀏覽模式及居中彈框測試要求不適用於這個版本。

完整矩陣使用 Chromium、本機 Chrome 與 Edge；後兩者需要本機已安裝。`npx playwright install chrome msedge` 可在缺少瀏覽器的驗證機器上安裝。三套測試不設自動重試、不跳過失敗。完整測試包含每個瀏覽器 30 秒性能採樣，約需數分鐘。

上軌年份依可用空間最多分兩層排列；全覽時過密的數字會自動省略，事件圓點仍可點擊或懸停查看年份。點選圓點會更新對應標題下方的歷史文字。`npx playwright test --config playwright.real.config.ts` 使用正式資料；時間線原位文字的新交互與排版驗證見上述全覽專項測試。

`npm run test:e2e -- tests/e2e/detail.spec.ts --project=chromium` 可針對開發中的詳情功能復測，但交付前仍須執行完整矩陣。報告見 `playwright-report/index.html`，已記錄的結果見 [docs/validation.md](./docs/validation.md)。

先前標題、主題按鈕與點擊返回操作的驗證記錄見 [docs/ui-controls-validation.md](./docs/ui-controls-validation.md)；目前的詳情返回方式以上方操作說明為準。

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
| `src/timeline/detailLayout.ts` | 一至五張照片的排版和保持完整比例的計算 |
| `src/domain/useCurrentYear.ts` | 香港時區跨年及恢復可見時更新 |

第一版 mock 以載入時的當前年份生成；跨年後重新載入並保留焦點。相册中的照片入口使用統一橫向封套，打開詳情時依各照片自己的比例完整顯示。

## 版本邊界

本地演示以專案中的 Excel 為內容來源，圖片直接使用已開放存取的學校伺服器網址；正式部署後由學校指定正式 Excel 的位置並運行發佈服務。第二版使用約 85 寸、1920 × 1080 的橫向展覽觸屏，作業系統、縮放比例和瀏覽器仍待場地確認。

本輪瀏覽器驗證尺寸為 1280×720、1440×900、1920×1080；已加入粗指標觸控的命中區處理，並按 1920 × 1080 展屏規格驗證輕觸打開照片及禁止長按文字選取。手機和平板不在第二版適配範圍內。
