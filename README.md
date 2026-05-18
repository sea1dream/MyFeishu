# FlowDoc Editor ✨

FlowDoc Editor 是一个基于 Electron 的本地文档编辑器，交互风格参考飞书文档和 Typora，强调“所见即所得”的实时编辑体验 `( •̀ ω •́ )✧`

它很适合用来整理这些内容：

- 技术笔记
- 漏洞分析
- PoC 归档
- 本地知识库
- 带图片、附件、代码块的文档

文档主体直接以排版后的样式呈现，不需要在“源码模式”和“预览模式”之间来回切换，写起来会更顺手一点 `ヽ(✿ﾟ▽ﾟ)ノ`

---

## 功能亮点 🌟

- 支持新建、打开、保存 `.flowdoc` 文档
- 支持标题、粗体、斜体、有序列表、无序列表、引用块
- 支持代码块实时语法高亮和一键复制
- 支持在侧边栏切换“文档字体”和“代码字体”，内置 29 套本地字体
- 支持插入图片、附件和视频网站嵌入
- 支持按常见文件类型为附件显示不同图标，PDF 导出也会保留附件图标卡片
- 支持文档标签、侧边栏筛选、关键词搜索
- 支持自动保存、撤销、重做、历史快照持久化
- 支持导出美观的 PDF，并保留代码高亮
- 支持在侧边栏中手动选择默认文档库目录，并自动扫描其中的 `.flowdoc`
- 如果没有手动设置，应用会优先沿用已存在的桌面 `本地文档`；否则使用系统 `Documents/FlowDoc Library`
- 如果文档保存在别处，也可以直接“打开文档”使用；高级用户仍可通过环境变量 `FLOWDOC_LIBRARY_ROOT` 强制指定文档库目录

---

## 适合谁用 🧠

- 想在本地维护知识库的人
- 做安全研究、逆向、漏洞分析的人
- 需要整理 PoC / 复现记录的人
- 想写一份“能看、能搜、能导出”的本地文档的人

---

## 项目结构 🗂️

```text
.
├─ index.html              # 应用主界面结构
├─ styles.css              # 界面和编辑器样式
├─ renderer.js             # 渲染进程逻辑
├─ preload.js              # 主窗口 preload
├─ pdf-export-preload.js   # PDF 导出窗口 preload
├─ main.js                 # 主进程逻辑
├─ package.json            # 依赖、脚本、打包配置
├─ quick-start.bat         # Windows 下一键启动脚本
├─ scripts/                # 迁移脚本、辅助工具脚本
├─ shared/                 # 文档格式、共享逻辑
├─ main-modules/           # 主进程拆分模块
├─ renderer-modules/       # 渲染进程拆分模块
├─ tests/                  # 基础测试
├─ images/                 # 运行时图片资源目录（默认不提交）
├─ attachments/            # 运行时附件资源目录（默认不提交）
├─ release/                # 打包产物目录（默认不提交）
├─ tmp-electron-test/      # 临时测试目录（默认不提交）
└─ migration-backups/      # 迁移附件时自动生成的备份目录（默认不提交）
```

---

## 文档格式 📄

`.flowdoc` 本质上是一个 JSON 文件，核心结构如下：

```json
{
  "kind": "flowdoc",
  "version": 2,
  "createdAt": "2026-04-18T08:30:00.000Z",
  "updatedAt": "2026-04-18T09:00:00.000Z",
  "html": "<h1>文档标题</h1><p>正文内容</p>",
  "tags": ["安全", "PoC"]
}
```

说明：

- `html` 保存规范化后的正文 HTML
- `tags` 保存文档标签
- 图片和附件不会直接写进 `.flowdoc` 文件，而是通过相对路径引用资源文件
- 图片默认保存在 `images/`
- 附件默认保存在 `attachments/文档名/附件名`
- 分享文档时，如果正文引用了图片或附件，也要一并带上对应资源目录

---

## 最省力的使用方式 🚀

如果你只想尽快跑起来，推荐直接使用仓库里的 `quick-start.bat`，真的会省很多事 `(๑•̀ㅂ•́)و✧`

### 方式一：下载源码后双击启动

1. 下载本仓库源码  
   你可以直接下载 ZIP，也可以执行：

```bash
git clone https://github.com/sea1dream/MyFeishu.git
cd MyFeishu
```

2. 安装 Node.js  
   只要终端里这两个命令有输出，就说明环境已经好了：

```bash
node -v
npm -v
```

3. 双击运行：

```text
quick-start.bat
```

这个脚本会自动做两件事：

- 如果本地还没有安装依赖，会先执行 `npm install`
- 然后自动执行 `npm start` 启动应用

适合第一次使用、或者不想手动敲命令的人 `(^_−)☆`

### 方式二：手动启动

如果你更习惯命令行，也可以手动执行：

```bash
npm install
npm start
```

