# 香港樹仁大學互動校史時間軸

[简体中文](./README.md) | [繁體中文](./README.zh-Hant.md) | [English](./README.en.md)

這是香港樹仁大學校史的三語互動照片集與雙時間線網頁。項目使用 React、Vite 和 TypeScript，內容來源是項目根目錄的 `HKSYU Timeline.xlsx`，照片預設使用學校圖片伺服器上的公開圖片網址。

本文適用於 Windows、macOS 和 Linux，所有命令均在項目根目錄執行。產品範圍見 [PRD.md](./PRD.md)，Excel 欄位說明見 [manual.md](./manual.md)，歷史執行計劃見 [spec.md](./spec.md)。安裝和部署步驟以本文為準。

## 環境要求

- Git（複製儲存庫時使用；也可以下載並解壓縮儲存庫 ZIP）
- 建議使用 Node.js 24 LTS 及其附帶的 npm；目前 Vite 支援 Node.js 20.19.x 及以上的 20.x，或 22.12.0 及以上版本
- Python 3.10 或更高版本及 Pillow（從 Excel 匯入、執行即時內容服務或內容測試時需要）
- 可存取學校圖片伺服器的網絡連線（匯入時檢查照片尺寸，瀏覽器展示時載入照片）

Node.js 可從 <https://nodejs.org/> 安裝，Python 可從 <https://www.python.org/downloads/> 安裝。僅執行或建置儲存庫中已有的靜態網頁資料時，不需要安裝 Python。項目使用 `package-lock.json`，請透過 `npm ci` 安裝依賴套件。

## 取得項目並安裝前端依賴套件

在你希望存放項目的位置開啟終端機，執行以下命令。目錄名稱 `hksyu-timeline` 可以自訂；如果使用自己的 fork，請替換儲存庫網址。

```bash
git clone https://github.com/xu-ysk/HKSYU-Historical-Timeline.git hksyu-timeline
cd hksyu-timeline
npm ci
```

也可以下載儲存庫 ZIP，解壓縮後在包含 `package.json` 的目錄開啟終端機並執行 `npm ci`。本項目預設從學校網址載入照片，無需另行下載 Git LFS 原圖；舊的離線照片模式才需要完整原圖。

## 設定 Excel 內容工具

需要更新 Excel 內容時，在項目根目錄建立 Python 虛擬環境並安裝 Pillow。

Windows PowerShell（`py` 為 Python 安裝程式提供的啟動命令）：

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install Pillow
```

如果沒有 `py`，可用已安裝的 Python 3 對應的 `python` 替換 `py -3`。如果 PowerShell 限制啟用指令碼執行，可以在 Windows 命令提示字元（CMD）中使用：

```bat
py -3 -m venv .venv
.venv\Scripts\activate.bat
python -m pip install Pillow
```

macOS / Linux 的 Bash 或 Zsh：

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install Pillow
```

Linux 如果提示缺少 `venv` 或 `pip`，請透過系統套件管理工具安裝對應的 Python 3 venv/pip 元件後重試。新開終端機時重新執行對應的啟用命令，再執行下文的 Excel 命令；啟用後 Windows、macOS 和 Linux 都可以使用 `python`，項目中的 npm 指令碼也會使用該環境。

`.venv/` 是本機依賴套件目錄，提交時請只暫存需要發佈的檔案，不要把它加入儲存庫。

## 本機執行

在已安裝前端依賴套件的項目目錄執行：

```bash
npm run dev
```

開發網頁預設網址為 <http://127.0.0.1:5173/>。保持終端機執行，按 `Ctrl+C` 停止。連接埠衝突時可以使用 `npm run dev -- --port 5174` 並存取終端機顯示的新網址。開發服務讀取 `public/timeline.json`，儲存 Excel 後仍需匯入資料，或改用下文的即時服務。

產生正式版本並預覽：

```bash
npm run build
npm run preview
```

正式建置輸出在 `dist/`。預覽服務預設網址為 <http://127.0.0.1:4173/>。

上述網址指向執行命令的那台電腦。換一台電腦部署時，只需在新電腦執行這些步驟，無需沿用任何個人電腦的磁碟機代號或目錄。

## Excel 內容更新

`HKSYU Timeline.xlsx` 是校史文字、照片分類和照片網址的編輯來源。活頁簿包含三個工作表：

- `樹仁校史`：上方樹仁校史時間線文字
- `香港教育史`：下方高等教育重點政策時間線文字
- `圖片`：照片、照片詳情文字和主題分類

英文標題／正文使用 C/D 欄，繁體中文使用 E/F 欄，簡體中文使用 G/H 欄。`圖片` 工作表的 `category` 決定五個主題：A 校園發展、B 榮譽／服務／緬懷、C 從書院到大學、D 校務拓展、E 重塑博雅教育。照片網址放在 `photo-1` 至 `photo-5` 欄，每格一條完整圖片網址。

