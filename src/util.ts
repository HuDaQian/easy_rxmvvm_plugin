import * as vscode from 'vscode';
import * as path from 'path';
import { promises as fs } from 'fs';
import config from './config';
import { t } from './i18n';

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function copyFile(src: string, dst: string): Promise<void> {
  await fs.copyFile(src, dst);
}

async function copyFolder(src: string, dst: string): Promise<void> {
  const stat = await fs.stat(src);
  if (!stat.isDirectory()) {
    throw new Error('Source is not a directory');
  }
  await fs.mkdir(dst, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const source = path.join(src, entry.name);
    const target = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      await copyFolder(source, target);
    } else if (entry.isFile()) {
      await copyFile(source, target);
    }
  }
}

export async function ensureTemplatesFolder(context: vscode.ExtensionContext): Promise<void> {
  const target = config.templatesFolderPath;
  if (!(await exists(target))) {
    const source = path.join(context.extensionPath, 'templates');
    await copyFolder(source, target);
  }
}

export async function openTemplatesFolder(context: vscode.ExtensionContext): Promise<void> {
  await ensureTemplatesFolder(context);
  const uri = vscode.Uri.file(config.templatesFolderPath);
  await vscode.commands.executeCommand('vscode.openFolder', uri, true);
}

export async function resetTemplatesFolder(context: vscode.ExtensionContext): Promise<void> {
  const target = config.templatesFolderPath;
  // 删除缓存目录（如果存在），然后从扩展内置模板重新复制
  if (await exists(target)) {
    await fs.rm(target, { recursive: true, force: true });
  }
  await ensureTemplatesFolder(context);
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function backupTemplatesFolder(): Promise<string | undefined> {
  const target = config.templatesFolderPath;
  if (!(await exists(target))) {
    return undefined; // 没有缓存无需备份
  }
  await ensureDir(config.backupsRootPath);
  const snapshotName = `easy-rxmvvm-templates_${config.version}_${timestamp()}`;
  const snapshotPath = path.join(config.backupsRootPath, snapshotName);
  await copyFolder(target, snapshotPath);
  return snapshotPath;
}

export async function listTemplateBackups(): Promise<{ name: string; path: string; mtime: number }[]> {
  const root = config.backupsRootPath;
  if (!(await exists(root))) {
    return [];
  }
  const entries = await fs.readdir(root, { withFileTypes: true });
  const results: { name: string; path: string; mtime: number }[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const p = path.join(root, e.name);
    const st = await fs.stat(p);
    results.push({ name: e.name, path: p, mtime: st.mtimeMs });
  }
  results.sort((a, b) => b.mtime - a.mtime);
  return results;
}

export async function restoreTemplatesFromBackup(context: vscode.ExtensionContext, snapshotPath: string): Promise<void> {
  const target = config.templatesFolderPath;
  if (await exists(target)) {
    await fs.rm(target, { recursive: true, force: true });
  }
  await ensureDir(target);
  await copyFolder(snapshotPath, target);
}

export async function backupAndResetTemplates(context: vscode.ExtensionContext): Promise<string | undefined> {
  const saved = await backupTemplatesFolder();
  await resetTemplatesFolder(context);
  return saved;
}

export function getCurrentPossibleUri(uri?: vscode.Uri): vscode.Uri | undefined {
  if (!uri) {
    if (vscode.window.activeTextEditor) {
      uri = vscode.window.activeTextEditor.document.uri;
    } else if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      uri = vscode.workspace.workspaceFolders[0].uri;
    }
  }
  return uri;
}

export async function checkFolderExists(p: string): Promise<boolean> {
  return await exists(p);
}

