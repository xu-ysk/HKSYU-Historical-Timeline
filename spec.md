# 香港树仁大学全域历史时间轴：第一版开发执行计划

| 项目 | 内容 |
|---|---|
| 计划版本 | V1.1 |
| 编写日期 | 2026-10-03 |
| 产品依据 | [PRD.md](./PRD.md)，用户已确认的第一版范围 |
| 本文用途 | 指导后续编码、联调、视觉检查和交付 |
| 当前状态 | V1.1 阶段 0～9 已完成，等待用户验收 |
| 交付目标 | 可在电脑浏览器运行、使用占位数据的完整交互原型 |

## 1. 执行原则与已核实的起点

### 1.1 开发前核查状态（2026-09-27）

- 项目目录：`D:\MyCodingProject\HKSYU Museum Timeline`。
- 已有文件：`PRD.md`、`HKSYU Timeline.xlsx`、`style1.png`、`style2.png`、`style3.png`、`style4.png`。
- 没有现成前端入口、依赖清单、组件或服务端代码，也没有现成测试。
- 当前目录不在 Git 仓库中。本次核查的 `git rev-parse --show-toplevel` 返回“not a git repository”。开发本地原型不以建立远程仓库为前提。
- 已核实 Node.js `v24.15.0`、npm `12.0.2` 可用；pnpm 不可用，统一使用 npm。
- 项目及其已检查的上级目录未发现 `AGENTS.md`。
- 未读取 Excel 的实际数据，不推断其工作表或字段已经符合后续接口。

### 1.2 执行边界

1. 保留现有 PRD、Excel 和四张参考图，直接在当前目录增加前端文件。
2. 第一版只使用本地生成的占位事件和空白照片，不请求学校服务器、不解析 Excel。
3. V1.1 在保留原四种核心视觉状态的基础上，增加三条同步时间线和二至四图照片组详情。
4. PRD 是产品范围依据。本文中的框架选择、数值参数和模块拆分是实施方案；如果技术调整不改变产品行为，可以同步修改本文后继续开发。
5. 自动读取 Excel、更新缓存、展厅触控适配属于第二版，不作为第一版的依赖。
6. 本文保留原开发顺序与验收条件；V1.1 新增阶段必须逐阶段测试，实际结果以更新后的验证文档为准。

## 2. 第一版技术方案

### 2.1 技术选择

| 层次 | 采用方案 | 具体用途 |
|---|---|---|
| 应用 | React + TypeScript | 页面组件、离散交互状态、类型约束 |
| 构建 | Vite | 本地开发、构建与静态预览 |
| 立体展示 | DOM + CSS 3D transforms | 照片倾斜、层叠、缩放；照片和文字继续使用普通 DOM |
| 动画 | GSAP 核心模块 | 统一驱动视图、主题及详情进度，不使用付费插件 |
| 样式 | 普通 CSS + CSS 自定义变量 | 暖白背景、主题色、安全边距与桌面适配 |
| 内容来源 | 本地 mock provider | 生成可重复的英文示例资料，返回统一数据结构 |
| 多语言 | 本地 TypeScript 字典 | 繁、简、英界面文字；第一版事件内容仍为英文占位 |
| 单元与组件验证 | Vitest + Testing Library | 时间映射、事件分组、状态转换及语言行为 |
| 浏览器验证 | Playwright | 真实滚轮、拖拽、详情操作、截图及控制台检查 |
| 代码检查 | TypeScript + ESLint | 类型、React hooks 和基础代码质量 |

选择 CSS 3D 的原因：第一版以数百张空白照片和 DOM 文字为主，所需效果是固定视角的立体队列与照片抽出，普通 DOM 可同时满足视觉、点击命中和文字可读性。第一版不引入 WebGL、数据库、后端服务、路由框架或大型 UI 组件库。

### 2.2 实施默认值

以下为可直接执行的技术默认值，并非新增的用户业务要求：

- 初始语言采用繁体中文，首次视图为全部主题的相册全览。
- 初始时间焦点为 1949 年；进入近距离浏览后从该焦点开始。
- 增加一个简洁的“全览／浏览”入口，使 style1 的全域密集构图与 style3 的近距离队列均可回到和验证。
- 第一版采用单页面 `/`，状态保存在当前会话内；不增加登录、收藏、后台编辑或跨设备同步。
- 默认开发地址为 `http://localhost:5173`，构建预览为 `http://localhost:4173`。
- 桌面验证尺寸为 1920×1080、1440×900、1280×720，主要视觉调校在 1440×900 进行。
- 主验收浏览器采用 Chrome、Edge 当前稳定桌面版。Firefox、Safari 暂不承诺完成正式验收，保留标准 DOM/CSS 实现以利后续检查。

## 3. 初始化步骤与命令

### 3.1 在现有目录安装依赖

不要在非空目录直接执行会覆盖文件的项目脚手架。先检查是否已有 `package.json`；仅在首次初始化且确认不存在时执行：

```powershell
Set-Location -LiteralPath 'D:\MyCodingProject\HKSYU Museum Timeline'
npm init -y
npm install react react-dom gsap
npm install -D vite @vitejs/plugin-react typescript @types/node @types/react @types/react-dom
npm install -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh globals
npm install -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
npm install -D @playwright/test
npx playwright install chromium
```

安装时检查实际依赖的 Node 和 peer dependency 要求；出现冲突应选兼容版本，不使用 `--force` 或 `--legacy-peer-deps` 掩盖。保留生成的 `package-lock.json`，后续复现使用 `npm ci`。已有依赖清单时先检查并补齐，不能重复初始化覆盖。

