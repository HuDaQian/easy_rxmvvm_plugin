import * as path from 'path';
import * as os from 'os';
// 运行时从编译后的 out/ 目录相对读取 package.json
// 保持与示例扩展一致的版本化模板路径策略
// eslint-disable-next-line @typescript-eslint/no-var-requires
const json = require('../package.json');

export class Config {
  public get templatesFolderPath(): string {
    return path.join(os.homedir(), `.vscode${path.sep}easy-rxmvvm-templates_${json.version}`);
  }

  public get backupsRootPath(): string {
    return path.join(os.homedir(), `.vscode${path.sep}easy-rxmvvm-templates_backups`);
  }

  public get version(): string {
    return json.version as string;
  }
}

export default new Config();