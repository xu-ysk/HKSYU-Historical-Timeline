# 校史时间轴更新说明（学校服务器版）

这份说明分为两条更新路线：**网页代码**由 GitHub 自动发布到学校网站；**照片和文字**由学校保存在自己的服务器上，修改 Excel 后自动生成网页数据。员工只需看「日常更新」；首次配置由学校 IT 中心完成。

从目前提供的文件管理器画面看，网站目录里有 `index.html`、`assets/`、`timeline.json` 和 `Historical_Timeline_Images/`，但看不到 Excel 自动导入服务。**SFTP 负责传文件，本身不会运行 Excel 导入程序，也不会自动从 GitHub 更新网页。**学校 IT 须确认网站实际根目录和服务器权限，再按下文接上两套自动化。

| 改动 | 唯一内容来源 | 自动发布后的网站文件 |
| --- | --- | --- |
| 页面布局、按钮、交互等代码 | GitHub 仓库的 `main` 分支 | `index.html`、`assets/`、`fonts/` 等前端文件 |
| 三语文字、照片及其排列 | 学校指定的 Excel 和原图目录 | `timeline.json`、`Historical_Timeline_Images/` 中的网页展示副本 |

两条路线要分开，避免新代码的部署覆盖学校刚更新的 `timeline.json` 和照片。**不要把整份 `dist/` 不加筛选地上传**：目前的 `dist/` 也包含照片和 `timeline.json`。

## 日常更新：学校员工

1. 从学校 IT 指定的 **SFTP 内容源目录**取得 `HKSYU Timeline.xlsx`。在学校工作电脑用 Excel 编辑，再上传回**同一路径和文件名**；如使用学校共享盘，也可在共享盘直接编辑。不要把个人电脑或 GitHub 仓库里的副本当作正式内容源。
2. 修改文字时，在对应语言的标题和说明栏填写内容：`title-Eng` / `content-Eng` 为英文，`title-TC` / `content-TC` 为繁体中文，`title-SC` / `content-SC` 为简体中文。请检查三种语言，避免切换语言后仍看到旧内容。
3. 修改照片时，到 **「圖片」** 工作表，编辑该事件的 `photo-1` 至 `photo-5`。每格对应一张照片，按列顺序展示。具体放置方法见下节。
4. 按 **Ctrl + S** 保存；如果是在电脑上下载后编辑，须把修改后的文件**上传覆盖学校内容源中的原文件**。上传未完成前，不要检查网页。SFTP 文件管理器通常不能直接编辑 Excel 单元格；所谓“在学校 SFTP 上更新”，指以学校服务器上的这份文件为正式版本。
5. 回到网站查看。学校 IT 配好下文的发布服务后，服务默认每 2 秒检查文件，已打开的网页约每 15 秒读取新内容；照片处理可能需要更久。若正在打开照片详情，先按返回箭头回到时间轴，再查看更新。

三个工作表分别是：**「樹仁校史」**（上方校史时间线）、**「圖片」**（照片及其文字）、**「香港教育史」**（教育史时间线）。要改哪一部分，就修改对应工作表；只有「圖片」表有照片栏。右下角主题由「圖片」表的 `category` 决定：A 校园发展、B 荣誉／服务／缅怀、C 从书院到大学、D 校务拓展、E 重塑博雅教育。

请保留三个工作表的原有顺序，以及第一行的栏位名称和每条事件的 `id`。如需新增或删除整条事件，请先请管理员协助检查。

## 照片怎么改

**更换已有照片：**如果照片路径不变，把新的 **JPG/JPEG** 原图上传到学校指定的**原图内容源目录**中相同的位置，覆盖旧文件即可。网页会重新制作展示用照片；Excel 中的链接无需改动。

**改用另一张或新增照片：**先把 JPG/JPEG 原图上传到学校原图内容源目录下的 `Historical_Timeline_Images` 对应年份文件夹，再将其链接填到「圖片」表的 `photo-1` 至 `photo-5`，保存并上传 Excel。例如：

| 学校原图内容源中的文件 | Excel 照片栏填写 |
| --- | --- |
| `Historical_Timeline_Images/1971/image1.jpg` | `https://umtimeline.hksyu.edu/Historical_Timeline_Images/1971/image1.jpg` |

文件夹、文件名和链接中的大小写、数字须一致。现在使用“`Historical_Timeline_Images/年份或年份区间/照片文件名`”这两级结构，**不要再加入事件编号子文件夹**。一条事件最多填写五张照片；不用的 `photo` 格保持空白。照片必须在学校的原图内容源中真实存在；只在 Excel 中粘贴网上链接、把照片插入单元格，均不能代替上传原图。**不要把原图直接覆盖到网站公开目录的同名文件夹**：那里应是程序生成的展示副本。

## 保存后没有更新怎么办

- 确认修改后的 `HKSYU Timeline.xlsx` 已上传到学校 IT 指定的**内容源目录**，而非网站公开目录、个人电脑或旧备份。
- 请 IT 确认服务器上的 `publish-static.py` 后台服务仍在运行；**只上传 Excel 到 SFTP，不会自动转换成网页内容**。
- 若改了照片，确认原图已上传到学校的 `Historical_Timeline_Images` 内容源，文件路径与 Excel 链接一致，并且文件是 JPG/JPEG。
- 再等一会儿；如果照片详情仍打开，先返回时间轴。网页在后台标签页时也会延后检查，切回网页后会重新检查。
- 如果仍无变化，请把**事件编号、修改的工作表／栏位、照片文件名**交给 IT，并请其查看发布服务日志。导入失败时，网页会继续显示上一份可用内容，不会显示不完整的更新。

