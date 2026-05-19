# FlowDoc Editor

FlowDoc Editor 是一个基于 Electron 的本地文档编辑器，交互风格参考飞书文档和 Typora，强调所见即所得的编辑体验。

它适合拿来整理这些内容：
- 学习笔记
- 项目文档
- 技术记录
- 带图片、附件、代码块的长文档
- 需要导出成 PDF 或打包分享的本地资料

文档主体会直接以排版后的样式呈现，不需要在“源码模式”和“预览模式”之间反复切换。

---

## 功能亮点

- 支持新建、打开、保存 `.flowdoc` 文档
- 支持标题、粗体、斜体、有序列表、无序列表、引用块
- 支持代码块实时高亮和一键复制
- 支持切换“正文与标题字体”和“代码块字体”，内置 29 套本地字体
- 支持插入图片、附件和视频嵌入
- 支持为常见附件显示文件类型图标
- 支持附件预览，图片、PDF、文本、Markdown、音视频都可直接查看
- 支持压缩包目录预览，可像文件浏览器一样逐层点进文件夹查看
- 支持标签、搜索、目录大纲、最近打开和文档库排序
- 支持自动保存、撤销、重做和历史快照
- 支持导出 PDF，并保留排版、字体和代码高亮
- 支持导出 / 导入 `.flowzip` 文档包
- 支持在界面中手动选择默认文档库目录
- 支持为 `.flowdoc` 与导出的 PDF 写入文档元数据
- Windows 安装版支持 `.flowdoc` 文件关联、文件图标和双击打开

---

## 适合谁用

- 想把资料长期保存在本地的人
- 想整理个人知识库、项目资料或课程笔记的人
- 想写“能编辑、能插图、能带附件、还能导出”的文档的人
- 喜欢桌面应用而不是纯在线文档的人

---

## 项目结构

```text
.
├─ index.html
├─ styles.css
├─ renderer.js
├─ preload.js
├─ pdf-export-preload.js
├─ main.js
├─ package.json
├─ quick-start.bat
├─ assets/
├─ build/
├─ images/
├─ attachments/
├─ main-modules/
├─ renderer-modules/
├─ scripts/
├─ shared/
├─ tests/
└─ release/
```

说明：
- `images/` 和 `attachments/` 是运行时资源目录，默认不提交
- `release/` 是打包产物目录，默认不提交
- `tests/` 里放的是基础自动化校验

---

## 文档格式

`.flowdoc` 本质上是一个 JSON 文件，核心结构类似这样：

```json
{
  "kind": "flowdoc",
  "version": 3,
  "createdAt": "2026-05-19T09:00:00.000Z",
  "updatedAt": "2026-05-19T09:30:00.000Z",
  "html": "<h1>文档标题</h1><p>正文内容</p>",
  "tags": ["笔记", "项目"],
  "metadata": {
    "documentId": "flowdoc_xxxxxxxx",
    "createdByDevice": "fddev1_xxxxxxxx",
    "lastSavedByDevice": "fddev1_xxxxxxxx"
  }
}
```

说明：
- `html` 保存规范化后的正文 HTML
- `tags` 保存文档标签
- `metadata` 保存文档唯一 ID、生成器版本和设备环境指纹等信息
- 图片和附件不会直接写进 `.flowdoc`，而是通过相对路径引用资源文件

默认资源结构：

```text
images/
attachments/
└─ 文档名/
   ├─ file-a.pdf
   └─ file-b.zip
```

如果正文引用了图片或附件，分享文档时也要一并带上对应资源目录。  
如果不想手动整理，可以直接使用 `.flowzip` 打包。

---

## 快速开始

### 方式一：双击脚本启动

1. 下载源码
2. 安装 Node.js
3. 双击运行：

```text
quick-start.bat
```

这个脚本会自动：
- 检查 `node` 和 `npm`
- 如果缺少依赖则执行 `npm install`
- 然后执行 `npm start`

### 方式二：命令行启动

```bash
npm install
npm start
```

现在 `npm start` 会先在终端显示一个彩色的 `FLOWDOC` 启动 banner，再启动 Electron。

---

## 安装版与便携版

### 运行源码

```bash
npm install
npm start
```

### 打包安装版和便携版

