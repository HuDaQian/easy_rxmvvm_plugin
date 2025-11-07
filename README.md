# Easy RxMVVM VS Code Extension

Language: [中文说明](README_CN.md)

Easy RxMVVM accelerates scaffolding for Dart projects using RxMVVM patterns. It generates page and view model templates, manages a reusable route lifecycle file, and provides safe guards against duplicate files. All user-facing messages are bilingual and adapt to your VS Code locale (Chinese if `zh*`, otherwise English).

**Key Features**
- Generate `apppage.dart` and `viewmodel.dart` with consistent naming.
- Configure route lifecycle support via built-in or external file.
- Reuse or suffix route lifecycle files to avoid conflicts.
- Manage cached templates: open, reset, backup, restore.
- Workspace-wide duplicate check to keep filenames unique.

**Template & Backup Locations**
- Templates cache: `~/.vscode/easy-rxmvvm-templates_<version>`
- Backups root: `~/.vscode/easy-rxmvvm-templates_backups`

## Commands

**Open Templates Folder** (`easy-rxmvvm-plugin.openTemplatesFolder`)
- Opens the cached templates folder in a new VS Code window.
- If the cache does not exist, it copies the built-in templates into `~/.vscode/easy-rxmvvm-templates_<version>` first.
- Impact: Editing files here changes future generated templates.

**Quick Set Default Route Behavior** (`easy-rxmvvm-plugin.quickSetDefaultRouteBehavior`)
- Opens a QuickPick to choose `ask` / `none` / `builtin` / `external`.
- If `external` is chosen, immediately prompts you to pick a `.dart` file, then sets `easyRxmvvm.defaultExternalRoutePath` and switches `easyRxmvvm.defaultRouteBehavior` to `external`.
- Impact: One-stop setup for default lifecycle behavior and external file path; avoids separate commands.

**Generate Template** (`easy-rxmvvm-plugin.generateTemplate`)
- Context-menu command on folders or `.dart` files. Prompts for a name, then generates:
  - `apppage.dart` and `viewmodel.dart` in the target directory.
- Route lifecycle behavior (driven by `easyRxmvvm.defaultRouteBehavior`):
  - `ask`: You are asked to choose among `none` / `builtin` / `external`.
  - `none`: Page state extends `State` directly. No lifecycle file is created or referenced.
  - `builtin`: The extension tries to reuse an existing `route_lifecycle_state*.dart` (in workspace) that contains a suitable lifecycle class; if none is reusable, it generates a new one from template, adding numeric suffixes to avoid conflicts. Page state inherits a lifecycle class (`RouteLifecycleState`/`AppPageLifecycleState`) if found, otherwise `AppPageLifecycleState`.
  - `external`: Uses an external file (either the default path or a file you pick). If the file does not declare a suitable lifecycle class, it falls back to the builtin strategy (reuse or generate). Imports are computed as package imports when possible, otherwise relative.
- Duplicate detection: With `globalDuplicateCheckEnabled` on, the extension fails early if a generated filename already exists anywhere in the workspace (excluding `route_lifecycle_state*.dart`, which uses reuse/suffix logic instead).

**Add Route Lifecycle State** (`easy-rxmvvm-plugin.addRouteLifecycleState`)
- Adds a `route_lifecycle_state.dart` from the template into the target directory.
- If a same-named file exists globally and is reusable (contains a class extending a `State<...>` lifecycle), it is reused and no new file is created. Otherwise, the extension generates `route_lifecycle_state_2.dart`, `route_lifecycle_state_3.dart`, etc., to avoid conflicts.
- Impact: Ensures a lifecycle file is available while preventing duplicate collisions.

**Toggle Global Duplicate Check** (`easy-rxmvvm-plugin.toggleGlobalDuplicateCheck`)
- Toggles `easyRxmvvm.globalDuplicateCheckEnabled`.
- When ON: generation fails if any target filenames (except lifecycle files) already exist elsewhere in the workspace.
- Impact: Keeps filenames unique across the workspace, but may block generation if you already have files with the same names.

**Reset Templates** (`easy-rxmvvm-plugin.resetTemplates`)
- Confirms, then deletes the template cache and restores built-in templates.
- Impact: Any customizations you made in the cache are lost.

**Backup And Reset Templates** (`easy-rxmvvm-plugin.backupAndResetTemplates`)
- Confirms, then backs up the current cache to `~/.vscode/easy-rxmvvm-templates_backups/<timestamp>` and restores built-ins.
- Impact: Your customizations are preserved in a snapshot and templates revert to defaults.

**Restore Templates From Backup** (`easy-rxmvvm-plugin.restoreTemplatesFromBackup`)
- Lists available backups and restores the selected snapshot into the cache folder.
- Impact: Future generations use the restored templates.

## Settings

**`easyRxmvvm.defaultRouteBehavior`** (`ask` | `none` | `builtin` | `external`, default: `ask`)
- Controls the route lifecycle behavior when generating pages.
- `ask`: You choose each time.
- `none`: Page state extends `State`; no lifecycle file involved.
- `builtin`: Reuse or generate a `route_lifecycle_state*.dart` lifecycle class; page state inherits lifecycle-specific base.
- `external`: Link to an external file (from `defaultExternalRoutePath` or a picker). If unsuitable, falls back to builtin logic.

**`easyRxmvvm.defaultExternalRoutePath`** (string)
- The external lifecycle file used when `defaultRouteBehavior` is `external`.
- Typically set via the right-click command “Quick Set Default Route Behavior” when choosing `external`.
- Resolution order: absolute → workspace-root-relative → target-relative. If missing, generation prompts or falls back.

**`easyRxmvvm.globalDuplicateCheckEnabled`** (boolean, default: `true`)
- Enables workspace-wide duplicate filename checks for generated files (excluding lifecycle files which use reuse/suffix logic).
- When enabled, generation aborts with a conflict message if duplicates are found.

**`easyRxmvvm.globalDuplicateCheckRoutesOnly`** (boolean, default: `false`, advanced)
- When `true`, disables the global duplicate check for non-route files during generation.
- Intended for niche workflows; most users should leave this `false`.

## Language
- All messages adapt to VS Code’s locale: Chinese for `zh*`, English otherwise.

## Dependencies
- `rxdart` — reactive streams for Dart.
- `easy_rxmvvm` — MVVM helpers used by generated templates.
- `ff_annotation_route_library` — route annotations and codegen helpers.
- Add these to your project’s `pubspec.yaml`, or run:
  - `flutter pub add rxdart easy_rxmvvm ff_annotation_route_library`
- The generated templates import and rely on these packages; missing deps will cause unresolved imports/types.

## Development
- Requirements: Node.js 16+.
- Install deps: `npm install`
- Build: `npm run compile` (or `npm run watch`)
- Launch: Press `F5` in VS Code to start the extension host.

## License
- Licensed under `MIT`. See `LICENSE` for details.