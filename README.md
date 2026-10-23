# 香港树仁大学互动校史时间轴

[简体中文](./README.md) | [繁體中文](./README.zh-Hant.md) | [English](./README.en.md)

这是香港树仁大学校史的三语互动照片集与双时间线网页。项目使用 React、Vite 和 TypeScript，内容来源是项目根目录的 `HKSYU Timeline.xlsx`，照片默认使用学校图片服务器上的公开图片网址。

本文适用于 Windows、macOS 和 Linux，所有命令均在项目根目录运行。产品范围见 [PRD.md](./PRD.md)，Excel 栏位说明见 [manual.md](./manual.md)，历史执行计划见 [spec.md](./spec.md)。安装和部署步骤以本文为准。

## 环境要求

- Git（克隆仓库时使用；也可以下载并解压仓库 ZIP）
- 推荐 Node.js 24 LTS 及其自带的 npm；当前 Vite 支持 Node.js 20.19.x 及以上的 20.x，或 22.12.0 及以上版本
- Python 3.10 或更高版本及 Pillow（从 Excel 导入、运行实时内容服务或内容测试时需要）
- 可访问学校图片服务器的网络连接（导入时检查照片尺寸，浏览器展示时加载照片）

Node.js 可从 <https://nodejs.org/> 安装，Python 可从 <https://www.python.org/downloads/> 安装。仅运行或构建仓库中已有的静态网页数据时，不需要安装 Python。项目使用 `package-lock.json`，请通过 `npm ci` 安装依赖。

## 获取项目并安装前端依赖

在你希望存放项目的位置打开终端，执行以下命令。目录名 `hksyu-timeline` 可以自定；如果使用自己的 fork，请替换仓库地址。

```bash
git clone https://github.com/xu-ysk/HKSYU-Historical-Timeline.git hksyu-timeline
cd hksyu-timeline
npm ci
```

也可以下载仓库 ZIP，解压后在包含 `package.json` 的目录打开终端并执行 `npm ci`。本项目默认从学校网址加载照片，无需另行下载 Git LFS 原图；旧的离线照片模式才需要完整原图。

## 配置 Excel 内容工具

需要更新 Excel 内容时，在项目根目录创建 Python 虚拟环境并安装 Pillow。

Windows PowerShell（`py` 为 Python 安装器提供的启动命令）：

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install Pillow
```

如果没有 `py`，可用已安装的 Python 3 对应的 `python` 替换 `py -3`。如果 PowerShell 限制激活脚本运行，可以在 Windows 命令提示符（CMD）中使用：

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

Linux 如果提示缺少 `venv` 或 `pip`，请通过系统包管理器安装对应的 Python 3 venv/pip 组件后重试。新开终端时重新执行对应的激活命令，再运行下文的 Excel 命令；激活后 Windows、macOS 和 Linux 都可以使用 `python`，项目中的 npm 脚本也会使用该环境。

`.venv/` 是本机依赖目录，提交时请只暂存需要发布的文件，不要把它加入仓库。

## 本地运行

在已安装前端依赖的项目目录执行：

```bash
npm run dev
```

开发网页默认地址为 <http://127.0.0.1:5173/>。保持终端运行，按 `Ctrl+C` 停止。端口冲突时可以使用 `npm run dev -- --port 5174` 并访问终端显示的新地址。开发服务读取 `public/timeline.json`，保存 Excel 后仍需导入数据，或改用下文的实时服务。

生成生产版本并预览：

```bash
npm run build
npm run preview
```

生产构建输出在 `dist/`。预览服务默认地址为 <http://127.0.0.1:4173/>。

上述地址指向运行命令的那台电脑。换一台电脑部署时，只需在新电脑执行这些步骤，无需沿用任何个人电脑的盘符或目录。

## Excel 内容更新

`HKSYU Timeline.xlsx` 是校史文字、照片分类和照片网址的编辑来源。工作簿包含三个工作表：

- `樹仁校史`：上方树仁校史时间线文字
- `香港教育史`：下方高等教育重点政策时间线文字
- `圖片`：照片、照片详情文字和主题分类

英文标题／正文使用 C/D 列，繁体中文使用 E/F 列，简体中文使用 G/H 列。`圖片` 工作表的 `category` 决定五个主题：A 校园发展、B 荣誉／服务／缅怀、C 从书院到大学、D 校务拓展、E 重塑博雅教育。照片网址放在 `photo-1` 至 `photo-5` 列，每格一条完整图片网址。

保留工作表名称、栏位和事件 ID。三种语言需分别编辑，程序不会自动翻译。当前图片导入支持学校 `https://umtimeline.hksyu.edu/Historical_Timeline_Images/` 下的图片网址。