```bash
npm run dist
```

### 只打包便携版

```bash
npm run dist:portable
```

常见产物位置：

```text
release/
├─ FlowDoc-1.0.0-x64-setup.exe
├─ FlowDoc-1.0.0-x64-portable.exe
└─ win-unpacked/
```

建议：
- 想要 `.flowdoc` 文件关联、文件图标和双击打开，用安装版
- 想免安装直接运行，用便携版

---

## 首次使用

正常启动后，你会看到：
- 左侧是文档库、标签、目录和字体设置
- 中间是编辑区
- 顶部是新建、打开、保存、导出 PDF、打包 FlowZip、导入 FlowZip 等操作

如果你没有手动设置文档库目录：
- 应用会优先沿用已存在的桌面 `本地文档`
- 如果没有，再使用系统 `Documents/FlowDoc Library`

你也可以在左侧文档库卡片中手动点击“选择目录”，改成自己的默认扫描位置。

---

## 基本使用

### 新建文档

1. 点击“新建文档”
2. 选择保存位置
3. 进入编辑状态
4. 修改主标题时，文档标题会和文件名保持同步

### 打开文档

1. 点击“打开文档”
2. 选择 `.flowdoc`
3. 应用会自动载入正文、标签和资源引用

### 编辑正文

支持这些常见格式：
- 标题 1 / 标题 2 / 标题 3
- 粗体 / 斜体
- 有序列表 / 无序列表
- 引用块
- 代码块
- 链接

编辑体验包括：
- 选中文本后显示格式工具条
- 代码块语法高亮
- 代码块一键复制
- 标题自动进入目录大纲
- 自动保存和撤销重做

---

## 图片、附件与预览

### 插入方式

支持：
- 通过插入菜单选择本地文件
- 直接粘贴图片到正文

资源会统一保存到：
- `images/`
- `attachments/<文档名>/`

如果附件重名，会自动改名，避免覆盖。

### 附件图标

常见文件类型会显示不同的图标，例如：
- `pdf`
- `doc / docx`
- `xls / xlsx`
- `ppt / pptx`
- `txt / md`
- `py / js / ts / c / cpp / java / go / rs`
- `zip / 7z / rar / flowzip`
- `png / jpg / svg`
- `mp3 / mp4`
- `exe / dll / so / elf / i64`

### 附件预览

目前支持：
- 图片预览
- PDF 预览
- 文本和 Markdown 预览
- 音视频预览
- 压缩包目录预览

压缩包预览支持：
- `flowzip`
- `zip`
- `7z`
- `rar`
- `tar`
- `gz`
- `tgz`
- `bz2`
- `xz`

压缩包不会一次性把所有条目平铺出来，而是可以像文件浏览器一样逐层点进文件夹查看内容。

---

## 文档目录与标签

### 目录

- 文档标题会自动生成侧边栏目录
- 支持多级标题层级展示
- 支持折叠目录项

### 标签与搜索

- 每篇文档支持多个标签
- 左侧文档库支持按标签筛选
- 支持按标题、路径、标签关键字搜索

---

## 文档字体

侧边栏现在使用“文档字体”这个名字，你可以分别切换：
- 正文与标题字体
- 代码块与行内代码字体

当前内置 29 套本地字体：

- 文档字体 15 套  
  Atkinson Hyperlegible Next、IBM Plex Sans、Source Sans 3、Plus Jakarta Sans、Inter、Outfit、Space Grotesk、Manrope、Public Sans、Work Sans、Lexend、Noto Sans、Newsreader、Literata + Fraunces、Google Sans Code
- 代码字体 14 套  
  Google Sans Code、JetBrains Mono、Fira Code、IBM Plex Mono、Inconsolata、Martian Mono、Recursive Mono、Source Code Pro、Red Hat Mono、Azeret Mono、DM Mono、Space Mono、Anonymous Pro、Courier Prime

说明：
- 这些字体都随项目打包，不依赖系统预装
- 代码字体保留连字效果
- 正文和标题默认关闭连字，方便区分 `1 / I / l`
- 导出 PDF 时会跟随当前字体选择

---

## PDF 导出

点击顶部“导出 PDF”即可。