### 3.2 新建配置与脚本

创建 `index.html`、`vite.config.ts`、`vitest.config.ts`、`playwright.config.ts`、`eslint.config.js` 和 `tsconfig.json`；将 `package.json` 设为私有项目并配置 `type: "module"`。

TypeScript 使用严格检查、React JSX、DOM 与 Node 类型；覆盖 `src`、`tests` 及配置文件，排除 `dist`、`node_modules` 和测试产物。Vitest 只发现单元及组件测试；Playwright 只发现 `tests/e2e`，防止两种测试互相执行。

计划中的 npm scripts：

```json
{
  "dev": "vite --host 127.0.0.1 --port 5173 --strictPort",
  "typecheck": "tsc --noEmit",
  "lint": "eslint .",
  "test:unit": "vitest run",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "build": "npm run typecheck && vite build",
  "preview": "vite preview --host 127.0.0.1 --port 4173 --strictPort",
  "check": "npm run lint && npm run test:unit && npm run build && npm run test:e2e"
}
```

Playwright 的 `webServer` 运行上述 `preview`，所以执行 `test:e2e` 前必须先成功构建。端口被占用时确认占用来源，不直接终止未知进程；若换端口，同步修改测试 `baseURL` 和 README。

新增 `.gitignore`，包含 `node_modules/`、`dist/`、`playwright-report/`、`test-results/` 等生成目录。只安装计划需要的依赖，不在本阶段发布网页。

## 4. 目标目录及模块职责

以下为规划时的结构；实现中相同职责的小模块作了合理合并，实际差异见本文最后的实施记录。

```text
HKSYU Museum Timeline/
├─ PRD.md
├─ spec.md
├─ HKSYU Timeline.xlsx
├─ style1.png ... style4.png
├─ README.md
├─ package.json / package-lock.json
├─ index.html / tsconfig.json
├─ vite.config.ts / vitest.config.ts / playwright.config.ts
├─ eslint.config.js / .gitignore
├─ src/
│  ├─ main.tsx
│  ├─ app/App.tsx
│  ├─ domain/
│  │  ├─ timeline.ts          # 类型、ID、主题、数据契约
│  │  ├─ normalizeTimeline.ts # 校验、排序、事件到卡片映射
│  │  └─ currentYear.ts       # 可注入当前年份
│  ├─ data/
│  │  ├─ TimelineProvider.ts
│  │  ├─ mockTimeline.ts
│  │  └─ mockProvider.ts
│  ├─ i18n/messages.ts
│  ├─ config/themes.ts
│  ├─ config/scene.ts
│  ├─ timeline/
│  │  ├─ TimelineScene.tsx
│  │  ├─ TimelineController.ts
│  │  ├─ timelineReducer.ts
│  │  ├─ timeScale.ts
│  │  ├─ layout.ts
│  │  ├─ motion.ts
│  │  ├─ input.ts
│  │  ├─ PhotoCard.tsx
│  │  ├─ YearAxis.tsx
│  │  └─ TextTimelineLane.tsx # 上轨事件与香港教育史的文字轨道
│  ├─ components/
│  │  ├─ LanguageSwitcher.tsx
│  │  ├─ ThemeSwitcher.tsx
│  │  ├─ ViewModeSwitcher.tsx
│  │  └─ EventDetail.tsx
│  └─ styles/
│     ├─ tokens.css
│     ├─ global.css
│     ├─ timeline.css
│     └─ detail.css
├─ tests/
│  ├─ unit/
│  ├─ components/
│  └─ e2e/
└─ docs/
   ├─ validation.md
   └─ screenshots/
```

`TimelineScene` 负责 DOM 元素，`TimelineController` 负责连续动画值和元素引用，`layout` 负责纯计算，React reducer 只负责用户可感知的离散状态。上轨事件与教育史使用同一文字轨道组件或等价的可复用实现。数据 provider 不导入组件或操作 DOM。

## 5. 数据契约与示例资料

### 5.1 统一类型

先实现以下等价的数据结构，再开发视图。它们是内部契约，不是对 Excel 现有字段的推断。

```ts
type Locale = 'zh-Hant' | 'zh-Hans' | 'en';
type ThemeId = 'A' | 'B' | 'C' | 'D' | 'E';
type LocalizedText = Partial<Record<Locale, string>>;

interface EventText {
  title: LocalizedText;
  body: LocalizedText;
}

interface EventPhoto {
  id: string;
  kind: 'placeholder' | 'image';
  src?: string;
  width: number;
  height: number;
  alt: LocalizedText;
}

interface SchoolEvent extends EventText {
  id: string;
  year: number;
  orderInYear: number;
  themeId: ThemeId;
  photoGroupId: string;
  photos: EventPhoto[];
}

interface UpperRailEvent extends EventText {
  id: string;
  year: number;
  orderInYear: number;
}

interface EducationEvent extends EventText {
  id: string;
  year: number;
  orderInYear: number;
}

interface TimelineDataset {
  schemaVersion: 1;
  revision: string;
  upperRailEvents: UpperRailEvent[];
  schoolEvents: SchoolEvent[];
  educationEvents: EducationEvent[];
}

interface TimelineProvider {
  load(signal?: AbortSignal): Promise<TimelineDataset>;
}
```