修改并保存工作簿后，在已激活 Python 环境的终端中生成网页数据：

```bash
npm run prepare:publish
```

这个命令会检查 Excel 内容和远程图片尺寸，生成 `public/timeline.json`，然后运行生产构建。它不会修改原 Excel，也不会自动提交、推送或部署。只想重新生成 JSON 时可以运行：

```bash
npm run import:data
```

默认导入保留学校图片服务器的完整网址，不要求下载整套原图。图片必须能够在浏览器中直接打开，且不需要登录；如果服务器覆盖了同名图片，建议在 Excel 网址末尾修改版本参数，例如 `?v=2`，让网页重新检查和加载图片。

## 编辑后自动刷新本地网页

如果需要在编辑 Excel 后自动更新本地预览，先生成一次生产构建，再启动实时服务：

```bash
npm run build
npm run serve:live
```

实时服务默认地址为 <http://127.0.0.1:4173/>，每 2 秒检查工作簿，网页每 15 秒及返回前台时检查新内容；打开照片详情时会等返回时间轴后再应用更新。更新失败时保留上一份有效内容，修正 Excel 后会自动重试。服务窗口必须保持运行，按 `Ctrl+C` 可停止；不要同时启动占用 4173 端口的 `npm run preview`。

实时服务使用默认的远程照片模式，不需要本地照片镜像。特殊的离线旧流程仍可使用 `--local-photos`，但需要准备对应的本地原图目录：

```bash
npm run serve:live -- --local-photos
```

## 部署为静态网站

可以将网站部署到支持静态文件的服务器，例如 Nginx、Apache 或静态网站托管平台。准备好内容后执行：

```bash
npm run prepare:publish
```

将生成的 `dist/` **目录内全部文件**上传到网站公开目录，使用 HTTP/HTTPS 访问。网站服务器仅需提供静态文件，访客浏览器会直接从学校服务器加载照片；不需要在网页服务器安装 Node.js 或运行 Python。不要通过双击 `index.html` 的 `file://` 方式打开，网页需要通过 HTTP 请求加载 JSON。

如果内容已经在 `public/timeline.json` 中准备好，也可以仅运行 `npm run build`。每次更新内容或代码后重新构建并上传。

如果自行管理的服务器直接提供本项目 `dist/` 内的文件，并希望保存 Excel 后自动更新文字和照片网址，可在服务器上配置前述 Python 环境，并在项目根目录保持以下命令运行：

```bash
python scripts/publish-static.py --workbook "HKSYU Timeline.xlsx" --output dist/timeline.json
```

此方式需要服务器可读取 Excel、写入网站目录并访问学校图片服务器，只更新内容数据；修改前端代码仍需重新构建。网站目录不在 `dist/` 时，将 `--output` 改为实际网站目录下的 `timeline.json` 路径。它不适用于 Vercel 的静态部署。

## Vercel 部署

### 首次部署

1. 使用自己的 GitHub/GitLab/Bitbucket 仓库或 fork，将项目导入自己的 Vercel 账号。
2. Root Directory 选择包含 `package.json` 的目录，Framework Preset 选择 Vite；Install Command 使用 `npm ci`，Build Command 使用 `npm run build`，Output Directory 使用 `dist`，Node.js 版本选择 24.x。
3. 部署前在自己的电脑运行 `npm run prepare:publish`，并将更新后的 Excel 和 `public/timeline.json` 提交、推送到自己的仓库。已确认 JSON 内容是最新时，可以直接使用现有文件部署。
4. 部署完成后打开 Vercel 提供的域名，确认主页、照片、三种语言和时间线文字正常显示。

Vercel 部署的是仓库中的静态文件，不会读取部署者电脑上的 Excel，也不会执行本地 `serve:live` 监听服务。

### 发布 Excel 的最新内容

每次修改 Excel 后，在项目目录执行：

```bash
npm run prepare:publish
git status
git add "HKSYU Timeline.xlsx" public/timeline.json
git commit -m "更新校史时间轴内容"
git push
```