补充说明：

- `npm start` 现在会先在 PowerShell / cmd 里显示一个彩色的 `FLOWDOC` 启动 banner，再启动 Electron 主窗口

---

## Windows 一键启动脚本说明 🪄

仓库内提供：

```text
quick-start.bat
```

它适合以下场景：

- 第一次运行项目
- 给不熟悉 Node.js 的同事或朋友使用
- 下载源码后希望双击直接启动

脚本逻辑：

1. 自动切换到项目目录
2. 检查 `node` 和 `npm` 是否已安装
3. 如果缺少依赖，则自动执行 `npm install`
4. 启动 Electron 应用
5. 如果失败，窗口会停留，方便查看报错

---

## 安装和运行 🧰

### 环境要求

- Windows
- 已安装 Node.js 和 npm

说明：

- 项目是 Electron 桌面应用，主要面向 Windows 使用
- 如果只是运行打包好的 exe，则不需要安装 Node.js

### 第一次运行

```bash
npm install
npm start
```

或者直接双击 `quick-start.bat`。

### 正常启动后你会看到什么 👀

- 左侧是文档库、标签筛选、搜索区域
- 中间是编辑器
- 顶部可以新建、打开、保存、导出 PDF
- 应用会自动扫描当前文档库目录中的 `.flowdoc` 文件
- 你可以在左侧文档库卡片里点击“选择目录”切换默认扫描位置
- 你也可以手动打开任意位置的 `.flowdoc`

---

## 使用说明 ✍️

### 新建文档

1. 点击“新建文档”
2. 选择保存位置
3. 进入编辑状态
4. 修改首个 `h1` 标题时，文件名会自动同步

### 打开已有文档

1. 点击“打开文档”
2. 选择 `.flowdoc` 文件
3. 文档会自动加载正文、标签和资源引用

### 编辑内容

支持这些常见格式：

- 标题 1 / 标题 2 / 标题 3
- 粗体 / 斜体
- 有序列表 / 无序列表
- 引用块
- 代码块
- 链接

编辑体验：

- 所见即所得实时编辑
- 选中文本后自动弹出格式工具条
- 代码块支持高亮和复制
- 粘贴普通链接会自动转为可点击链接

### 插入图片和附件

支持两种方式：

- 通过插入菜单选择本地文件
- 直接粘贴图片到正文

资源会统一保存到：

- `images/`
- `attachments/<文档名>/`

如果文件重名，会自动改名，避免覆盖 `♪(^∇^*)`

现在的附件结构示例：

```text
attachments/
└─ a/
   ├─ b.txt
   └─ c.zip
```

如果正文是 `a.flowdoc`，那么它引用的附件会尽量归档到 `attachments/a/` 下面，后续整理和备份会清爽很多。

附件卡片现在还会按常见文件类型显示不同图标，比如：

- PDF 会显示偏阅读器风格的红色图标卡片
- TXT / Markdown / Python / 压缩包 / Office 文档 / 可执行文件会有不同颜色和缩写
- 导出 PDF 时，这些附件也会以对应的图标卡片形式保留下来

### 迁移旧附件结构

如果你以前的附件都是平铺在 `attachments/` 根目录，比如：

```text
attachments/
├─ b.txt
├─ c.zip
└─ demo.pdf
```

现在可以执行下面的迁移命令，把旧附件按文档归档，并自动改写文档里的引用路径：

```bash
npm run migrate:attachments
```

迁移脚本位置：

```text
scripts/migrate-legacy-attachments.js
```

迁移时会做这些事：

1. 扫描默认文档库目录下的 `.flowdoc`
2. 找出正文里仍然引用旧版 `attachments/xxx` 的文档
3. 把附件复制到 `attachments/<文档名>/`
4. 改写文档里的附件引用
5. 删除已迁移的旧平铺附件
6. 在 `migration-backups/` 下留下原始文档备份

如果你只是第一次使用新版项目，通常不需要手动跑这一步；只有手上已经有旧结构文档时才需要。

补充说明：
- 迁移脚本默认按“环境变量 -> 旧版桌面 `本地文档` -> 系统 `Documents/FlowDoc Library`”这套规则找文档
- 默认会优先沿用已存在的桌面 `本地文档`；如果没有，则使用系统 `Documents/FlowDoc Library`
- 如果你的文档存放在别的位置，或者你已经在应用里手动选择过别的文档库目录，建议显式传入 `--documents-root <目录>`；也可以使用环境变量 `FLOWDOC_LIBRARY_ROOT`

### 插入视频嵌入

目前已适配：

- YouTube
- Bilibili

导出 PDF 时，视频会显示为占位卡片，不会直接嵌入可播放内容。

### 标签与搜索

每篇文档支持多个标签。

左侧文档库支持：

- 按标签筛选
- 按标题、路径、标签关键词搜索
- 直接点击文档打开
- 手动选择默认扫描目录或恢复默认目录