保留工作表名稱、欄位和事件 ID。三種語言需分別編輯，程式不會自動翻譯。目前圖片匯入支援學校 `https://umtimeline.hksyu.edu/Historical_Timeline_Images/` 下的圖片網址。

修改並儲存活頁簿後，在已啟用 Python 環境的終端機中產生網頁資料：

```bash
npm run prepare:publish
```

這個命令會檢查 Excel 內容和遠端圖片尺寸，產生 `public/timeline.json`，然後執行正式建置。它不會修改原 Excel，也不會自動提交、推送或部署。只想重新產生 JSON 時可以執行：

```bash
npm run import:data
```

預設匯入保留學校圖片伺服器的完整網址，不要求下載整套原圖。圖片必須能夠在瀏覽器中直接開啟，且不需要登入；如果伺服器覆蓋了同名圖片，建議在 Excel 網址末尾修改版本參數，例如 `?v=2`，讓網頁重新檢查和載入圖片。

## 編輯後自動重新整理本機網頁

如果需要在編輯 Excel 後自動更新本機預覽，先產生一次正式建置，再啟動即時服務：

```bash
npm run build
npm run serve:live
```

即時服務預設網址為 <http://127.0.0.1:4173/>，每 2 秒檢查活頁簿，網頁每 15 秒及返回前景時檢查新內容；開啟照片詳情時會等返回時間軸後再套用更新。更新失敗時保留上一份有效內容，修正 Excel 後會自動重試。服務視窗必須保持執行，按 `Ctrl+C` 可停止；不要同時啟動佔用 4173 連接埠的 `npm run preview`。

即時服務使用預設的遠端照片模式，不需要本機照片鏡像。特殊的離線舊流程仍可使用 `--local-photos`，但需要準備對應的本機原圖目錄：

```bash
npm run serve:live -- --local-photos
```

## 部署為靜態網站

可以將網站部署到支援靜態檔案的伺服器，例如 Nginx、Apache 或靜態網站託管平台。準備好內容後執行：

```bash
npm run prepare:publish
```

將產生的 `dist/` **目錄內全部檔案**上傳到網站公開目錄，使用 HTTP/HTTPS 存取。網站伺服器僅需提供靜態檔案，訪客瀏覽器會直接從學校伺服器載入照片；不需要在網頁伺服器安裝 Node.js 或執行 Python。不要透過雙擊 `index.html` 的 `file://` 方式開啟，網頁需要透過 HTTP 請求載入 JSON。

如果內容已經在 `public/timeline.json` 中準備好，也可以僅執行 `npm run build`。每次更新內容或程式碼後重新建置並上傳。

如果自行管理的伺服器直接提供本項目 `dist/` 內的檔案，並希望儲存 Excel 後自動更新文字和照片網址，可在伺服器上設定前述 Python 環境，並在項目根目錄保持以下命令執行：

```bash
python scripts/publish-static.py --workbook "HKSYU Timeline.xlsx" --output dist/timeline.json
```

此方式需要伺服器可讀取 Excel、寫入網站目錄並存取學校圖片伺服器，只更新內容資料；修改前端程式碼仍需重新建置。網站目錄不在 `dist/` 時，將 `--output` 改為實際網站目錄下的 `timeline.json` 路徑。它不適用於 Vercel 的靜態部署。

## Vercel 部署

### 首次部署

1. 使用自己的 GitHub/GitLab/Bitbucket 儲存庫或 fork，將項目匯入自己的 Vercel 帳戶。
2. Root Directory 選擇包含 `package.json` 的目錄，Framework Preset 選擇 Vite；Install Command 使用 `npm ci`，Build Command 使用 `npm run build`，Output Directory 使用 `dist`，Node.js 版本選擇 24.x。
3. 部署前在自己的電腦執行 `npm run prepare:publish`，並將更新後的 Excel 和 `public/timeline.json` 提交、推送到自己的儲存庫。已確認 JSON 內容是最新時，可以直接使用現有檔案部署。
4. 部署完成後開啟 Vercel 提供的網域，確認主頁、照片、三種語言和時間線文字正常顯示。

Vercel 部署的是儲存庫中的靜態檔案，不會讀取部署者電腦上的 Excel，也不會執行本機 `serve:live` 監聽服務。

### 發佈 Excel 的最新內容

每次修改 Excel 後，在項目目錄執行：

```bash
npm run prepare:publish
git status
git add "HKSYU Timeline.xlsx" public/timeline.json
git commit -m "更新校史時間軸內容"
git push
```