导出特性：
- 保留正文排版
- 保留当前字体
- 保留代码高亮
- 图片正常渲染
- 附件显示为图标卡片
- 视频嵌入导出为说明卡片
- 写入标准 PDF 文档属性

PDF 元信息会包含：
- `Title`
- `Author`
- `Subject`
- `Keywords`
- `Creator`
- 创建时间与修改时间

---

## 文档元数据

FlowDoc 保存 `.flowdoc` 时，会顺手写入一组轻量元数据：
- `documentId`
- `createdByDevice`
- `lastSavedByDevice`
- `generator`
- `environment`

说明：
- 设备指纹是基于运行环境生成的哈希，不直接暴露原始主机名
- 同一篇文档会保留原来的 `documentId`
- 导出 PDF 时，这些信息也会同步写入 PDF 元属性，方便归档和追踪版本来源

---

## FlowZip 文档包

FlowZip 是 FlowDoc 的文档打包格式，扩展名是：

```text
.flowzip
```

它适合用来：
- 打包单篇文档及其引用资源
- 打包整个目录下的多篇文档
- 做本地备份或跨设备迁移

### 打包方式

点击“打包 FlowZip”后，应用会先让你选择：
- 打包单篇文档
- 打包整个目录

然后再进入对应的系统文件选择器。

### 导入方式

点击“导入 FlowZip”后：
1. 选择 `.flowzip`
2. 选择导入后的文档目录

导入时资源会自动恢复到当前项目规则：
- 图片进入 `images/`
- 附件进入 `attachments/<文档名>/`
- 文档正文里的相对路径会自动改写

---

## 旧附件迁移

如果你早期的附件都平铺在 `attachments/` 根目录，可以执行：

```bash
npm run migrate:attachments
```

迁移脚本会：
1. 扫描默认文档库中的 `.flowdoc`
2. 找出仍然引用旧附件路径的文档
3. 把附件移动到 `attachments/<文档名>/`
4. 改写文档中的引用路径
5. 生成迁移备份

迁移脚本位置：

```text
scripts/migrate-legacy-attachments.js
```

---

## 快捷键

- `Ctrl + S`：立即保存
- `Ctrl + Z`：撤销
- `Ctrl + Shift + Z`：重做
- `Ctrl + Y`：重做
- `Ctrl + A`：
  第一次在代码块内全选当前代码块
  第二次全选整篇文档

---

## 环境变量

你可以通过下面的环境变量覆盖默认文档库目录：

```text
FLOWDOC_LIBRARY_ROOT
```

如果设置了它，应用会优先使用这个目录作为文档库根目录。

---

## 常见问题

### 1. 双击 `quick-start.bat` 没反应

请先确认：
- 已安装 Node.js
- `node -v` 有输出
- `npm -v` 有输出

### 2. 第一次启动比较慢

通常是正常现象。  
第一次运行需要安装依赖，`npm install` 会花一点时间。

### 3. PDF 导出失败

建议检查：
- 导出目标路径是否可写
- 目标 PDF 是否被其他程序占用
- 文档中引用的图片或附件路径是否异常

### 4. 打开文档后提示图片或附件缺失

说明正文引用了资源，但本地对应文件不存在。  
可尝试：
- 把原来的 `images/` 和 `attachments/` 一起带回来
- 或重新插入对应资源

### 5. `.flowdoc` 没有图标或不能双击打开

建议检查：
- 是否安装的是安装版而不是便携版
- 是否已经重新安装最新版本
- 如图标未刷新，可重启资源管理器或重新登录 Windows

---

## Git 与忽略目录

仓库默认忽略这些内容：
- `images/`
- `attachments/`
- `node_modules/`
- `release/`
- `tmp-electron-test/`
- `migration-backups/`

这意味着提交到 GitHub 时，默认只上传源码和必要配置，不会把本地运行资源和构建产物一起提交。

---

## 技术栈

- Electron
- highlight.js
- 原生 HTML / CSS / JavaScript

---

## 后续可以继续扩展

- 表格节点
- 多文档标签页
- 更强的全文搜索
- 更多导出格式
- 更完整的附件预览能力

---

## 最后

如果你正在找一个本地优先、支持图片附件、代码高亮、PDF 导出和资源打包的桌面文档工具，希望这个项目能帮你省下一些整理资料的时间。