---

## PDF 导出 🖨️

点击顶部“导出 PDF”按钮即可导出。

导出特性：

- 保留代码高亮
- 保留正文排版
- 保留当前选择的文档字体和代码字体
- 图片会正常渲染
- 附件会导出成图标卡片
- 视频嵌入会导出成说明卡片

导出前会自动保存当前文档，所以一般不需要额外操作 `(￣y▽￣)╭`

---

## 快捷键 ⌨️

- `Ctrl + S`：立即保存
- `Ctrl + Z`：撤销
- `Ctrl + Shift + Z`：重做
- `Ctrl + Y`：重做
- `Ctrl + A`：
  - 在代码块中第一次按下时，全选当前代码块
  - 再按一次时，全选整篇文档

---

## 打包 📦

### 构建安装版和便携版

```bash
npm run dist
```

### 只构建便携版

```bash
npm run dist:portable
```

默认输出目录：

```text
release/
```

常见产物：

- `FlowDoc-1.0.0-x64-setup.exe`
- `FlowDoc-1.0.0-x64-portable.exe`
- `release/win-unpacked/FlowDoc.exe`

建议：

- 想长期使用，优先用安装版
- 想免安装直接运行，可以用 portable 版
- 如果希望 `.flowdoc` 在资源管理器里显示专属图标，并支持双击直接打开，优先使用安装版；portable 版通常不保证系统级文件关联

---

## 常见问题 ❓

### 1. 双击 `quick-start.bat` 没反应 _(:з」∠)_

请先确认：

- 是否已经安装 Node.js
- `node -v` 是否能正常输出版本号
- `npm -v` 是否能正常输出版本号

### 2. 第一次启动很慢，是不是卡住了？

大多数情况下是正常现象。

第一次运行需要安装依赖，`npm install` 会花一些时间，请稍等一下 `Σ(っ °Д °;)っ`

### 3. PDF 导出失败怎么办？

建议检查：

- 文档路径是否可写
- 导出目标文件是否被其他程序占用
- 图片或附件路径是否异常

如果是源码运行环境，先重新执行一次：

```bash
npm install
npm start
```

### 4. 打开文档后提示图片或附件缺失

说明正文里引用了资源，但本地对应文件不存在。

解决方式：

- 把原始 `images/` 或 `attachments/` 目录一并拷贝过来
- 或重新插入对应资源

### 5. `.flowdoc` 文件在 Windows 里没有图标，或双击不能直接打开

建议检查：

- 是否使用的是安装版，而不是 portable 版
- 是否重新安装过最新版本，让安装程序重新注册 `.flowdoc` 文件关联
- 如果图标还是没刷新，可以重启资源管理器，或者注销后重新登录 Windows

---

## Git 说明 🧪

仓库默认忽略以下内容：

- `images/`
- `attachments/`
- `node_modules/`
- `release/`
- `tmp-electron-test/`
- `migration-backups/`

这意味着提交到 GitHub 时，默认只上传源码和必要配置，不会把本地运行资源和构建产物一起提交。

---

## 技术栈 ⚙️

- Electron
- highlight.js
- 原生 HTML / CSS / JavaScript

---

## 后续可以继续扩展的方向 🔮

- 表格节点
- 多文档标签页
- 全文搜索增强
- 更多导出格式
- 更完整的快捷键体系
- 更强的附件预览能力

---

## 字体说明 🔤

侧边栏现在使用“文档字体”这个名称，不再叫“文档排版”。

你可以分别切换：

- 正文与标题字体
- 代码块与行内代码字体

当前项目内置并随应用打包的本地字体一共 29 套：

- 文档字体 15 套：Atkinson Hyperlegible Next、IBM Plex Sans、Source Sans 3、Plus Jakarta Sans、Inter、Outfit、Space Grotesk、Manrope、Public Sans、Work Sans、Lexend、Noto Sans、Newsreader、Literata + Fraunces、Google Sans Code
- 代码字体 14 套：Google Sans Code、JetBrains Mono、Fira Code、IBM Plex Mono、Inconsolata、Martian Mono、Recursive Mono、Source Code Pro、Red Hat Mono、Azeret Mono、DM Mono、Space Mono、Anonymous Pro、Courier Prime

补充说明：

- 这些字体都放在 `assets/fonts/`，不依赖用户系统预装
- 代码字体会继续保留连字效果
- 正文和标题继续关闭连字，方便区分 `1 / I / l`
- 导出 PDF 时会跟随当前字体选择

## 最后 👋

如果你是第一次用这个项目，希望这份 README 能让你少踩一点坑、少花一点时间 `(｡･∀･)ﾉﾞ`

如果你已经在用它整理笔记、漏洞分析或者 PoC，那祝你写得顺手、导出顺利、知识库越攒越厚 ✨