以上範例假定目前分支已關聯自己的遠端分支，且你有推送權限；使用 Git 連接部署時，以 Vercel 設定中的 Production Branch 為準。程式碼和說明也有修改時，一併檢查並提交相應檔案。等待 Vercel 的 Production 部署顯示 Ready 後，再開啟正式網址檢查。只儲存本機 Excel、只執行普通 `npm run build` 或只上傳 Excel，都不會更新線上網頁；必須發佈新產生的 `public/timeline.json`。

也可以在產生成功後使用已設定好的 Vercel CLI 發佈：

```bash
npx vercel login
npx vercel link
npx vercel --prod
```

按 CLI 提示選擇自己的帳戶和項目。Vercel 上使用普通 `npm run build` 即可，Python 轉換在內容維護者電腦上完成；無需將即時服務設定成 Vercel 啟動命令。可以存取正式網站的 `timeline.json`，比較其 `revision` 與本機檔案是否一致，以確認新內容已上線。

## 目前網頁互動

- 頁面開啟後直接進入全覽，操作指引需要點擊按鈕才會顯示。
- 全覽頁面展示照片集和兩條時間線；點擊時間線圓點後，文字顯示在對應標題下方。
- 相冊保持全覽，拖曳或滾動不會進入舊的「瀏覽」模式。點擊照片開啟詳情；詳情中的小房子關閉詳情，文字下方的左右箭頭切換有照片記錄的事件。詳情開啟三分鐘後自動關閉，詳情內保留照片縮放與拖曳。
- 點擊右下方主題後只顯示並放大該主題照片，隱藏時間線及對應文字；點擊小房子或左上角「全覽」返回主頁。再次點擊同一主題保持選中；進入主題三分鐘後自動返回，切換主題會重新計時。
- EN、繁、简按鈕同時切換介面標籤與活頁簿中對應語言的文字。

頁面以桌面瀏覽器和橫向展廳大屏為主要展示場景；手機和平板不屬於目前完整適配範圍。部署後請在實際展示設備及縮放比例下檢查排版。

## 測試

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run test:content
npm run build
npm run test:e2e
```

`npm run check` 依次執行 ESLint、單元／元件測試、Python 內容測試、正式建置（含 TypeScript 檢查）和完整瀏覽器測試。Python 測試需先啟用前述環境。只執行 Chromium 時，先安裝並執行：

```bash
npx playwright install chromium
npm run test:e2e -- --project=chromium
```

完整瀏覽器設定還包含 Chrome 和 Edge，需要電腦上安裝這兩個瀏覽器，或執行 `npx playwright install chrome msedge`。Linux CI 可使用 `npx playwright install --with-deps chromium` 安裝 Chromium 及系統依賴套件。執行前關閉佔用測試連接埠的預覽服務，測試會自行建置並啟動服務。

目前全覽和時間線原位文字互動的專項檢查：

```bash
npx playwright test --config playwright.overview.config.ts --project=chromium
```

該專項設定使用 4186 連接埠和正式資料。部分歷史測試仍針對舊的瀏覽模式或置中彈框，需結合目前互動判斷；這裏列出執行方式，不代表完整歷史測試已全部通過。報告見 `playwright-report/index.html`，歷史驗證記錄見 [docs/validation.md](./docs/validation.md)。

## 常見問題

- **網頁沒有顯示最新 Excel 文字**：確認已儲存正確的活頁簿，然後執行 `npm run prepare:publish`；本機即時服務和 Vercel 線上網頁是兩套獨立資料來源。
- **照片無法顯示**：在瀏覽器直接開啟 Excel 中的完整網址，確認不需要登入且回傳的是圖片；檢查電腦和部署環境的網絡存取權限。
- **Vercel 仍是舊內容**：確認 `public/timeline.json` 已提交並推送到 Vercel 使用的正式分支，再檢查新的 Production 部署是否成功。
- **匯入時出現 Pillow 或圖片尺寸錯誤**：安裝 Pillow 並檢查遠端圖片網址；修正後重新執行 `npm run prepare:publish`。
- **連接埠被佔用**：停止舊的 Vite、preview 或 live 服務後再啟動，避免同時執行多個服務。

## 主要目錄

| 路徑 | 用途 |
| --- | --- |
| `src/` | React 頁面、時間線互動、主題和樣式 |
| `HKSYU Timeline.xlsx` | 三個工作表的內容來源 |
| `scripts/import-timeline.py` | 從 Excel 產生時間軸 JSON |
| `scripts/publish-static.py` | 發佈前一次性檢查並產生 JSON |
| `scripts/serve-live.py` | 本機建置網站與 Excel 即時更新服務 |
| `public/timeline.json` | Vercel 靜態部署使用的資料檔案 |
| `dist/` | `npm run build` 產生的正式檔案 |
| `tests/` | 單元、內容和瀏覽器測試 |