- `photos: []` 表示“只有文字的学校事件”；渲染层为其产生一张合成空白卡片，不向原始数据偷偷添加照片。
- 有照片的 mock 事件使用 `kind: 'placeholder'` 和空白占位，不提供远程 `src`。
- `kind: 'image'` 预留给第二版；第一版不实现学校图片获取服务。
- 事件 ID 与照片 ID 必须稳定且唯一，不能用数组下标作为 React key。
- 卡片身份至少包含 `eventId + photoId`；无照片卡片使用 `eventId + text-only`。
- 同一照片组的两至四张照片通过稳定的 `photoGroupId` 关联；不能通过年份、标题或相邻数组位置判断是否一起抽出。若照片组对应单一事件，`photoGroupId` 可与 `eventId` 相同。
- 默认排序为 `year → orderInYear → id`，每次重算得到相同结果。
- 事件只提供 `en` 时，三种界面语言均回退显示该英文占位；主题及界面标签从三语字典读取。
- 统一检查 ID、有效年份、主题、图片尺寸和排序字段；异常 mock 数据在开发阶段报明确信息，不能静默错配。

### 5.2 确定性 mock 数据

- 生成约 240～320 条学校事件，五个主题均有足够数量，年份分布覆盖 1949 年至当前年。
- 至少准备 6 条无照片事件、6 条双照片组、3 组三照片组和 3 组四照片组，以及 3 组同年但不同照片组的样例；其余为单张占位照片。
- 香港教育史生成约 24～32 条文字事件；上轨事件生成覆盖胡鸿烈、钟期荣经历及创校过程的英文示例文字，二者均包含与学校事件同年、只有文字轨道、只有学校事件的情况。
- 预留至少一个三条时间线均无事件的年份，验证空年份仍保留时间位置。
- 二至四照片组样例覆盖横横、横竖和混合比例，以验证创意拼贴不会裁切内容。
- 使用如 `Event A-01`、`Sample education event` 的示例，页面以简短提示说明目前是演示内容。
- 通过固定规则或固定 seed 生成，不在渲染中使用不受控的 `Math.random()`；截图测试固定“当前年份”为 2026 年，生产逻辑仍读取真实当前年份。

当前年份集中由 `getCurrentYear()` 获取，按香港时区计算并允许测试注入。年份范围为 `1949..currentYear`；初始化和页面重新获得可见性时检查是否跨年，长时间打开时设置到下一次香港日期变化的检查。刷新范围时保留原先的焦点年份，再重新计算归一化位置。

## 6. 场景与双时间线布局算法

### 6.1 统一年份映射

建立唯一的 `timeScale`，上轨事件、树仁校史和香港教育史调用同一实例：

```text
startYear = 1949
endYear = currentYear
span = max(1, endYear - startYear)
u(year) = clamp((year - startYear) / span, 0, 1)
focusYear(u) = startYear + u × span
```

时间主坐标只能由年份产生。不得使用“学校第几个事件”和“教育史第几个事件”分别计算位置。事件较少的年份仍然占据相应时间跨度。

### 6.2 三条平行轨道

- 时间前进方向为屏幕左下到右上，单位向量记为 `d`。
- 与 `d` 垂直并朝右下的向量记为 `n`。
- 树仁校史照片轨道位于中间主轨；上轨事件和教育史文字轨道分别贴在照片轨道的上侧与下侧，共享同一个年份锚点。
- 三条轨道在同一年份之间的连线只沿轨道法线方向，保证同年的对应关系清晰。
- 在三轨之间显示稀疏年份刻度与当前年份提示；不同缩放级别减少刻度数量，避免全览时年份相互覆盖。
- 上轨事件和教育史的年份锚点跟随时间坐标；文字标签保持水平可读，不让整段说明跟着照片倾斜。
- 两条文字轨道相邻文字冲突时，优先展开当前焦点附近的说明，其余保留年份／短标签；全览中不强行铺开所有长段落。
- 文字避让只能移动文字框，必要时用短引线连回原年份，不改变时间锚点。

### 6.3 全览与浏览使用同一批卡片

定义 `zoomProgress ∈ [0,1]`：0 为 style1 全览，1 为 style3 浏览。设场景安全区域中心为 `C`，焦点归一化位置为 `f`：

```text
qOverview = overviewLength × (u - 0.5)
qBrowse = browseLength × (u - f)
qGap = qBrowse + gap × tanh(qBrowse / gapSoftness)
q = lerp(qOverview, qGap, zoomProgress)
yearAnchor = C + d × q
upperRailAnchor = yearAnchor - n × upperRailOffset
schoolAnchor = yearAnchor
educationAnchor = yearAnchor + n × educationOffset
```

- `overviewLength` 根据安全区域尺寸、斜线角度和照片边界计算，使 1949 年至当前年的队列能完整落入画面。
- `browseLength` 大于全览长度；`gap` 让当前照片两侧自然形成分离的照片队列。
- 上述非线性分离必须同时用于三条轨道锚点，不能只移动照片，否则年份会错位。
- `zoomProgress`、`f` 和 `gap` 平滑变化，不能在全览和浏览之间卸载重建整个场景。
- 当前聚焦的事件组只做额外的局部照片姿态变化；其时间锚点不变。

### 6.4 同一年份、多事件和照片组

- 同年学校事件共享年份锚点；在该年份锚点附近分配有限的局部槽位，沿时间方向的偏移不超过当年显示间距的 35%，必要时辅以少量垂直错层。
- 局部槽位只是照片防重叠布局，不代表不同真实日期；年份标记始终指向公共锚点。
- 年份边界的槽位向内部展开，不越过 1949 或当前年的端点。
- 同一照片组的二至四张照片在其槽位中轻微错开，确保每张都能被点击；照片组归属使用 `photoGroupId`。
- 三图和四图在详情目标区域使用不规则拼贴，计算每张照片的可见矩形，保证每张至少 90% 内容可见且不被文字区域遮挡。
- 主题切换只改变卡片大小，不重新排序、不重新分配年份槽位，不移动上轨事件或教育史锚点。
- 不因主题选中状态改变事件数量或时间轴长度。

