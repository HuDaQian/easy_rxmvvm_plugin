import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { openTemplatesFolder, getCurrentPossibleUri, generateEasyRxmvvmTemplate, resetTemplatesFolder, backupTemplatesFolder, listTemplateBackups, restoreTemplatesFromBackup, backupAndResetTemplates, addRouteLifecycleStateFile } from './util';
import { t } from './i18n';

export function activate(context: vscode.ExtensionContext) {
  // helloWorld 命令已移除

  const openTemplatesCmd = vscode.commands.registerCommand(
    'easy-rxmvvm-plugin.openTemplatesFolder',
    async () => {
      try {
        await openTemplatesFolder(context);
      } catch (error: any) {
        vscode.window.showErrorMessage(t(`Easy RxMVVM：${error?.message ?? String(error)}`, `Easy RxMVVM: ${error?.message ?? String(error)}`));
      }
    }
  );
  context.subscriptions.push(openTemplatesCmd);

  const setDefaultExternalRoutePathCmd = vscode.commands.registerCommand(
    'easy-rxmvvm-plugin.setDefaultExternalRoutePath',
    async () => {
      try {
        const files = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          filters: { Dart: ['dart'] },
          title: t('选择默认的 route_lifecycle_state 文件', 'Select default route_lifecycle_state file')
        });
        if (!files || files.length === 0) { return; }

        const p = files[0].fsPath;
        const cfg = vscode.workspace.getConfiguration('easyRxmvvm');
        await cfg.update('defaultExternalRoutePath', p, vscode.ConfigurationTarget.Global);
        await cfg.update('defaultRouteBehavior', 'external', vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(t('已设置默认外部路由生命周期文件路径，并将默认行为切换为 external', 'Default external route lifecycle file set and behavior switched to external'));
      } catch (error: any) {
        vscode.window.showErrorMessage(t(`设置失败：${error?.message ?? String(error)}` , `Setup failed: ${error?.message ?? String(error)}`));
      }
    }
  );
  context.subscriptions.push(setDefaultExternalRoutePathCmd);

  const quickSetDefaultRouteBehaviorCmd = vscode.commands.registerCommand(
    'easy-rxmvvm-plugin.quickSetDefaultRouteBehavior',
    async () => {
      try {
        const cfg = vscode.workspace.getConfiguration('easyRxmvvm');
        const current = cfg.get<'ask' | 'none' | 'builtin' | 'external'>('defaultRouteBehavior', 'ask');
        const pick = await vscode.window.showQuickPick(
          [
            { label: t('每次询问（ask）', 'Ask every time (ask)'), value: 'ask' },
            { label: t('不开启（none）', 'No lifecycle (none)'), value: 'none' },
            { label: t('使用内置（builtin）', 'Use built-in (builtin)'), value: 'builtin' },
            { label: t('关联外部（external）', 'Link external (external)'), value: 'external' },
          ],
          { canPickMany: false, placeHolder: t('选择默认路由生命周期行为', 'Choose default route lifecycle behavior'), ignoreFocusOut: true }
        );
        if (!pick?.value) { return; }
        if (pick.value === 'external') {
          const files = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: { Dart: ['dart'] },
            title: t('选择默认的 route_lifecycle_state 文件', 'Select default route_lifecycle_state file')
          });
          if (!files || files.length === 0) {
            vscode.window.showWarningMessage(t('已取消设置为 external（未选择文件）', 'Cancelled setting to external (no file selected)'));
            return;
          }
          const p = files[0].fsPath;
          await cfg.update('defaultExternalRoutePath', p, vscode.ConfigurationTarget.Global);
          await cfg.update('defaultRouteBehavior', 'external', vscode.ConfigurationTarget.Global);
          vscode.window.showInformationMessage(t('已设置默认行为为 external，并更新默认外部路由文件路径', 'Default behavior set to external and default external route file updated'));
        } else {
          await cfg.update('defaultRouteBehavior', pick.value, vscode.ConfigurationTarget.Global);
          vscode.window.showInformationMessage(t(`已设置默认行为为：${pick.value}`, `Default behavior set to: ${pick.value}`));
        }
      } catch (error: any) {
        vscode.window.showErrorMessage(t(`设置失败：${error?.message ?? String(error)}`, `Setup failed: ${error?.message ?? String(error)}`));
      }
    }
  );
  context.subscriptions.push(quickSetDefaultRouteBehaviorCmd);

  const generateTemplateCmd = vscode.commands.registerCommand(
    'easy-rxmvvm-plugin.generateTemplate',
    async (uri?: vscode.Uri) => {
      try {
        let targetUri = getCurrentPossibleUri(uri);
        if (!targetUri) {
          vscode.window.showWarningMessage(t('请先打开工作区或文件所在路径', 'Please open a workspace or file path first'));
          return;
        }

        const name = await vscode.window.showInputBox({
          title: t('输入名称以生成文件', 'Enter a name to generate files'),
          placeHolder: t('支持大驼峰、小驼峰或下划线，例如：HomePage、homePage 或 home_detail', 'Supports PascalCase, camelCase or snake_case, e.g., HomePage, homePage, home_detail'),
          ignoreFocusOut: true,
          validateInput: async (text: string) => {
            if (!text || !text.trim()) {
              return t('名称不能为空', 'Name cannot be empty');
            }
            return null;
          },
        });
        if (!name) { return; }

        // 跳过模板选择步骤：始终生成 Page 和 ViewModel
        const selectedFiles = ['apppage.dart', 'viewmodel.dart'];

        // 路由生命周期注入选择（当包含 Page 时才有意义）。支持配置默认行为：ask/none/builtin/external
        const cfg = vscode.workspace.getConfiguration('easyRxmvvm');
        const defaultRouteBehavior = cfg.get<'ask' | 'none' | 'builtin' | 'external'>('defaultRouteBehavior', 'ask');
        let routeBehavior: 'none' | 'builtin' | 'external' = selectedFiles.includes('route_lifecycle_state.dart') ? 'builtin' : 'none';
        let externalRoutePath: string | undefined;
        const shouldAsk = defaultRouteBehavior === 'ask';
        if (selectedFiles.includes('apppage.dart') && !selectedFiles.includes('route_lifecycle_state.dart')) {
          if (shouldAsk) {
            const rb = await vscode.window.showQuickPick(
              [
                { label: t('不添加路由生命周期（默认）', 'Do not add route lifecycle (default)'), value: 'none' },
                { label: t('使用内置模板（route_lifecycle_state.dart）', 'Use built-in template (route_lifecycle_state.dart)'), value: 'builtin' },
                { label: t('选择已有路由生命周期文件（不同名的继承RouteLifecycleState的类的文件）', 'Use existing lifecycle file (class extending RouteLifecycleState)'), value: 'external' },
              ],
              { canPickMany: false, placeHolder: t('为 Page 选择路由生命周期支持', 'Choose route lifecycle support for Page'), ignoreFocusOut: true }
            );
            if (rb && rb.value) {
              routeBehavior = rb.value as any;
              if (routeBehavior === 'external') {
                const files = await vscode.window.showOpenDialog({
                  canSelectFiles: true,
                  canSelectFolders: false,
                  canSelectMany: false,
                  filters: { Dart: ['dart'] },
                  title: t('选择已有 route_lifecycle_state 文件', 'Select existing route_lifecycle_state file')
                });
                if (files && files.length > 0) {
                  externalRoutePath = files[0].fsPath;
                } else {
                  routeBehavior = 'none';
                }
              }
            }
          } else {
            routeBehavior = defaultRouteBehavior === 'external' ? 'external' : (defaultRouteBehavior as any);
            if (defaultRouteBehavior === 'external') {
              const cfgPath = (cfg.get<string>('defaultExternalRoutePath', '') || '').trim();
              const tryPaths: string[] = [];
              if (cfgPath) {
                // 优先使用绝对路径
                if (path.isAbsolute(cfgPath)) {
                  tryPaths.push(cfgPath);
                } else {
                  // 工作区根相对
                  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                  if (root) {
                    tryPaths.push(path.resolve(root, cfgPath));
                  }
                  // 目标目录相对（右键所在路径）
                  if (targetUri) {
                    tryPaths.push(path.resolve(targetUri.fsPath, cfgPath));
                    tryPaths.push(path.resolve(path.dirname(targetUri.fsPath), cfgPath));
                  }
                }
              }

              externalRoutePath = tryPaths.find(p => p && fs.existsSync(p));
              if (!externalRoutePath) {
                const files = await vscode.window.showOpenDialog({
                  canSelectFiles: true,
                  canSelectFolders: false,
                  canSelectMany: false,
                  filters: { Dart: ['dart'] },
                  title: '选择已有 route_lifecycle_state 文件'
                });
                if (files && files.length > 0) {
                  externalRoutePath = files[0].fsPath;
                } else {
                  routeBehavior = 'none';
                }
              }
            }
          }
        }

        await generateEasyRxmvvmTemplate(context, name.trim(), targetUri!, selectedFiles, { routeBehavior, externalRoutePath });
        const baseMsgZh = `已在目标目录生成 Page 和 ViewModel（名称：${name.trim()}）`;
        const baseMsgEn = `Generated Page and ViewModel in target directory (name: ${name.trim()})`;
        const baseMsg = t(baseMsgZh, baseMsgEn);
        if (routeBehavior === 'builtin') {
          vscode.window.showInformationMessage(t(`${baseMsg}，并配置路由生命周期（复用或生成新文件）`, `${baseMsg}; configured route lifecycle (reuse or generate new file)`));
        } else if (routeBehavior === 'external') {
          vscode.window.showInformationMessage(t(`${baseMsg}，并关联外部路由生命周期文件`, `${baseMsg}; linked external route lifecycle file`));
        } else {
          vscode.window.showInformationMessage(baseMsg);
        }
      } catch (error: any) {
        vscode.window.showErrorMessage(t(`生成失败：${error?.message ?? String(error)}`, `Generation failed: ${error?.message ?? String(error)}`));
      }
    }
  );
  context.subscriptions.push(generateTemplateCmd);

  const addRouteLifecycleStateCmd = vscode.commands.registerCommand(
    'easy-rxmvvm-plugin.addRouteLifecycleState',
    async (uri?: vscode.Uri) => {
      try {
        const targetUri = getCurrentPossibleUri(uri);
        if (!targetUri) {
          vscode.window.showWarningMessage(t('请先打开工作区或文件所在路径', 'Please open a workspace or file path first'));
          return;
        }

        const filename = await vscode.window.showInputBox({
          title: '添加 Route Lifecycle State 文件',
          placeHolder: '输入文件名，默认 route_lifecycle_state.dart（可修改）',
          value: 'route_lifecycle_state.dart',
          ignoreFocusOut: true,
          validateInput: async (text: string) => {
            if (!text || !text.trim()) {
              return '文件名不能为空';
            }
            return null;
          },
        });
        if (!filename) { return; }

        await addRouteLifecycleStateFile(context, targetUri, filename.trim());
        vscode.window.showInformationMessage(t(`已添加 ${filename.trim()} 至目标目录`, `Added ${filename.trim()} to target directory`));
      } catch (error: any) {
        vscode.window.showErrorMessage(t(`添加失败：${error?.message ?? String(error)}`, `Add failed: ${error?.message ?? String(error)}`));
      }
    }
  );
  context.subscriptions.push(addRouteLifecycleStateCmd);

  const toggleGlobalDuplicateCheckCmd = vscode.commands.registerCommand(
    'easy-rxmvvm-plugin.toggleGlobalDuplicateCheck',
    async () => {
      try {
        const cfg = vscode.workspace.getConfiguration('easyRxmvvm');
        const current = cfg.get<boolean>('globalDuplicateCheckEnabled', true);
        const next = !current;
        await cfg.update('globalDuplicateCheckEnabled', next, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(t(`全局同名查重已${next ? '开启' : '关闭'}`, `Global duplicate check is ${next ? 'ON' : 'OFF'}`));
      } catch (error: any) {
        vscode.window.showErrorMessage(t(`切换失败：${error?.message ?? String(error)}`, `Toggle failed: ${error?.message ?? String(error)}`));
      }
    }
  );
  context.subscriptions.push(toggleGlobalDuplicateCheckCmd);

  const resetTemplatesCmd = vscode.commands.registerCommand(
    'easy-rxmvvm-plugin.resetTemplates',
    async () => {
      const btnContinue = t('继续', 'Continue');
      const choice = await vscode.window.showWarningMessage(
        t('这将删除缓存模板并恢复为扩展内置的原始模板，是否继续？', 'This will delete cached templates and restore built-in originals. Continue?'),
        { modal: true },
        btnContinue
      );
      if (choice !== btnContinue) {
        return;
      }
      try {
        await resetTemplatesFolder(context);
        vscode.window.showInformationMessage(t('已恢复原始模板（缓存目录已重置）。', 'Restored original templates (cache directory reset).'));
      } catch (error: any) {
        vscode.window.showErrorMessage(t(`恢复失败：${error?.message ?? String(error)}`, `Restore failed: ${error?.message ?? String(error)}`));
      }
    }
  );
  context.subscriptions.push(resetTemplatesCmd);

  const backupAndResetCmd = vscode.commands.registerCommand(
    'easy-rxmvvm-plugin.backupAndResetTemplates',
    async () => {
      const btnContinue2 = t('继续', 'Continue');
      const choice = await vscode.window.showWarningMessage(
        t('将先备份当前缓存模板，再恢复为扩展原始模板。是否继续？', 'Back up current cached templates, then restore built-in templates. Continue?'),
        { modal: true },
        btnContinue2
      );
      if (choice !== btnContinue2) { return; }
      try {
        const snapshot = await backupAndResetTemplates(context);
        if (snapshot) {
          vscode.window.showInformationMessage(t(`已备份至：${snapshot}，并恢复为原始模板。`, `Backed up to: ${snapshot}, and restored to original templates.`));
        } else {
          vscode.window.showInformationMessage(t('当前无缓存模板可备份，已恢复为原始模板。', 'No cached templates to back up; restored to original templates.'));
        }
      } catch (error: any) {
        vscode.window.showErrorMessage(t(`操作失败：${error?.message ?? String(error)}`, `Operation failed: ${error?.message ?? String(error)}`));
      }
    }
  );
  context.subscriptions.push(backupAndResetCmd);

  const restoreFromBackupCmd = vscode.commands.registerCommand(
    'easy-rxmvvm-plugin.restoreTemplatesFromBackup',
    async () => {
      try {
        const backups = await listTemplateBackups();
        if (backups.length === 0) {
          vscode.window.showWarningMessage(t('未找到任何备份快照。', 'No backup snapshots found.'));
          return;
        }
        const items = backups.map(b => ({ label: b.name, description: new Date(b.mtime).toLocaleString(), b }));
        const picked = await vscode.window.showQuickPick(items, { placeHolder: t('选择要恢复的备份快照', 'Select a backup snapshot to restore'), ignoreFocusOut: true });
        if (!picked) { return; }
        await restoreTemplatesFromBackup(context, picked.b.path);
        vscode.window.showInformationMessage(t(`已从备份恢复：${picked.label}`, `Restored from backup: ${picked.label}`));
      } catch (error: any) {
        vscode.window.showErrorMessage(t(`恢复失败：${error?.message ?? String(error)}`, `Restore failed: ${error?.message ?? String(error)}`));
      }
    }
  );
  context.subscriptions.push(restoreFromBackupCmd);
}

export function deactivate() { }