# Easy RxMVVM VS Code 扩展

语言切换：[English README](README.md)

Easy RxMVVM 用于加速 Dart 项目中基于 RxMVVM 的脚手架生成。它自动生成页面与视图模型模板、管理可复用的路由生命周期文件，并提供全局重复文件保护。扩展内的所有用户提示均支持中英双语，随 VS Code 语言自动切换（`zh*` 显示中文，否则显示英文）。

**主要能力**
- 生成一致命名的 `apppage.dart` 与 `viewmodel.dart`。
- 通过内置或外部文件配置路由生命周期支持。
- 对路由生命周期文件进行复用或自动添加后缀避免冲突。
- 管理缓存模板：打开、重置、备份、恢复。
- 全局重复文件检查，保持文件名唯一。

**模板与备份位置**
- 模板缓存：`~/.vscode/easy-rxmvvm-templates_<version>`
- 备份根目录：`~/.vscode/easy-rxmvvm-templates_backups`

## 命令

**打开模板目录**（`easy-rxmvvm-plugin.openTemplatesFolder`）
- 在新的 VS Code 窗口打开缓存模板目录。
- 若缓存不存在，会先将扩展内置模板复制到 `~/.vscode/easy-rxmvvm-templates_<version>`。
- 影响：你在此目录的修改将用于后续的模板生成。

**快速设置默认路由行为**（`easy-rxmvvm-plugin.quickSetDefaultRouteBehavior`）
- 打开一个 QuickPick 选择 `ask` / `none` / `builtin` / `external`。
- 选择 `external` 时立即弹出文件选择框，让你选择 `.dart` 文件，并同时设置 `easyRxmvvm.defaultExternalRoutePath` 与切换 `easyRxmvvm.defaultRouteBehavior` 为 `external`。
- 影响：一站式设置默认生命周期行为与外部文件路径，无需单独命令。

**生成模板**（`easy-rxmvvm-plugin.generateTemplate`）
- 目录或 `.dart` 文件右键菜单命令。输入名称后生成：
  - 目标目录下的 `apppage.dart` 与 `viewmodel.dart`。
- 路由生命周期行为（由 `easyRxmvvm.defaultRouteBehavior` 决定）：
  - `ask`：每次生成时询问选择 `none` / `builtin` / `external`。
  - `none`：页面 `State` 直接继承基础 `State`，不创建或引用生命周期文件。
  - `builtin`：尝试在工作区复用可用的 `route_lifecycle_state*.dart`，若无可复用则从模板生成新文件，并自动添加数字后缀避免冲突。页面 `State` 继承到合适的生命周期基类（`RouteLifecycleState`/`AppPageLifecycleState`），若未找到则退回到 `AppPageLifecycleState`。
  - `external`：使用外部文件（默认路径或你手动选择）。若该文件未声明合适的生命周期类，会回退到 `builtin`（复用或生成）。导入路径在满足条件时使用 package 方式，否则使用相对路径。
- 重复检测：在开启 `globalDuplicateCheckEnabled` 时，若待生成文件名（除生命周期文件外）在工作区已存在，会直接报冲突并终止生成；生命周期文件使用复用/后缀逻辑处理。

**生成组件 Widget**（`easy-rxmvvm-plugin.generateWidget`）
- 目录或 `.dart` 文件右键菜单命令。输入组件名称后，根据 `templates/appwidget.dart.tpl` 生成组件。
- ViewModel 处理：可选择创建新的 ViewModel 文件，或使用占位符保留“复用现有 ViewModel”的导入与创建调用（以 TODO 标记）。
- 命名规则：若名称包含 `widget`/`component` 则保持一致，否则默认生成 `_widget.dart`；选择创建新的 ViewModel 时会额外生成 `_viewmodel.dart`。
- 路由生命周期：组件不包含路由生命周期逻辑；模板不含 `FFRoute` 相关内容。
- 重复检测：与页面生成一致，开启全局查重时若目标文件名已存在则中止生成。

**添加路由生命周期文件**（`easy-rxmvvm-plugin.addRouteLifecycleState`）
- 在目标目录通过模板添加 `route_lifecycle_state.dart`。
- 若工作区存在同名且可复用的文件（包含继承 `State<...>` 的生命周期类），则直接复用，不新增文件。否则按需生成 `route_lifecycle_state_2.dart`、`route_lifecycle_state_3.dart` 等避免冲突。
- 影响：保证存在生命周期文件，同时避免重复冲突。

**切换全局重复检查**（`easy-rxmvvm-plugin.toggleGlobalDuplicateCheck`）
- 切换 `easyRxmvvm.globalDuplicateCheckEnabled`。
- 开启时：若目标文件名（生命周期文件除外）在工作区已存在，则报错并终止生成。
- 影响：保持全局文件名唯一；若已存在同名文件，可能阻止生成。