### 6.5 初始视觉参数

以下集中放在 `config/scene.ts`，作为第一轮视觉校准起点，最终以四张参考图对照结果为准：

| 参数 | 初始建议值 | 校准目的 |
|---|---|---|
| 时间轴斜角 | 约 -32° | 左下至右上的整体构图 |
| 照片基础宽高比 | 3:2 | 仅用于普通空白样例，个别比例样例保持原比例 |
| 全览卡片未旋转宽度 | 80～110 px | 呈现密集小照片队列 |
| 浏览卡片未旋转宽度 | 280～340 px | 接近 style3 前后队列的可见尺寸 |
| 卡片平面倾斜 | `rotateY(-55deg)`、`rotateZ(15deg)` 附近 | 接近参考照片面的方向，需现场调整 |
| 浏览总长度 | 约 5,400～7,200 px，再按窗口比例调整 | 控制可见照片数量与密集感 |
| 中间分离距离 | `gap` 约 180～260 px | 形成 style3 的中央呼吸空间 |
| 上轨文字偏移 | 由照片轨道安全边界和文字高度计算 | 让上轨事件贴近照片集且不遮挡语言入口 |
| 全部主题比例 | 1.0 | 默认尺寸 |
| 当前主题比例 | 1.5～1.8 | style2 的明显突出 |
| 非当前主题比例 | 0.16～0.24 | 缩小但保留存在感 |
| 主题变化时长 | 400～550 ms | 平滑变色及缩放 |
| 全览／浏览过渡 | 650～850 ms | 连续放大与队列分离 |
| 抽出／归位时长 | 650～900 ms | 同一张照片自然移到前方再回到队列 |

卡片使用轻微边框、阴影和厚度表现，不使用真实照片装饰占位。背景始终是 `#F7F5F2`。

## 7. 动画和交互状态设计

### 7.1 状态分工

React reducer 管理：

```ts
interface TimelineUIState {
  locale: Locale;
  activeTheme: ThemeId | null; // null 表示全部
  viewMode: 'overview' | 'browse';
  phase: 'idle' | 'dragging' | 'opening' | 'detail' | 'closing';
  selectedEventId: string | null;
  selectedPhotoGroupId: string | null;
}
```

控制器通过 ref 管理高频连续值：`targetFocus`、`renderedFocus`、`zoomProgress`、`themeProgress`、`detailProgress`、拖拽距离、视口尺寸与卡片 DOM 引用。详情另保存打开前的焦点、视图模式和选中卡片来源姿态。

一张卡片每帧只由一个 `applyPose()` 写入位置、旋转、缩放和层级。全览、主题、拖拽和详情通过计算合成姿态，不能由多个独立 tween 同时争夺同一个 `transform`。GSAP 只修改控制器数值，由统一 ticker 更新 DOM；React 不在每帧更新整批卡片。

### 7.2 输入处理

- 滚轮监听仅绑定场景，使用非 passive 监听处理必要的 `preventDefault()`；不拦截语言按钮、主题按钮和详情文字内部的正常操作。
- 标准化 `WheelEvent.deltaMode`；触控板水平分量和垂直分量选主要分量，避免对角手势重复叠加。
- 滚轮向下前往较新的年份，反向回到较早年份。按像素增量调整 `targetFocus`，并限制在 `[0,1]`。
- 从全览首次滚动时，将目标模式改为浏览并平滑放大，同时保留输入意图。
- 拖拽使用 Pointer Events、pointer capture 和沿时间轴方向的距离投影；照片跟随拖拽方向移动，焦点按反方向改变。
- 累计移动超过约 6 px 才进入拖拽；超过阈值后抑制该次 pointerup 产生的点击。
- `pointercancel`、失去 pointer capture、窗口失焦时均释放拖拽状态。
- 惯性或缓动不得越过两端后循环到另一端；达到边界时停止推进目标位置。

### 7.3 状态转换与打断规则

| 当前状态 | 操作 | 处理 |
|---|---|---|
| idle | 滚轮／拖拽 | 更新统一时间焦点；拖拽期间进入 dragging |
| idle | 点击照片 | 保存返回信息，按 photoGroupId 找出同一照片组，进入 opening |
| dragging | 释放／取消 | 回到 idle，不额外打开卡片 |
| opening | 动画完成 | 进入 detail，显示完整说明 |
| opening | 关闭／Esc | 从当前姿态反向过渡，进入 closing |
| detail | 关闭／Esc | 进入 closing |
| closing | 动画完成 | 清空选择并回到打开前的视图与焦点 |
| opening／detail／closing | 场景滚轮／拖拽 | 不移动背景时间轴；详情文字自身可以滚动 |
| opening／detail／closing | 点击其他照片 | 不触发另一条抽取，防止多事件同时抢占前景 |
| 任意阶段 | 切换语言 | 更新文字，不重建场景、不取消当前详情 |
| 任意阶段 | 切换主题 | 更新唯一主题目标；打开的照片保持详情尺寸，归位目标按最新主题计算 |
| 任意阶段 | 调整窗口 | 重算场景与详情目标，从当前视觉姿态平滑接续 |

语言和主题操作采用最新选择；关闭详情不能把用户刚选择的语言或主题恢复成旧快照。快照只负责恢复浏览位置和视图模式。

### 7.4 抽出、二至四图与归位

