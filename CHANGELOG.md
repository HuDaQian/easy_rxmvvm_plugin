# Changelog

本文件记录扩展的版本更新概况与重要改动。
## 0.0.3 - 组件生成与模板修复
- 新增命令：`Easy RxMVVM: Generate Component Widget`，支持在目录或 `.dart` 文件处右键生成组件级 Widget。
- 新增模板：`templates/appwidget.dart.tpl`，去除 `FFRoute` 内容，采用 `easy_rxmvvm` 的 `ViewModelConsumerStatefulWidget`/`State<$nameWidget>` 结构。
- 命名规则：根据输入名称智能生成文件名（含 `widget`/`component` 时遵循；默认生成 `_widget.dart`），可选创建或占位复用 ViewModel。
- 修复：`$createVMCall` 占位符移除末尾分号，避免与模板中的分号重复导致语法错误。
- 菜单文案调整：将页面与组件的生成命令标题更清晰地区分与命名。
- 文档：补充模板缓存的打开、重置、备份与恢复说明，指导升级后如何迁移自定义模板。

## 0.0.3 — Component Widget Generation & Template Fixes (English Summary)
- New command: `Easy RxMVVM: Generate Component Widget` to scaffold component-level widgets from the explorer context.
- New template: `templates/appwidget.dart.tpl` without `FFRoute`, using `easy_rxmvvm` `ViewModelConsumerStatefulWidget` and explicit `State<$nameWidget>`.
- Naming rules: respect input containing `widget`/`component`; otherwise default to `_widget.dart`. Optional ViewModel creation or placeholder-based reuse.
- Fix: removed the trailing semicolon from `$createVMCall` to avoid double semicolons with the template.
- Menu titles updated to clearly differentiate page and component generation.
- Docs: added guidance on template cache management (open, reset, backup, restore) and how to migrate custom templates after upgrading.
## 0.0.2 - 规范版本号
- 规范版本号，发布至marketplace。[Miloy.easy-rxmvvm-template](https://marketplace.visualstudio.com/items?itemName=Miloy.easy-rxmvvm-template)
- 简化菜单项，将“设置默认外部路由路径”整合到“快速设置默认路由行为”的 external 流程中，支持本地化提示与文件选择。

## 0.0.2 — Version Normalization & CI/Publish (English Summary)
- Version normalized and published to the Marketplace: [Miloy.easy-rxmvvm-template](https://marketplace.visualstudio.com/items?itemName=Miloy.easy-rxmvvm-template)
- Menu simplification: removed the standalone “Set Default External Route Path”. In the “Quick Set Default Route Behavior” command, choosing `external` now prompts for a `.dart` file and writes both configurations, with localized messages.

## 0.0.1 — 初始发布
- 发布 Easy RxMVVM VS Code 扩展的第一个版本。
- 核心命令：
  - `Easy RxMVVM: Open Template Folder`（打开模板缓存目录）
  - `Easy RxMVVM: Generate File From Template`（生成 `apppage.dart` 与 `viewmodel.dart`）
  - `Easy RxMVVM: Add Route Lifecycle State`（添加或复用 `route_lifecycle_state.dart`）
  - `Easy RxMVVM: Quick Set Default Route Behavior`（快速选择默认路由行为，选择 `external` 时立即选择文件并写入路径）
  - `Easy RxMVVM: Toggle Global Duplicate Check`（切换全局同名查重）
  - `Easy RxMVVM: Reset Templates`（重置模板缓存为扩展内置）
  - `Easy RxMVVM: Backup and Reset Templates`（备份再重置）
  - `Easy RxMVVM: Restore Templates From Backup`（从备份恢复模板缓存）
- 路由生命周期行为：`ask` / `none` / `builtin` / `external`。
  - `external` 模式在“快速设置”中直接选择 `.dart` 文件并写入 `easyRxmvvm.defaultExternalRoutePath`。
  - 生成流程在路径无效时会提示选择或回退到内置策略（复用/生成并自动后缀）。
- 模板与备份管理：
  - 模板缓存目录：`~/.vscode/easy-rxmvvm-templates_<version>`
  - 备份根目录：`~/.vscode/easy-rxmvvm-templates_backups`
  - 支持打开、重置、备份与恢复。
- 全局同名查重：
  - `easyRxmvvm.globalDuplicateCheckEnabled` 默认开启；对除生命周期文件外的生成文件执行全局同名检查。
  - 生命周期文件使用复用或自动后缀避免冲突。
- 国际化：根据 VS Code 语言自动显示中英文（`zh*` 显示中文，其他显示英文）。
- 依赖：在目标 Dart 工程中添加 `rxdart`、`easy_rxmvvm`、`ff_annotation_route_library`。
  - 示例：`flutter pub add rxdart easy_rxmvvm ff_annotation_route_library`
- 许可协议：MIT（见 `LICENSE`）。
- 文档：`README.md` 与 `README_CN.md`，包含所有命令与设置说明。

## 0.0.1 — Initial Release (English Summary)
- First public release of the Easy RxMVVM VS Code extension.
- Core commands:
  - `Easy RxMVVM: Open Template Folder` (open cached templates)
  - `Easy RxMVVM: Generate File From Template` (generate `apppage.dart` and `viewmodel.dart`)
  - `Easy RxMVVM: Add Route Lifecycle State` (add or reuse `route_lifecycle_state.dart`)
  - `Easy RxMVVM: Quick Set Default Route Behavior` (choose default behavior; picking `external` prompts for a file and saves the path)
  - `Easy RxMVVM: Toggle Global Duplicate Check` (enable/disable workspace-wide duplicate checks)
  - `Easy RxMVVM: Reset Templates` (reset cache to built-in templates)
  - `Easy RxMVVM: Backup and Reset Templates` (backup then reset)
  - `Easy RxMVVM: Restore Templates From Backup` (restore cached templates from snapshots)
- Route lifecycle behaviors: `ask` / `none` / `builtin` / `external`.
  - In `external`, the quick-set flow immediately picks a `.dart` file and writes `easyRxmvvm.defaultExternalRoutePath`.
  - Generation falls back to built-in reuse/generate logic if the external path is invalid.
- Templates and backups:
  - Cache: `~/.vscode/easy-rxmvvm-templates_<version>`
  - Backups: `~/.vscode/easy-rxmvvm-templates_backups`
  - Supports open, reset, backup, and restore.
- Global duplicate check:
  - `easyRxmvvm.globalDuplicateCheckEnabled` ON by default; applies to generated files except lifecycle files.
  - Lifecycle files use reuse or auto-suffix to avoid conflicts.
- Internationalization: bilingual messages (Chinese for `zh*`, English otherwise).
- Dependencies: add `rxdart`, `easy_rxmvvm`, `ff_annotation_route_library` in your Dart project.
  - Example: `flutter pub add rxdart easy_rxmvvm ff_annotation_route_library`
- License: MIT (see `LICENSE`).
- Documentation: `README.md` and `README_CN.md` cover all commands and settings.