# Hong Kong Shue Yan University Interactive History Timeline

[简体中文](./README.md) | [繁體中文](./README.zh-Hant.md) | [English](./README.en.md)

A trilingual interactive photo collection and dual timeline for the history of Hong Kong Shue Yan University. The project uses React, Vite, and TypeScript. Content comes from `HKSYU Timeline.xlsx` in the project root, and photos use public URLs on the university's image server by default.

These instructions apply to Windows, macOS, and Linux. Run all commands from the project root. See [PRD.md](./PRD.md) for the product scope, [manual.md](./manual.md) for Excel column instructions, and [spec.md](./spec.md) for the historical implementation plan. Follow this README for installation and deployment. The linked documents are in Chinese.

## Requirements

- Git to clone the repository, or a downloaded and extracted repository ZIP
- Node.js 24 LTS with its bundled npm is recommended; the current Vite version supports Node.js 20.x from 20.19.0, or Node.js 22.12.0 and later
- Python 3.10 or later and Pillow to import Excel content, run the live content service, or run content tests
- Network access to the university's image server to check photo dimensions during import and load photos in the browser

Install Node.js from <https://nodejs.org/> and Python from <https://www.python.org/downloads/>. Python is not required to run or build the website using the static data already in the repository. The project includes `package-lock.json`; install dependencies with `npm ci`.

## Get the project and install frontend dependencies

Open a terminal where you want to store the project and run the following commands. You can choose a different directory name instead of `hksyu-timeline`. Replace the repository URL if you are using your own fork.

```bash
git clone https://github.com/xu-ysk/HKSYU-Historical-Timeline.git hksyu-timeline
cd hksyu-timeline
npm ci
```

Alternatively, download and extract the repository ZIP, open a terminal in the directory containing `package.json`, and run `npm ci`. By default, the project loads photos from university URLs, so you do not need to download the Git LFS originals separately. Only the legacy offline photo mode requires the complete original images.

## Set up the Excel content tools

To update Excel content, create a Python virtual environment in the project root and install Pillow.

Windows PowerShell (`py` is the launcher command provided by the Python installer):

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install Pillow
```

If `py` is unavailable, replace `py -3` with the `python` command for your installed Python 3. If PowerShell blocks the activation script, use Windows Command Prompt (CMD):

```bat
py -3 -m venv .venv
.venv\Scripts\activate.bat
python -m pip install Pillow
```

Bash or Zsh on macOS / Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install Pillow
```

On Linux, if `venv` or `pip` is missing, install the relevant Python 3 venv/pip packages using your system's package manager, then try again. Whenever you open a new terminal, run the activation command for your platform before using the Excel commands below. Once activated, `python` works on Windows, macOS, and Linux, and the project's npm scripts use that environment too.

`.venv/` contains local dependencies. Stage only the files you intend to publish, and keep this directory out of Git commits.

## Run locally

With frontend dependencies installed, run this command from the project directory:

```bash
npm run dev
```

The development site is available at <http://127.0.0.1:5173/> by default. Keep the terminal running; press `Ctrl+C` to stop it. If the port is occupied, use `npm run dev -- --port 5174` and open the address printed in the terminal. The development server reads `public/timeline.json`. After saving Excel, you still need to import the data, or use the live service described below.

Build and preview the production version:

```bash
npm run build
npm run preview
```

The production build is written to `dist/`. The preview server uses <http://127.0.0.1:4173/> by default.

These addresses refer to the computer running the commands. To deploy on another computer, follow the same steps there; no particular drive letter or personal directory is required.

## Update Excel content

`HKSYU Timeline.xlsx` is the editable source for history text, photo categories, and photo URLs. It contains three worksheets:

- `樹仁校史`: text for the upper Shue Yan University history timeline
- `香港教育史`: text for the lower Key Tertiary Education Policies timeline
- `圖片`: photos, photo detail text, and theme categories

