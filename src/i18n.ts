import * as vscode from 'vscode';

export function isZh(): boolean {
  const lang = (vscode.env.language || '').toLowerCase();
  return lang.startsWith('zh');
}

export function t(zh: string, en: string): string {
  return isZh() ? zh : en;
}