1. 点击时记录所有关联卡片的当前姿态和浏览返回信息。
2. 根据 `photoGroupId` 查询零／一／两／三／四张照片对应的显示卡片；无照片事件选中其合成空白卡片。
3. 在同一视口坐标系中，把选中卡片从来源位置插值到详情目标区域，并逐渐将旋转归零、提升层级。
4. 卡片继续使用原有 DOM，不同时留下来源卡片和第二份前景克隆，避免视觉重复与关闭后残影。
5. 右侧说明按详情进度渐入；照片组共享同一事件说明。三图和四图采用可测量的不规则拼贴，逐张检查可见面积至少达到原内容的 90%。
6. 关闭时重新计算当前窗口和最新主题下的归位姿态，从当前状态返回，结束后恢复普通队列层级。

快速反复点击不能叠加多个 GSAP timeline；使用单一控制器及转换序号，忽略失效的完成回调。组件卸载时清理 ticker、tween、事件监听、ResizeObserver 和 pointer capture。

## 8. 页面组件与适配细则

### 8.1 页面与主题

- `LanguageSwitcher` 固定在左上安全区；相册标题、年份及操作提示不得盖住它。
- `ThemeSwitcher` 在右下安全区排列五个主题方框；方框显示主题名称和颜色，不显示 A～E 字母。点击当前主题再次恢复全部主题状态。
- 主题定义只维护一份：A `#B85C5F`、B `#C1A46B`、C `#7D6A8E`、D `#6B8E7A`、E `#5C6E84`。
- 使用 `--theme-accent` 更新强调元素。正文维持深色，避免浅金色正文在暖白背景上难以阅读。
- 根据主题面板实际边界为教育史文字预留区域，不依靠固定几个空格或纯粹调高 z-index 掩盖重叠。

### 8.2 详情区域

- 详情使用“左侧照片区域 + 右侧文字区域”，在第一版桌面范围内保持左右布局。
- 文字区域初始宽度约占可用宽度的 28%～34%，最小约 260 px；照片占余下空间，关闭入口始终可见。
- 文字过长时只滚动说明区域，不让场景随其滚动，也不截断正文。
- 单张图片按 `contain` 的计算方式适配可用区域；空白卡片同样保留完整外框。
- 双照片分别计算横排和竖排的适配尺寸；三图和四图计算不规则拼贴的目标矩形，选择能让照片组总可见面积更大且不侵入文字区的方案；不裁切、不拉伸。
- 拼贴布局必须对每张照片执行可见区域检查，遮挡比例不得超过 10%；布局失败时回退到不重叠的网格排列。
- 数据中已保存照片宽高比，避免以后换成真实图片时加载前后布局跳动。
- 使用焦点进入、可见焦点样式和 Esc 关闭；为详情设置清晰的可访问名称。若使用 `aria-modal`，需让照片详情、语言和主题等允许操作的控件处于同一对话框可访问范围，并禁用背景队列，不能只画遮罩却让键盘进入背景。
- 关闭后焦点返回原卡片；若窗口变化使该卡片暂不可见，返回场景导航入口。

### 8.3 性能与桌面窗口变化

- 用 ResizeObserver 监听场景安全区域，保留年份焦点重新投影，而不是保留旧像素位置。
- 只对可见范围及其外侧缓冲区的卡片持续计算／写入姿态；正在抽出的事件组始终保留。
- 远离视口的卡片不接收点击或键盘焦点，不对全部卡片永久开启 `will-change`。
- 布局读取和 DOM 写入分开，尺寸测量放在初始化、窗口变化或打开详情时，不在每帧反复调用 `getBoundingClientRect()`。
- 近距离浏览时以窗口化方式限制活跃卡片数量；全览仍保留足够卡片以呈现密集构图。
- 尊重 `prefers-reduced-motion`：缩短或取消大幅移动，保留所有信息和操作结果。
- 目标是在实际验收电脑上连续滚动时接近显示刷新率；记录真实机器和测量结果，不用空白场景帧率推断第二版真实照片性能。

## 9. 分阶段执行清单

按顺序完成。前一阶段的退出条件未通过时，先修复问题，不用后续功能掩盖基础布局缺陷。

### 阶段 0：初始化可运行工程

- [x] 执行第 3 节初始化步骤，创建配置和最小 React 页面。
- [x] 设置 CSS reset、系统字体、暖白背景及全窗口容器。
- [x] 建立 README 的启动说明，说明当前为占位内容版本。
- [x] 验证 `npm run dev` 可访问，`npm run typecheck`、`npm run lint` 和 `npm run build` 成功。

产物：能启动和构建的空项目，不改动原始资料。依赖：无。

### 阶段 1：内容契约与统一时间坐标

- [x] 完成原 V1 数据类型、主题配置、三语字典和 mock provider。
- [x] 扩展 `TimelineDataset`、`UpperRailEvent` 和 `photoGroupId` 契约，支持二至四照片组。
- [x] 完成数据校验、稳定排序、事件组到卡片的转换。
- [x] 完成当前年份获取、可注入时钟、时间映射和反向映射。
- [x] 生成第 5 节约定的 mock 情形，固定测试样例 ID。
- [x] 为时间端点、空年份、同年多事件、双照片归属和跨年范围更新编写有意义的单元测试。
- [x] 增加上轨事件与三条轨道同年映射、二至四照片组归属及 90% 可见面积的单元测试。

退出条件：三条轨道同年映射一致，照片数量不改变年份位置，所有样例可由固定 ID 和照片组 ID 找到。依赖：阶段 0。

### 阶段 2：全览视觉与原双轨道静态布局