function toPascalCase(input: string): string {
  return (input || '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

function toSnakeCase(input: string): string {
  return (input || '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map(w => w.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase())
    .join('_');
}

async function writeFileWithNameTemplate(
  srcFile: string,
  dstFile: string,
  name: string,
  extras?: Record<string, string>
): Promise<void> {
  const raw = await fs.readFile(srcFile, 'utf8');
  // 先替换原样名称，再替换 PascalCase 名称，避免 $nameRaw 被部分匹配
  const content = raw
    .replace(/\$nameRaw/g, name)
    .replace(/\$name/g, toPascalCase(name));
  const finalContent = extras
    ? Object.keys(extras).reduce((acc, k) => acc.replace(new RegExp(`\\${k}`, 'g'), extras[k] ?? ''), content)
    : content;
  await fs.writeFile(dstFile, finalContent, 'utf8');
}

function getTargetDirectory(uri: vscode.Uri): Promise<string> {
  return fs.stat(uri.fsPath).then(st => (st.isDirectory() ? uri.fsPath : path.dirname(uri.fsPath)));
}

function destFileName(templateFile: string, name: string): string {
  const base = (name || '').trim();
  switch (templateFile) {
    case 'apppage.dart':
      return `${base}_page.dart`;
    case 'viewmodel.dart':
      return `${base}_viewmodel.dart`;
    case 'route_lifecycle_state.dart':
      return `route_lifecycle_state.dart`;
    default:
      return `${base}_${templateFile}`;
  }
}

async function findGlobalSameName(fileName: string): Promise<string[]> {
  // 没有工作区则跳过全局查重
  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
    return [];
  }
  // 在整个工作区查找同名文件，忽略常见产物目录
  const uris = await vscode.workspace.findFiles(
    `**/${fileName}`,
    '**/{.git,node_modules,.dart_tool,build,out}/**',
    200
  );
  return uris.map(u => vscode.workspace.asRelativePath(u, false));
}

async function findGlobalConflicts(fileNames: string[]): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  for (const fn of fileNames) {
    const matches = await findGlobalSameName(fn);
    if (matches.length > 0) {
      result.set(fn, matches);
    }
  }
  return result;
}

export async function generateEasyRxmvvmTemplate(
  context: vscode.ExtensionContext,
  name: string,
  targetUri: vscode.Uri,
  selectedFiles: string[],
  options?: { routeBehavior?: 'none' | 'builtin' | 'external'; externalRoutePath?: string }
): Promise<void> {
  await ensureTemplatesFolder(context);
  const dstFolder = await getTargetDirectory(targetUri);

  const srcRoot = config.templatesFolderPath;
  // 覆盖检查：如有目标文件已存在则报错
  const collisions: string[] = [];
  for (const file of selectedFiles) {
    const outName = destFileName(file, name);
    const outPath = path.join(dstFolder, outName);
    // route_lifecycle_state 使用后续复用/后缀策略，这里跳过本地碰撞检查
    if (file !== 'route_lifecycle_state.dart' && (await exists(outPath))) {
      collisions.push(outName);
    }
  }
  if (collisions.length > 0) {
    throw new Error(`以下文件已存在：${collisions.join(', ')}`);
  }

  // 全局同名查重（在整个工作区内检查是否已有同名文件），受配置开关控制
  const cfg = vscode.workspace.getConfiguration('easyRxmvvm');
  const globalCheckEnabled = cfg.get<boolean>('globalDuplicateCheckEnabled', true);
  const routesOnly = cfg.get<boolean>('globalDuplicateCheckRoutesOnly', false);
  if (globalCheckEnabled && !routesOnly) {
    // 全局同名查重不针对 route_lifecycle_state（它将采用复用/后缀策略）
    let outNames = selectedFiles
      .map(f => destFileName(f, name))
      .filter(n => n !== 'route_lifecycle_state.dart');
    const globalConflicts = await findGlobalConflicts(outNames);
    if (globalConflicts.size > 0) {
      const msg = Array.from(globalConflicts.entries())
        .map(([fn, paths]) => `${fn}: ${paths.join(', ')}`)
        .join(' | ');
      throw new Error(`全局同名冲突，以下文件名在项目中已存在：${msg}`);
    }
  }

  // 处理路由生命周期注入逻辑
  const routeBehavior = options?.routeBehavior ?? (selectedFiles.includes('route_lifecycle_state.dart') ? 'builtin' : 'none');
  let routeImportLine = '';
  let baseStateClass = 'State';
  let useBuiltinRoute = false;
  let routeLifecycleOutName: string | undefined; // 若需要生成，可能携带后缀的新文件名

  async function computePackageImport(filePath: string): Promise<string | undefined> {
    try {
      // 向上查找最近的 pubspec.yaml
      let dir = path.dirname(filePath);
      let pubspecDir: string | undefined;
      while (true) {
        const candidate = path.join(dir, 'pubspec.yaml');
        if (await fs.stat(candidate).then(s => s.isFile()).catch(() => false)) {
          pubspecDir = dir;
          break;
        }
        const parent = path.dirname(dir);
        if (parent === dir) { break; }
        dir = parent;
      }
      if (!pubspecDir) { return undefined; }
      const libRoot = path.join(pubspecDir, 'lib');
      if (!(await fs.stat(libRoot).then(s => s.isDirectory()).catch(() => false))) { return undefined; }
      const rel = path.relative(libRoot, filePath);
      if (rel.startsWith('..')) { return undefined; }
      const pubspecContent = await fs.readFile(path.join(pubspecDir, 'pubspec.yaml'), 'utf8').catch(() => '');
      const m = pubspecContent.match(/\n?\s*name\s*:\s*([\w\-]+)/);
      const pkg = m && m[1] ? m[1] : undefined;
      if (!pkg) { return undefined; }
      const normalized = rel.split(path.sep).join('/');
      return `import 'package:${pkg}/${normalized}';`;
    } catch {
      return undefined;
    }
  }

  if (routeBehavior === 'builtin') {
    baseStateClass = 'AppPageLifecycleState';
    // 确保将模板加入生成
    if (!selectedFiles.includes('route_lifecycle_state.dart')) {
      selectedFiles.push('route_lifecycle_state.dart');
    }
  } else if (routeBehavior === 'external' && options?.externalRoutePath) {
    // 尝试解析用户文件中的类名；失败时回退到 AppPageLifecycleState 以保持生命周期模板
    try {
      const content = await fs.readFile(options.externalRoutePath, 'utf8');
      // 允许无泛型/有泛型，以及 with/implements 的情况
      const r1 = /class\s+(\w+)\s+extends\s+[^\n{]*\bRouteLifecycleState\b[^\n{]*/m;
      const r2 = /class\s+(\w+)\s+extends\s+[^\n{]*\bAppPageLifecycleState\b[^\n{]*/m;
      const m = content.match(r1) || content.match(r2);
      if (m && m[1]) {
        baseStateClass = m[1];
      } else {
        baseStateClass = 'AppPageLifecycleState';
      }
    } catch {
      baseStateClass = 'AppPageLifecycleState';
    }
    // 明确不生成 route_lifecycle_state 模板文件
    selectedFiles = selectedFiles.filter(f => f !== 'route_lifecycle_state.dart');
  }

  // 如果需要内置模板但未选择，补充生成
  if (useBuiltinRoute && !selectedFiles.includes('route_lifecycle_state.dart')) {
    selectedFiles.push('route_lifecycle_state.dart');
  }

  // 当需要内置路由生命周期支持时，执行“复用或后缀生成”策略并修正导入
  if (routeBehavior === 'builtin' || useBuiltinRoute) {
    // 先全局扫描是否存在同名文件
    let uris: vscode.Uri[] = [];
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      uris = await vscode.workspace.findFiles(
        '**/route_lifecycle_state*.dart',
        '**/{.git,node_modules,.dart_tool,build,out}/**',
        400
      );
    }

    // 优先复用当前目录下的文件（含后缀），其后再考虑全局其他位置
    let reusablePath: string | undefined;
    const localCandidates = uris.filter(u => path.dirname(u.fsPath) === dstFolder);
    const nonLocalCandidates = uris.filter(u => path.dirname(u.fsPath) !== dstFolder);
    for (const u of [...localCandidates, ...nonLocalCandidates]) {
      const cls = await findLifecycleClassNameInFile(u.fsPath);
      if (cls) {
        reusablePath = u.fsPath;
        break;
      }
    }

    if (reusablePath) {
      // 如果全局已有同名文件，检查是否有继承 RouteLifecycleState/AppPageLifecycleState 的类
      const className = await findLifecycleClassNameInFile(reusablePath);
      if (className) {
        baseStateClass = className;
        const pkgImport = await computePackageImport(reusablePath);
        if (pkgImport) {
          routeImportLine = pkgImport;
        } else {
          const rel = path.relative(dstFolder, reusablePath).split(path.sep).join('/');
          routeImportLine = `import '${rel}';`;
        }
        // 复用全局文件：不在本目录生成副本
        selectedFiles = selectedFiles.filter(f => f !== 'route_lifecycle_state.dart');
      } else {
        // 全局同名文件不符合需求：在本目录生成带后缀的新文件，并继承 AppPageLifecycleState
        const base = 'route_lifecycle_state';
        const defaultName = `${base}.dart`;
        const localExists = await exists(path.join(dstFolder, defaultName));
        // 强制生成带后缀的新文件
        let index = 2;
        let candidate = `${base}_${index}.dart`;
        while (await exists(path.join(dstFolder, candidate))) {
          index++;
          candidate = `${base}_${index}.dart`;
        }
        routeLifecycleOutName = candidate;
        const outPath = path.join(dstFolder, routeLifecycleOutName);
        const pkgImport = await computePackageImport(outPath);
        routeImportLine = pkgImport ?? `import '${routeLifecycleOutName}';`;
        baseStateClass = 'AppPageLifecycleState';
        if (!selectedFiles.includes('route_lifecycle_state.dart')) {
          selectedFiles.push('route_lifecycle_state.dart');
        }
      }
    } else {
      // 不可复用：若全局已存在同名，则在本目录生成带后缀的新文件；否则生成默认名
      const base = 'route_lifecycle_state';
      const defaultName = `${base}.dart`;
      const localExists = await exists(path.join(dstFolder, defaultName));
      const globalExists = uris.length > 0;
      if (globalExists || localExists) {
        let index = 2;
        let candidate = `${base}_${index}.dart`;
        while (await exists(path.join(dstFolder, candidate))) {
          index++;
          candidate = `${base}_${index}.dart`;
        }
        routeLifecycleOutName = candidate;
      } else {
        routeLifecycleOutName = defaultName;
      }
      const outPath = path.join(dstFolder, routeLifecycleOutName);
      const pkgImport = await computePackageImport(outPath);
      if (pkgImport) {
        routeImportLine = pkgImport;
      } else {
        routeImportLine = `import '${routeLifecycleOutName}';`;
      }
      if (!selectedFiles.includes('route_lifecycle_state.dart')) {
        selectedFiles.push('route_lifecycle_state.dart');
      }
      // 保持继承自内置基类
      baseStateClass = 'AppPageLifecycleState';
    }
  }

  // external 模式：若外部文件无法解析到生命周期类，则回退到与 builtin 一致的流程
  if (routeBehavior === 'external' && options?.externalRoutePath) {
    const className = await findLifecycleClassNameInFile(options.externalRoutePath);
    if (className) {
      baseStateClass = className;
      const pkgImport = await computePackageImport(options.externalRoutePath);
      routeImportLine = pkgImport ?? `import '${path.relative(dstFolder, options.externalRoutePath).split(path.sep).join('/')}';`;
      // 不生成内置文件
      selectedFiles = selectedFiles.filter(f => f !== 'route_lifecycle_state.dart');
    } else {
      // 回退到 builtin 的处理
      let uris: vscode.Uri[] = [];
      if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        uris = await vscode.workspace.findFiles(
          '**/route_lifecycle_state*.dart',
          '**/{.git,node_modules,.dart_tool,build,out}/**',
          400
        );
      }
      // 优先复用当前目录，其后全局
      let reusablePath: string | undefined;
      let classInReusable: string | undefined;
      const localCandidates = uris.filter(u => path.dirname(u.fsPath) === dstFolder);
      const nonLocalCandidates = uris.filter(u => path.dirname(u.fsPath) !== dstFolder);
      for (const u of [...localCandidates, ...nonLocalCandidates]) {
        const cls = await findLifecycleClassNameInFile(u.fsPath);
        if (cls) {
          reusablePath = u.fsPath;
          classInReusable = cls;
          break;
        }
      }
      if (reusablePath && classInReusable) {
        baseStateClass = classInReusable;
        const pkgImport = await computePackageImport(reusablePath);
        routeImportLine = pkgImport ?? `import '${path.relative(dstFolder, reusablePath).split(path.sep).join('/')}';`;
        selectedFiles = selectedFiles.filter(f => f !== 'route_lifecycle_state.dart');
      } else {
        // 生成带后缀的新文件
        const base = 'route_lifecycle_state';
        const defaultName = `${base}.dart`;
        const localExists = await exists(path.join(dstFolder, defaultName));
        let index = 2;
        let candidate = `${base}_${index}.dart`;
        while (await exists(path.join(dstFolder, candidate))) {
          index++;
          candidate = `${base}_${index}.dart`;
        }
        routeLifecycleOutName = candidate;
        const outPath = path.join(dstFolder, routeLifecycleOutName);
        const pkgImport = await computePackageImport(outPath);
        routeImportLine = pkgImport ?? `import '${routeLifecycleOutName}';`;
        baseStateClass = 'AppPageLifecycleState';
        if (!selectedFiles.includes('route_lifecycle_state.dart')) {
          selectedFiles.push('route_lifecycle_state.dart');
        }
      }
    }
  }

  for (const file of selectedFiles) {
    // 兼容模板文件后缀调整：统一将 .dart 模板映射到 .tpl 实际文件
    const actualTemplateFile =
      file === 'apppage.dart'
        ? 'apppage.dart.tpl'
        : file === 'viewmodel.dart'
          ? 'viewmodel.dart.tpl'
          : file === 'route_lifecycle_state.dart'
            ? 'route_lifecycle_state.dart.tpl'
            : file;
    const srcFile = path.join(srcRoot, actualTemplateFile);
    // 对 route_lifecycle_state 使用可能的后缀文件名
    const dstFile =
      file === 'route_lifecycle_state.dart' && routeLifecycleOutName
        ? path.join(dstFolder, routeLifecycleOutName)
        : path.join(dstFolder, destFileName(file, name));
    const srcStat = await fs.stat(srcFile).catch(() => undefined);
    if (!srcStat || !srcStat.isFile()) {
      throw new Error(`Template file not found: ${actualTemplateFile}`);
    }
    if (file === 'apppage.dart') {
      await writeFileWithNameTemplate(srcFile, dstFile, name, {
        $routeLifecycleImport: routeImportLine ? routeImportLine : '',
        $baseStateClass: baseStateClass,
      });
    } else {
      await writeFileWithNameTemplate(srcFile, dstFile, name);
    }
  }
}

export async function addRouteLifecycleStateFile(
  context: vscode.ExtensionContext,
  targetUri: vscode.Uri,
  outputFileName?: string
): Promise<void> {
  await ensureTemplatesFolder(context);
  const dstFolder = await getTargetDirectory(targetUri);
  const srcRoot = config.templatesFolderPath;
  // 兼容模板文件后缀调整：统一将 .dart 模板映射到 .tpl 实际文件
  const srcFile = path.join(srcRoot, 'route_lifecycle_state.dart.tpl');

  const name = (outputFileName || 'route_lifecycle_state.dart').trim();
  const outName = name.endsWith('.dart') ? name : `${name}.dart`;
  const outPath = path.join(dstFolder, outName);

  if (await exists(outPath)) {
    throw new Error(`文件已存在：${outName}`);
  }

  // 全局扫描：若存在同名文件，检查是否可复用；可复用则直接提示复用并不生成；不可复用则在目标目录生成带后缀的新文件
  const cfg = vscode.workspace.getConfiguration('easyRxmvvm');
  const globalCheckEnabled = cfg.get<boolean>('globalDuplicateCheckEnabled', true);
  if (globalCheckEnabled && vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    const uris = await vscode.workspace.findFiles(`**/${outName}`, '**/{.git,node_modules,.dart_tool,build,out}/**', 200);
    if (uris.length > 0) {
      // 判断是否可复用：文件中是否存在继承 State< 的类（如 AppPageLifecycleState、或其他基类）
      let reusablePath: string | undefined;
      for (const u of uris) {
        try {
          const content = await fs.readFile(u.fsPath, 'utf8');
          const m = content.match(/class\s+(\w+)\s+extends\s+[^\n]*State\s*</);
          if (m && m[1]) {
            reusablePath = u.fsPath;
            break;
          }
        } catch {
          // 读取失败则略过该候选
        }
      }

      if (reusablePath) {
    vscode.window.showInformationMessage(t(`检测到可复用的全局文件：${reusablePath}，已复用，无需生成新文件。`, `Detected reusable global file: ${reusablePath}. Reused, no new file generated.`));
        return;
      }

      // 不可复用：为目标名称增加后缀直到不冲突
      const base = outName.replace(/\.dart$/i, '');
      let index = 2;
      let candidate = `${base}_${index}.dart`;
      while (await exists(path.join(dstFolder, candidate))) {
        index++;
        candidate = `${base}_${index}.dart`;
      }
      const suffixedOutPath = path.join(dstFolder, candidate);
      const srcStat = await fs.stat(srcFile).catch(() => undefined);
      if (!srcStat || !srcStat.isFile()) {
        throw new Error('Template file not found: route_lifecycle_state.dart.tpl');
      }
      await writeFileWithNameTemplate(srcFile, suffixedOutPath, '');
    vscode.window.showInformationMessage(t(`全局同名文件不可复用，已生成新文件：${candidate}`, `Global file with the same name not reusable; generated new file: ${candidate}`));
      return;
    }
  }

  const srcStat = await fs.stat(srcFile).catch(() => undefined);
  if (!srcStat || !srcStat.isFile()) {
    throw new Error('Template file not found: route_lifecycle_state.dart.tpl');
  }
  await writeFileWithNameTemplate(srcFile, outPath, '');
}
  async function findLifecycleClassNameInFile(filePath: string): Promise<string | undefined> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      // 支持多行与复杂声明（泛型、with/implements），并允许类名后存在 <T extends ...> 等
      const r = /class\s+(\w+)[\s\S]*?\bextends\b[\s\S]*?\b(RouteLifecycleState|AppPageLifecycleState)\b[\s\S]*?/m;
      const m = content.match(r);
      return m && m[1] ? m[1] : undefined;
    } catch {
      return undefined;
    }
  }