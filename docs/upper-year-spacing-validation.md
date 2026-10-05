# 上軌年份間距修復（2026-10-05）

V2 的 28 個上軌事件包含多組連續年份，全覽時逐一顯示會造成數字重疊。現在按照畫面中的實際座標安排最多兩層年份，保留水平或垂直留白；無法容納的文字暫時省略，事件圓點、無障礙名稱、懸停提示和點擊跳轉仍然保留。瀏覽放大、拖動和調整窗口時重新計算，細引線標明年份所屬的時間點。

## 驗證

- ESLint 通過；34 項單元／組件測試通過。新增測試使用真實上軌年份，覆蓋三種尺寸、五種縮放進度和四個焦點位置，檢查文字間距與最大抬升高度。
- `npx playwright test --config playwright.real.config.ts`：9 項通過。以正式資料在 Chromium、Chrome、Edge 檢查 1280×720、1440×900、1920×1080 的年份間距、文字點擊跳轉、窗口縮放與返回全覽。人工檢查 1280 和 1440 寬度的實際截圖。
- `npm run test:e2e`：完整 198 項執行完畢，196 項通過，2 項 Chrome 動畫採樣斷言失敗：照片抽出中間幀數為 15（要求 >15），快速主題切換的一次縮放步幅為 0.249201（要求 <0.2）。
- 上述兩項使用原斷言單獨復測，2 項均通過；沒有降低門檻、跳過測試或修改照片動畫。完整矩陣並非一次全綠，動畫採樣仍有波動風險。原始輸出保存在本地 `upper-years-regression.log` 與 `upper-years-recheck.log`。

單獨復測指令：

```powershell
npx playwright test tests/e2e/reference-extraction.spec.ts tests/e2e/reference-themes.spec.ts --project=chrome --grep 'school-1954-1|rapid retargeting' --output=test-results/recheck --reporter=list
```