- [x] 创建 TimelineScene、PhotoCard、YearAxis、EducationLane。
- [x] 按第 6 节公式实现原有双轨道和默认全览构图。
- [x] 完成照片边界、轻微阴影、密集层叠、年份刻度和教育史文字避让。
- [x] 加入语言入口、主题方框和视图入口的静态布局。
- [x] 在三种桌面尺寸截图，对照 style1.png 调整角度、尺寸和队列密度。

退出条件：形成可信的立体相册全貌；原有同年锚点对齐；文字与主题面板不重叠。没有动画时也应满足布局要求。依赖：阶段 1。

### 阶段 3：连续浏览与中央分离

- [x] 实现唯一动画控制器，以及全览／浏览的平滑过渡。
- [x] 接入滚轮标准化、拖拽投影、边界限制和点击抑制。
- [x] 加入中央分离映射，使学校和教育史使用同一变换。
- [x] 加入焦点附近的教育史完整说明和稀疏标签策略。
- [x] 验证正反浏览、两端停靠、快速反向滚动、pointercancel 和窗口变化。
- [x] 录制或人工观察连续过程，对照 style3.png；截图不能代替动画检查。

退出条件：照片连续扫过，中间分离自然，原有时间线同步；拖拽后不会误开详情。依赖：阶段 2。

### 阶段 4：主题突出与界面三语

- [x] 实现五个主题及“全部”的真实行为。
- [x] 主题缩放以原锚点为中心平滑变化，非选中照片保留。
- [x] 页面强调色与主题同步，暖白背景保持不变。
- [x] 接入繁／简／英界面字典，检查英文长名称和选中态。
- [x] 验证连续快速切换主题只以最后一次选择为目标，焦点和年份位置不漂移。
- [x] 对照 style2.png 截图，调整选中／未选中照片尺寸差异。

退出条件：主题与语言均可操作，不改变时间映射、不卸载整条相册。依赖：阶段 3。

### 阶段 5：抽取详情、原双照片与归位

- [x] 实现 opening、detail、closing 阶段及返回信息。
- [x] 完成同一 DOM 卡片从队列到详情区域的姿态插值。
- [x] 实现原 V1 的单张、无照片、横横双照片、横竖双照片布局。
- [x] 加入右侧年份、主题、说明、关闭入口和文字内部滚动。
- [x] 加入焦点管理、Esc、开启动画中关闭、窗口变化重新定目标。
- [x] 验证在详情中切换语言／主题后，关闭时位置正确且保留最新选择。
- [x] 对照 style4.png 检查抽出结果，同时以 PRD 的“文字在右侧”为准。

退出条件：原三种照片数量情形可完整打开和关闭，无克隆残留或错误归位。依赖：阶段 4。

### 阶段 6：完整验收、性能修正与交付

- [x] 完成第 10 节测试矩阵，优先修复 PRD 必须项。
- [x] 在 Chrome 和 Edge 检查三种桌面尺寸及真实滚轮／拖拽手感。
- [x] 按四张参考图检查四种状态，保存本轮最终截图。
- [x] 检查控制台、网络请求、事件监听清理及重复操作后的状态。
- [x] 完成构建预览，确认生产包也能正常运行。
- [x] 更新 README、docs/validation.md 和必要的参数说明。

退出条件：原 V1-01 至 V1-14 均有结果和证据；V1.1 新增条目在后续阶段完成；未验证项明确列出，不能用“构建成功”代替交互验收。依赖：阶段 5。

### 阶段 7：上轨事件与三轨同步

- [x] 将 `upperRailEvents` 接入 mock provider，生成胡鸿烈、钟期荣经历和创校过程的英文占位事件。
- [x] 在树仁校史照片集旁边增加上轨事件文字轨道，显示当前年份、事件标题和内容，不渲染照片或照片占位框。
- [x] 将上轨事件、树仁校史和香港教育史接入同一个 `timeScale`、焦点值、滚轮、拖拽、年份滑块和边界控制。
- [x] 更新三条轨道的编号为“01/上轨事件”“02/ 树仁校史”“03/ 香港教育史”，并检查语言切换和窄桌面窗口的文字避让。
- [x] 增加三种桌面尺寸下的轨道位置、当前年份、标题内容和同步移动浏览器测试。

退出条件：上轨事件在照片集旁边稳定显示，三条轨道年份锚点一致，浏览和年份切换不会使任何一条轨道脱节或覆盖主题区。依赖：阶段 6。

### 阶段 8：二至四照片组与创意拼贴

- [x] 扩展 mock 数据，覆盖无照片、单张、双张、三张和四张照片组，并为每组提供稳定 `photoGroupId`。
- [x] 将详情抽取逻辑从固定两张扩展为零至四张；点击照片组任意成员时，同组全部照片同步进入 opening/detail。
- [x] 为三图和四图实现不规则拼贴目标布局，同时保留原始宽高比和照片 DOM 身份。
- [x] 对每张抽出照片计算可见矩形，确保至少 90% 内容可见；布局空间不足时回退为不重叠网格。
- [x] 验证关闭、Esc、动画中断、主题切换、语言切换和窗口调整后，全部照片准确回到原位置。
- [x] 增加单元与浏览器测试，覆盖照片组归属、三图／四图数量、90% 可见面积、同年代组同步抽取和不同照片组不误合并。

退出条件：无照片、单张、双张、三张和四张五种照片数量情形都能稳定打开、阅读和归位；三图／四图每张照片满足 90% 可见标准；快速操作不会留下残影或错位。依赖：阶段 7。

### 阶段 9：V1.1 完整验收与交付