以上示例假定当前分支已关联自己的远程分支，且你有推送权限；使用 Git 连接部署时，以 Vercel 设置中的 Production Branch 为准。代码和说明也有修改时，一并检查并提交相应文件。等待 Vercel 的 Production 部署显示 Ready 后，再打开正式网址检查。只保存本地 Excel、只运行普通 `npm run build` 或只上传 Excel，都不会更新线上网页；必须发布新生成的 `public/timeline.json`。

也可以在生成成功后使用已配置好的 Vercel CLI 发布：

```bash
npx vercel login
npx vercel link
npx vercel --prod
```

按 CLI 提示选择自己的账号和项目。Vercel 上使用普通 `npm run build` 即可，Python 转换在内容维护者电脑上完成；无需将实时服务配置成 Vercel 启动命令。可以访问正式站点的 `timeline.json`，比较其 `revision` 与本地文件是否一致，以确认新内容已上线。

## 当前网页交互

- 页面打开后直接进入全览，操作指引需要点击按钮才会显示。
- 全览页面展示照片集和两条时间线；点击时间线圆点后，文字显示在对应标题下方。
- 相册保持全览，拖动或滚动不会进入旧的“浏览”模式。点击照片打开详情；详情中的小房子关闭详情，文字下方的左右箭头切换有照片记录的事件。详情打开三分钟后自动关闭，详情内保留照片缩放与拖动。
- 点击右下方主题后只显示并放大该主题照片，隐藏时间线及对应文字；点击小房子或左上角“全览”返回主页。再次点击同一主题保持选中；进入主题三分钟后自动返回，切换主题会重新计时。
- EN、繁、简按钮同时切换界面标签与工作簿中对应语言的文字。

页面以桌面浏览器和横向展厅大屏为主要展示场景；手机和平板不属于当前完整适配范围。部署后请在实际展示设备及缩放比例下检查排版。

## 测试

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run test:content
npm run build
npm run test:e2e
```

`npm run check` 依次运行 ESLint、单元／组件测试、Python 内容测试、生产构建（含 TypeScript 检查）和完整浏览器测试。Python 测试需先激活前述环境。只运行 Chromium 时，先安装并执行：

```bash
npx playwright install chromium
npm run test:e2e -- --project=chromium
```

完整浏览器配置还包含 Chrome 和 Edge，需要电脑上安装这两个浏览器，或执行 `npx playwright install chrome msedge`。Linux CI 可使用 `npx playwright install --with-deps chromium` 安装 Chromium 及系统依赖。运行前关闭占用测试端口的预览服务，测试会自行构建并启动服务。

当前全览和时间线原位文字交互的专项检查：

```bash
npx playwright test --config playwright.overview.config.ts --project=chromium
```

该专项配置使用 4186 端口和正式数据。部分历史测试仍针对旧的浏览模式或居中弹框，需结合当前交互判断；这里列出运行方式，不代表完整历史测试已全部通过。报告见 `playwright-report/index.html`，历史验证记录见 [docs/validation.md](./docs/validation.md)。

## 常见问题

- **网页没有显示最新 Excel 文字**：确认已保存正确的工作簿，然后运行 `npm run prepare:publish`；本地实时服务和 Vercel 线上网页是两套独立数据源。
- **照片无法显示**：在浏览器直接打开 Excel 中的完整网址，确认不需要登录且返回的是图片；检查电脑和部署环境的网络访问权限。
- **Vercel 仍是旧内容**：确认 `public/timeline.json` 已提交并推送到 Vercel 使用的正式分支，再检查新的 Production 部署是否成功。
- **导入时报 Pillow 或图片尺寸错误**：安装 Pillow 并检查远程图片网址；修正后重新运行 `npm run prepare:publish`。
- **端口被占用**：停止旧的 Vite、preview 或 live 服务后再启动，避免同时运行多个服务。

## 主要目录

| 路径 | 用途 |
| --- | --- |
| `src/` | React 页面、时间线交互、主题和样式 |
| `HKSYU Timeline.xlsx` | 三个工作表的内容来源 |
| `scripts/import-timeline.py` | 从 Excel 生成时间轴 JSON |
| `scripts/publish-static.py` | 发布前一次性检查并生成 JSON |
| `scripts/serve-live.py` | 本地构建站点与 Excel 实时更新服务 |
| `public/timeline.json` | Vercel 静态部署使用的数据文件 |
| `dist/` | `npm run build` 生成的生产文件 |
| `tests/` | 单元、内容和浏览器测试 |
