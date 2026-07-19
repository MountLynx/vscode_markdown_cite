<p align="center">
  <img src="https://img.shields.io/badge/VS%20Code-1.85+-blue" alt="VS Code">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
</p>

# Pandoc Cite

Markdown 写作的 Pandoc 引文助手。侧边栏浏览文献库、点击插入引注标记、预览中实时渲染、一键导出 DOCX。

> [English](README.md)

## 功能

- **引文侧边栏** — 搜索浏览文献库，支持全部文献 / 本文引文两种模式
- **点击插入** — 在光标处插入 `[@citekey]` 或 `[@citekey, p. 42]` 标记
- **预览渲染** — Markdown 预览中 `(作者, 年份)` 蓝色渲染
- **编辑器高亮** — 源码中 `[@key]` 虚线下划线标记，悬停显示详细书目
- **DOCX 导出** — 侧边栏一键 Pandoc 导出（`--citeproc` + `--bibliography` + `--csl`）
- **多格式支持** — `.bib`、`.json`、`.yaml`（BibLaTeX + BibTeX）
- **依赖样式自动下载** — 从 GitHub 自动获取父样式

## 快速开始

1. 安装插件
2. 在 `settings.json` 中配置文献库路径：

```jsonc
{
  "citation.bibliography": "path/to/refs.bib",
  "citation.cslPath": ""                  // 留空 = 内置 Chicago author-date
}
```

3. 打开 Markdown 文件 — 📖 **Citations** 面板出现在活动栏
4. 点击条目在光标处插入 `[@citekey]`
5. `Ctrl+Shift+V` 预览 — 引注显示为 `(作者, 年份)`
6. 侧边栏点击 **📦 Export DOCX** 通过 Pandoc 导出

## 设置

| 键 | 默认 | 说明 |
|-----|---------|-------------|
| `citation.enabled` | `true` | 启用 / 禁用面板 |
| `citation.bibliography` | `""` | 文献数据库路径 |
| `citation.cslPath` | `""` | CSL 样式（空则用内置 Chicago author-date） |
| `citation.pandocPath` | `""` | Pandoc 路径（自动检测 PATH） |
| `citation.referenceDocPath` | `""` | DOCX 参考模板 |

## 命令

| 命令 | 说明 |
|---------|-------------|
| `Citation: Open Panel` | 打开引文侧边栏 |
| `Citation: Export DOCX` | 通过 Pandoc 导出当前文档 |

## 依赖

- [Pandoc](https://pandoc.org/installing.html)（仅 DOCX 导出需要，侧边栏和预览无需）

## License

MIT