- [x] 更新 PRD 对照表、README、验证文档和三轨／照片组截图。
- [x] 在 Chromium、Chrome、Edge 的 1280×720、1440×900、1920×1080 下运行完整功能和性能测试。
- [x] 进行无学校域名、无 Excel 请求和无控制台错误审计。
- [x] 运行 `npm run check`，失败时定位并修复，不删除、跳过或降低测试标准。
- [x] 启动生产预览，核验三轨布局、照片组详情和 HTTP 200。

退出条件：PRD V1.1 的 V1-01 至 V1-15 均有测试或人工证据，完整测试通过，预览页面可供电脑浏览器验收。依赖：阶段 8。

## 10. 验证方案与 PRD 对照

### 10.1 自动化验证重点

| 层次 | 测试场景 | 需要证明的行为 |
|---|---|---|
| 单元 | 1949、当前年、中间年、空年份 | 正反映射正确，时间间距不依赖事件数量 |
| 单元 | 模拟 2026 跨入 2027 | 范围扩展且保留原焦点年份，不需要修改年份常量 |
| 单元 | 同年多个事件和二至四照片组 | 只按稳定 `photoGroupId` 分组，排序稳定，无照片能得到一个展示入口 |
| 单元 | 三轨同步和上轨事件 | 上轨事件、树仁校史、香港教育史同年锚点一致；文字内容按焦点年份切换 |
| 单元 | 主题和分离变换 | 三轨同年锚点一致；主题缩放不改变时间坐标 |
| 单元 | 开启中关闭、重复关闭、旧回调 | 只有合法状态转换，过期回调不重新打开详情 |
| 组件 | 界面三语和主题选择 | 标签、选中态、英文占位回退正确，选择不丢失 |
| 浏览器 | 滚轮到两端及反向移动 | 不循环、不越界、焦点有连续变化 |
| 浏览器 | 拖拽超过阈值后释放 | 只浏览，不意外打开详情 |
| 浏览器 | 点击空白、单张、两张、三张、四张样例 | 展示正确照片组数量和右侧说明；三图／四图每张至少 90% 可见 |
| 浏览器 | 点击上轨事件对应年份 | 上轨事件、照片集和香港教育史显示同一当前年份、标题和内容 |
| 浏览器 | 点击不同照片组 | 只抽出当前照片组，不错误合并相邻或同年其他照片组 |
| 浏览器 | 详情中换语言／主题、关闭 | 浏览位置保持，最新语言／主题保留 |
| 浏览器 | 开启中立即关闭、连续操作 | 最后回到可交互状态，无前景残留 |
| 浏览器 | 调整窗口、长文字、双比例照片 | 不裁切照片、不遮挡关闭按钮，文字可完整阅读 |
| 浏览器 | 页面请求和错误 | 无学校域名请求、无 Excel 请求、无未处理控制台错误 |

测试通过公开 UI 操作触发行为，以可访问角色、稳定事件 ID 和必要的 `data-testid` 定位。等待可观察的 phase/DOM 状态完成，不依赖大量固定 sleep。读取测试状态的辅助入口只能在测试模式启用，不能向产品页面添加调试面板。

不为每个 CSS 常量或样式类名单独写测试；自动化应验证用户行为、数据关系和高风险状态。

### 10.2 PRD 验收映射

| PRD 编号 | 负责阶段 | 最低验证证据 |
|---|---|---|
| V1-01 | 0、6 | 本地启动、构建预览、无学校服务器依赖 |
| V1-02 | 2 | 暖白背景及全览截图，与 style1 并排检查 |
| V1-03 | 1、2、3、7 | 三条轨道同年锚点测试、布局截图与同步浏览 |
| V1-04 | 1 | 起止年份测试、跨年及数据增量测试 |
| V1-05 | 3 | 滚轮／拖拽浏览器测试与 style3 动画观察 |
| V1-06 | 4 | 五主题＋全部测试与 style2 截图 |
| V1-07 | 5 | 抽出／归位、打开中关闭及返回位置测试 |
| V1-08 | 5 | 单照片、长文字截图与 style4 对照 |
| V1-09 | 1、5 | 无照片事件浏览器测试 |
| V1-10 | 1、5、8 | 二至四照片组、90% 可见面积和不同照片组归属测试 |
| V1-11 | 7 | 上轨事件标题、内容和三轨同步滑动测试 |
| V1-12 | 4、5、8 | 三语切换及已打开照片组状态保持测试 |
| V1-13 | 1、6、8 | 五种照片数量和英文占位覆盖检查及网络请求检查 |
| V1-14 | 2、5、7、8、9 | 三种桌面尺寸、三轨避让、主题区与详情交互检查 |
| V1-15 | 3、5、7、8、9 | 快速切换、滚动、照片组打开关闭和 resize 的组合回归 |

### 10.3 视觉和动态检查

- 最终至少保存全览、主题 A 突出、中央分离、单照片详情、无照片详情、双照片详情、三照片拼贴、四照片拼贴和三轨文字布局九类截图；额外覆盖英文长名称和 1280×720 的紧凑窗口。
- 使用固定数据、年份、视口和字体环境生成截图；首次截图需人工确认，不能通过自动更新基线掩盖退化。
- 占位卡片和参考图照片内容不同，不做两者逐像素相等断言。比较构图、角度、大小关系、队列密度、留白与文字位置。
- 人工连续操作至少包括：浏览到中部 → 检查上轨事件 → 选主题 → 抽出三／四照片组 → 切英文 → 调整窗口 → 关闭 → 恢复全部 → 继续浏览。
- 在实际浏览器记录一次约 30 秒滚动与切换的性能观察，说明设备、浏览器、活动卡片数及可见卡顿；有问题时先减少不必要 DOM 写入与活跃卡片，不以降低照片完整性换取速度。

### 10.4 最终执行顺序