**重置模板**（`easy-rxmvvm-plugin.resetTemplates`）
- 弹窗确认后，删除模板缓存并恢复为扩展内置模板。
- 影响：你在缓存目录的自定义修改将被清除。

**备份并重置模板**（`easy-rxmvvm-plugin.backupAndResetTemplates`）
- 弹窗确认后，先将当前缓存备份到 `~/.vscode/easy-rxmvvm-templates_backups/<timestamp>`，再恢复内置模板。
- 影响：你的自定义修改被保留到快照，当前模板回到默认。

**从备份恢复模板**（`easy-rxmvvm-plugin.restoreTemplatesFromBackup`）
- 列出可用备份，选择后将该快照恢复到模板缓存目录。
- 影响：后续生成使用恢复后的模板。

## 设置

**`easyRxmvvm.defaultRouteBehavior`**（`ask` | `none` | `builtin` | `external`，默认：`ask`）
- 控制生成页面时的路由生命周期处理方式。
- `ask`：每次询问。
- `none`：页面 `State` 直接继承基础 `State`，不涉及生命周期文件。
- `builtin`：复用或生成 `route_lifecycle_state*.dart` 生命周期类；页面 `State` 继承一个生命周期基类。
- `external`：关联到外部文件（由 `defaultExternalRoutePath` 或文件选择得到）。若不合适则回退到 `builtin`。

**`easyRxmvvm.defaultExternalRoutePath`**（字符串）
- 在 `defaultRouteBehavior=external` 时使用的外部生命周期文件。
- 通常通过右键菜单的“快速设置默认路由行为”在选择 `external` 时一并设置。
- 解析顺序：绝对路径 → 工作区根相对 → 目标相对。若缺失，生成过程会提示或回退。

**`easyRxmvvm.globalDuplicateCheckEnabled`**（布尔，默认：`true`）
- 开启后，对生成文件（生命周期文件除外）执行工作区范围的同名检查；发现重复则终止并报错。

**`easyRxmvvm.globalDuplicateCheckRoutesOnly`**（布尔，默认：`false`，高级）
- 为 `true` 时，在生成过程中对非路由相关文件关闭全局重复检查。
- 仅建议在特殊场景使用；大多数情况下保持 `false`。

## 语言
- 所有提示随 VS Code 语言自动切换：`zh*` 显示中文，其他显示英文。

## 依赖
- `rxdart`：Dart 响应式流库。
- `easy_rxmvvm`：生成模板所使用的 MVVM 辅助库。
- `ff_annotation_route_library`（支持版本：`3.2.1`）：路由注解与代码生成辅助。
- 请在项目的 `pubspec.yaml` 中添加这些依赖，或执行：
  - `flutter pub add rxdart easy_rxmvvm ff_annotation_route_library:3.2.1`
- 模板代码会导入并依赖这些包；若缺失将导致导入/类型无法解析。

## 关联项目
- rxmvvm：https://github.com/MengLiMing/rxmvvm.git

## 开发
- 环境依赖：Node.js 16+。
- 安装依赖：`npm install`
- 构建：`npm run compile`（或 `npm run watch` 持续编译）
- 启动：在 VS Code 中按 `F5` 启动扩展宿主进行调试。

## 许可协议
- 本项目采用 `MIT` 许可证。详见根目录 `LICENSE` 文件。

## 版本 0.0.2 更新
- 菜单项简化：移除“设置默认外部路由路径”独立菜单项；在“快速设置默认路由行为”选择 `external` 时直接弹出 `.dart` 文件选择并同步写入配置（含国际化提示）。
- 文档完善：README 与 README_CN 增加语言切换入口；新增“关联项目”链接到 `rxmvvm` 仓库。
- 许可证规范：新增 `LICENSE`（MIT），并在 README 中说明。

## 版本 0.0.3 更新
- 新增命令：生成组件 Widget（支持选择创建新 ViewModel 或占位复用）。
- 新增模板：`templates/appwidget.dart.tpl`（不包含 `FFRoute`，使用 `ViewModelConsumerStatefulWidget` 与显式 `State<$nameWidget>`）。
- 命名规则：根据输入智能生成 `_widget.dart`/`_component.dart`；需要时生成 `_viewmodel.dart`。
- 修复：去除 `$createVMCall` 占位符末尾分号，避免与模板中的分号重复。
- 菜单标题更清晰地区分页面与组件生成。
- 文档：补充模板缓存管理与升级迁移建议；升级后可通过“打开模板目录”与“重置/备份/恢复模板”管理自定义模板。