## IT 配置一：GitHub 代码自动同步到 SFTP

建议由学校 IT 设置 **GitHub Actions → SFTP 自动部署**。首次将学校当前网站与 GitHub `main` 的最新代码对齐；以后每次将网页代码推送到 `main`，工作流程就自动：取代码 → 使用 Node.js 24 执行 `npm ci` 和 `npm run build` → 通过 SFTP 上传前端文件 → 检查网站。这样不用再手动下载 GitHub ZIP 包、解压并上传。

首次配置须由 IT 确认：网站实际根目录、SFTP 主机与端口、可写账号、服务器的 SSH 主机密钥，以及 GitHub Actions 运行器能否连上学校 SFTP。SFTP 凭据只放在 GitHub Actions 的 **Secrets**，不要写进仓库、Excel 或说明书。若学校 SFTP 只能从校内网络访问，可使用受 IT 管理的校内运行器或其他校内自动部署任务。

**部署范围：**上传构建产物中的 `assets/`、`fonts/`、`favicon.svg` 等前端文件，**最后**更新 `index.html`；若日后新增前端静态文件，也须纳入部署。不要覆盖学校独立维护的 `timeline.json`、`Historical_Timeline_Images/`、Excel 和原图内容源，也不要用“镜像删除”把这些目录清掉。建议保留上一个可用版本，先在测试网址验收，再切换正式站。

这条流程只负责前端静态文件。若 GitHub 中的 `scripts/` 或 Excel 数据格式以后改变，IT 还须同步更新服务器上的发布脚本，并与对应的前端版本一起验收；**不要对存放学校 Excel 的目录执行 Git 覆盖或重置**。

## IT 配置二：学校 Excel 自动生成网站内容

学校须提供两个不同位置，路径由 IT 实际确定：

```text
<CONTENT_ROOT>/HKSYU Timeline.xlsx                 学校员工上传的正式 Excel
<CONTENT_ROOT>/Historical_Timeline_Images/...      学校员工上传的原图
<WEB_ROOT>/index.html                               网站公开目录
<WEB_ROOT>/timeline.json                            程序生成，员工不直接编辑
<WEB_ROOT>/Historical_Timeline_Images/...           程序生成的展示副本
```

`<CONTENT_ROOT>` 应在网站公开目录之外，且 SFTP 账号要有上传权限；`<WEB_ROOT>` 是当前有 `index.html` 的实际网站根目录。**不要让原图目录与生成的展示副本目录重合。**

首次建立学校内容源时，IT 须从 GitHub 取得最新版 `HKSYU Timeline.xlsx` 和**完整原图**，放入 `<CONTENT_ROOT>`；原图由 Git LFS 管理，首次取得时须执行 `git lfs pull`。网站公开目录里现有的照片可能只是压缩后的展示副本，不能当作原图内容源。此后以学校的 `<CONTENT_ROOT>` 为准，不能在每次代码部署时再用 GitHub 的 Excel 覆盖它。

IT 在能访问这两个目录的 Linux 主机安装 Python 3 和 Pillow，并取得仓库 `scripts/` 的最新版本。先执行一次测试发布：

```bash
python3 -m pip install Pillow
python3 scripts/publish-static.py --workbook '<CONTENT_ROOT>/HKSYU Timeline.xlsx' --photo-root '<CONTENT_ROOT>' --output '<WEB_ROOT>/timeline.json' --once
```

确认网站的文字和照片正确后，去掉 `--once`，把同一条 `publish-static.py` 命令配置成由 IT 管理的 **systemd 常驻服务**（或等效后台任务），开机自动启动。命令须从仓库根目录执行，或把 `scripts/publish-static.py` 换成服务器上的绝对路径。它会检测学校源文件变化、验证内容、生成网站照片副本，并更新 `timeline.json`；出错时保留上一份有效的 `timeline.json`。网页本身约每 15 秒检查一次更新，打开照片详情时会等返回时间轴再应用。IT 应记录日志、监控服务，并确保发布账号有权写入 `<WEB_ROOT>`。

**如果学校只有 SFTP 上传权限，没有可运行 Python 的服务器或后台任务：**仅上传 Excel 无法做到自动更新。IT 需要另找一台常开的校内主机，定期从 SFTP 读取 Excel 与原图、运行导入程序，再把生成的 `timeline.json` 和展示照片上传回网站；或者给现有网页服务器增加后台运行权限。自动化未完成前，由 IT 每次人工执行导入并上传生成文件。不要把“上传 Excel”误认为“网页已经更新”。

## 上线验收与交接

1. IT 先备份当前网站，确认 GitHub 的最新前端已部署；检查页面、字体、五图展示和返回箭头。代码改变后浏览器可能需要强制刷新。
2. 在学校内容源的 Excel 中临时修改一小段测试文字，保存并上传，确认公开网站自动出现新文字，再改回原文；用一张测试照片验证照片替换流程。
3. 分别检查 GitHub 自动部署和 Excel 自动发布日志，并确认**代码部署不会把刚验证的学校文字和照片覆盖回 GitHub 的旧版本**。
4. 请 IT 核实当前网站目录里的 ZIP、备份等文件是否能被公开下载；若能，应移到非公开目录。把正式的内容源路径、网站根目录、部署账号负责人和回退办法记录在学校内部文档中。