```powershell
Set-Location -LiteralPath 'D:\MyCodingProject\HKSYU Museum Timeline'
npm ci
npm run typecheck
npm run lint
npm run test:unit
npm run build
npm run test:e2e
npm run preview
```

`preview` 为持续运行的本地进程，手动完成 Chrome／Edge 和视觉检查后再停止。`npm ci` 用于最终复现或依赖环境有变化时，不必在每次小改动后重装。测试通过后只针对新改动、失败或未解决疑点追加检查。

## 11. 第二版接入的预留方式

### 11.1 第一版需要保留的接口边界

- App 只调用 `TimelineProvider.load()` 获取标准数据，组件不直接读取 Excel 单元格。
- 事件 ID、主题、文本和照片数组由 provider 返回，页面不包含真实学校历史的硬编码分支。
- provider 返回 `upperRailEvents`、`photoGroupId` 和每组最多四张照片，页面不按照片数量写死分支。
- 保留 `schemaVersion` 和 `revision`，为后续内容版本检查准备。
- 支持多语言字段、照片比例、无照片状态和稳定事件身份，避免接入真实数据时重写交互。

### 11.2 第二版再执行的事项

1. 核查 Excel 的真实工作表、列名、语言字段、日期粒度，以及 `photo-1`、`photo-2` 单元格存储的是文本 URL 还是 Excel hyperlink 关系。
2. 明确工作簿线上位置、学校服务器能力、访问权限和刷新延迟要求。
3. 根据学校条件选择服务器自动转换成运行时 JSON，或浏览器运行时解析公开 Excel；不在第一版预设学校必须提供某种后端。
4. 将新 provider 的输出接入现有契约，处理缺失翻译、坏链接、无照片与不完整资料。
5. 照片基准地址为 `https://umtimeline.hksyu.edu/`，根目录为 `Historical_Timeline_Images`；支持包含空格、中文、括号和不同深度的子目录，不拼接假定的固定年份目录。
6. 明确访问和缓存策略，包括同链接替换图片后的更新。使用内容版本或正确的 HTTP 缓存验证机制，不承诺所有浏览器会自行立即刷新旧照片。
7. 实现运行时版本检测及数据替换，保留仍存在的当前事件；若正在看的事件被删除，安全关闭详情并定位到相邻年份。
8. 确认真实触控大屏尺寸和浏览器，再扩展触摸操作、点击目标和长时间展厅运行策略。

仅把 Excel 放进构建目录并在编译时导入，不满足“职员更新资料后无需重新编译”的目标。第一版提供的 mock provider 也不等于已经具备自动更新能力。

## 12. 交付清单与完成定义

第一版开发完成时应提供：

- 前端源代码、配置、依赖锁文件和可成功生成的 `dist/`。
- README：环境要求、安装启动、构建预览、样例数据位置、可调视觉参数和当前版本边界。
- 可直接访问的本地预览地址及启动方式。
- `docs/validation.md`：实际运行的命令、通过／失败结果、浏览器与分辨率、PRD V1-01～V1-15 的逐项结果、已知限制。
- `docs/screenshots/` 中经过检查的关键状态截图。
- 如实施方案发生调整，更新后的本文件；如产品范围发生变化，同时更新 PRD。

只有在核心视觉状态、三轨年份对齐、五种照片数量情形、90% 拼贴可见性和连续操作都通过验证后，才可称 V1.1 完成。网页发布、学校服务器配置、真实资料导入及触控适配不属于本轮交付。

## 13. 实施记录（2026-09-28）

- 使用 React 19、TypeScript 5.9、Vite 7、GSAP 3；实际依赖由 package-lock.json 锁定，验证框架采用修复已知依赖问题的 Vitest 4.1.11。
- LanguageSwitcher、ThemeSwitcher 合并在 `src/components/Controls.tsx`；YearAxis、EducationLane 在 `TimelineScene.tsx` 内实现；视图切换和逐事件入口在 App 中组织。
- `TimelineController.ts` 合并了动画数值驱动与输入协调；`input.ts`、`layout.ts`、`detailLayout.ts` 和 `timelineReducer.ts` 保留可独立验证的纯逻辑。
- 相册队列使用统一的横向封套，保持 style1 的整齐排列；详情按每张照片自身比例完整展示，双照片自动比较横排和竖排布局。
- 三轨年份锚点共享时间映射；同年的照片在锚点附近排列，焦点照片组与邻组额外做局部分离，年份锚点不随卡片缩放移动。
- 连续动画由控制器写入，React 管理语言、主题与界面状态；详情 reducer 使用转换序号防止旧完成回调干扰后续操作。
- 新增年份滑块、逐事件箭头及可打开的当前事件文字，方便密集相册中精确选择同年事件，并提供键盘入口。
- 跨年检查在香港日期变化和页面重新可见时执行；更新 mock 数据时保留焦点、主题与仍存在的详情事件。
- 非模态详情允许用户操作语言和主题控件，背景照片在详情期间不接受点击或键盘聚焦。关闭时在 DOM 恢复可用后归还焦点。
- 性能测量保持 30 秒连续操作、至少 600 帧和 P95 小于 50 毫秒的断言；该用例不录制每次操作的 DOM 快照，避免测量工具干扰帧时间，其他功能用例保留失败追踪。
- 核心功能验证覆盖 Chromium、已安装的 Chrome 和 Edge。源代码由 Prettier 统一格式化，未更改原始 Excel 与参考图片。
- 各阶段执行证据、失败原因与修复结果记录在 `docs/validation.md`，最终截图在 `docs/screenshots/`，性能原始数据在 `docs/performance/`。