English titles/body text use columns C/D, Traditional Chinese uses E/F, and Simplified Chinese uses G/H. The `category` field on the `圖片` worksheet selects one of five themes: A Campus development; B Honours, service & remembrance; C From college to university; D Institutional advancement; E Reinventing liberal arts education. Enter photo URLs in the `photo-1` to `photo-5` columns, with one complete image URL per cell.

Preserve worksheet names, columns, and event IDs. Edit each language separately; the program does not translate text automatically. The current importer supports university image URLs under `https://umtimeline.hksyu.edu/Historical_Timeline_Images/`.

After editing and saving the workbook, generate the website data from a terminal with the Python environment activated:

```bash
npm run prepare:publish
```

This command checks Excel content and remote image dimensions, generates `public/timeline.json`, and then builds the production site. It does not change the original Excel file or automatically commit, push, or deploy anything. To regenerate only the JSON, run:

```bash
npm run import:data
```

The default import preserves complete university image URLs and does not require downloading the entire image collection. Each image must open directly in a browser without signing in. If an image is replaced on the server at the same URL, change a version query parameter in Excel, for example `?v=2`, so the website checks and loads the image again.

## Automatically refresh the local site after editing

To update the local preview automatically after editing Excel, create a production build once, then start the live service:

```bash
npm run build
npm run serve:live
```

The live service uses <http://127.0.0.1:4173/> by default and checks the workbook every 2 seconds. The webpage checks for new content every 15 seconds and when it returns to the foreground. If photo details are open, updates wait until you return to the timeline. A failed update keeps the last valid content; the service retries automatically after you correct Excel. Keep the service running in its terminal and press `Ctrl+C` to stop it. Do not also run `npm run preview` on port 4173.

The live service uses remote photos by default and does not need a local photo mirror. The legacy offline workflow is still available with `--local-photos`, but requires the corresponding local original-image directories:

```bash
npm run serve:live -- --local-photos
```

## Deploy as a static website

You can deploy the site to a server or hosting platform that serves static files, such as Nginx or Apache. Once the content is ready, run:

```bash
npm run prepare:publish
```

Upload **all files inside `dist/`** to the website's public directory and access it over HTTP/HTTPS. The web server only needs to serve static files; visitors' browsers load photos directly from the university server. Node.js and Python are not needed on the web server. Do not open `index.html` by double-clicking it with a `file://` URL: the page needs HTTP requests to load JSON.

If `public/timeline.json` already contains the content you want to publish, you can run just `npm run build`. Rebuild and upload after each content or code update.

If a server you manage serves files directly from this project's `dist/` directory and you want Excel saves to update text and photo URLs automatically, set up the Python environment on that server and keep this command running from the project root:

```bash
python scripts/publish-static.py --workbook "HKSYU Timeline.xlsx" --output dist/timeline.json
```

This requires access to the workbook, permission to write to the website directory, and network access to the university image server. It updates content data only; frontend code changes still require a new build. If the website directory is elsewhere, change `--output` to the path of `timeline.json` inside that directory. This workflow does not apply to static deployments on Vercel.

## Deploy to Vercel

### First deployment

1. Import your own GitHub/GitLab/Bitbucket repository or fork into your Vercel account.
2. Set Root Directory to the directory containing `package.json`, and select Vite as the Framework Preset. Use `npm ci` for Install Command, `npm run build` for Build Command, `dist` for Output Directory, and 24.x for the Node.js version.
3. Before deployment, run `npm run prepare:publish` on your computer, then commit and push the updated Excel file and `public/timeline.json` to your repository. If you have confirmed that the JSON is already current, you can deploy the existing files.
4. Open the domain provided by Vercel and check the home page, photos, all three languages, and timeline text.

Vercel deploys static files from the repository. It does not read Excel from the deployer's computer or run the local `serve:live` watcher.

### Publish the latest Excel content

After each Excel update, run these commands from the project directory:

```bash
npm run prepare:publish
git status
git add "HKSYU Timeline.xlsx" public/timeline.json
git commit -m "Update history timeline content"
git push
```

This example assumes that your current branch tracks your own remote branch and that you have push access. For Git-connected deployments, use the Production Branch configured in Vercel. If code or documentation also changed, review and commit those files too. Wait until the Vercel Production deployment shows Ready, then check the live URL. Saving Excel locally, running only the normal `npm run build`, or uploading only Excel does not update the live content; publish the regenerated `public/timeline.json`.

You can also publish using the Vercel CLI after successfully generating the data:

```bash
npx vercel login
npx vercel link
npx vercel --prod
```

Follow the CLI prompts to select your own account and project. Vercel only needs the normal `npm run build`; Python conversion happens on the content maintainer's computer. Do not configure the live service as a Vercel start command. To confirm publication, open the live site's `timeline.json` and compare its `revision` with the local file.

## Current website interactions

- The page opens directly in Overview. The operation guide appears only when its button is clicked.
- Overview displays the photo collection and both timelines. Clicking a timeline dot displays text below the corresponding heading.
- The album stays in Overview; dragging or scrolling does not enter the old Browse mode. Click a photo to open its details. The home icon in the details closes that view, and the left/right arrows below the text switch between events with photo records. Details close automatically after three minutes. Photo zooming and panning remain available inside the detail view.
- Selecting a theme at the bottom right shows only that theme's enlarged photos and hides the timelines and their text. Click a home icon or Overview at the top left to return to the home page. Clicking the selected theme again keeps it selected. The page returns automatically three minutes after selecting a theme; switching themes restarts the timer.
- The EN, 繁, and 简 buttons switch both interface labels and the corresponding workbook language.

The site is designed primarily for desktop browsers and landscape exhibition screens. Full mobile and tablet adaptation is outside the current scope. After deployment, check the layout on the actual display device at its intended scaling setting.

## Tests

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run test:content
npm run build
npm run test:e2e
```

`npm run check` runs ESLint, unit/component tests, Python content tests, the production build including TypeScript checks, and the full browser test suite in that order. Activate the Python environment before running Python tests. To run Chromium only, install it and run:

```bash
npx playwright install chromium
npm run test:e2e -- --project=chromium
```

The full browser configuration also includes Chrome and Edge. Install both browsers on your computer, or run `npx playwright install chrome msedge`. Linux CI can use `npx playwright install --with-deps chromium` to install Chromium and its system dependencies. Stop any preview service occupying a test port before running tests; the tests build and start their own server.

For focused checks of the current Overview and inline timeline text interactions:

```bash
npx playwright test --config playwright.overview.config.ts --project=chromium
```

This configuration uses port 4186 and real content. Some historical tests still target the old Browse mode or centered dialogs and must be assessed against the current interactions. Listing these commands does not mean that every historical test passes. Reports are written to `playwright-report/index.html`; historical validation records are in [docs/validation.md](./docs/validation.md).

## Troubleshooting

- **The latest Excel text is missing:** Save the correct workbook, then run `npm run prepare:publish`. The local live service and the Vercel site use separate content sources.
- **Photos do not load:** Open the complete URL from Excel directly in a browser. Confirm that it returns an image without signing in, and check network access from your computer and deployment environment.
- **Vercel still shows old content:** Confirm that `public/timeline.json` was committed and pushed to the production branch used by Vercel, then check that the new Production deployment succeeded.
- **Import fails with a Pillow or image-dimension error:** Install Pillow and check the remote image URL, then run `npm run prepare:publish` again.
- **A port is already in use:** Stop the previous Vite, preview, or live service before starting another one.

## Main directories and files

| Path | Purpose |
| --- | --- |
| `src/` | React pages, timeline interactions, themes, and styles |
| `HKSYU Timeline.xlsx` | Source content for the three worksheets |
| `scripts/import-timeline.py` | Generate timeline JSON from Excel |
| `scripts/publish-static.py` | Validate and generate JSON before publication |
| `scripts/serve-live.py` | Serve the local built site with live Excel updates |
| `public/timeline.json` | Data used by static deployments on Vercel |
| `dist/` | Production files generated by `npm run build` |
| `tests/` | Unit, content, and browser tests |
