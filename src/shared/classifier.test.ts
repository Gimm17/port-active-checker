import { describe, expect, it } from 'vitest';
import { classifyProcess } from './classifier';
import type { ProcessInfo } from './types';

function process(overrides: Partial<ProcessInfo>): ProcessInfo {
  return {
    pid: 1234,
    name: 'node.exe',
    executablePath: 'C:\\Program Files\\nodejs\\node.exe',
    commandLine: 'node server.js',
    ...overrides
  };
}

describe('classifyProcess', () => {
  it('marks Windows system process as protected', () => {
    const result = classifyProcess(process({ pid: 4, name: 'System', executablePath: null, commandLine: null }));

    expect(result.category).toBe('system-protected');
    expect(result.canTerminate).toBe(false);
    expect(result.risk).toBe('blocked');
  });

  it('detects local Node project servers', () => {
    const result = classifyProcess(
      process({
        name: 'node.exe',
        commandLine: 'node C:\\Users\\HP\\Project\\node_modules\\vite\\bin\\vite.js --host 127.0.0.1'
      })
    );

    expect(result.category).toBe('local-project');
    expect(result.canTerminate).toBe(true);
    expect(result.projectHint).toBe('C:\\Users\\HP\\Project');
  });

  it('detects Laravel local server', () => {
    const result = classifyProcess(
      process({
        name: 'php.exe',
        executablePath: 'C:\\xampp\\php\\php.exe',
        commandLine:
          'C:\\xampp\\php\\php.exe -S 127.0.0.1:8080 C:\\Users\\HP\\Laravel\\Mekarku\\vendor\\laravel\\framework\\src\\server.php'
      })
    );

    expect(result.category).toBe('local-project');
    expect(result.projectHint).toBe('C:\\Users\\HP\\Laravel\\Mekarku');
  });

  it('detects database services', () => {
    const result = classifyProcess(process({ name: 'mysqld.exe', commandLine: null, executablePath: null }));

    expect(result.category).toBe('dev-service');
    expect(result.risk).toBe('guarded');
  });

  it('classifies unknown processes with extra warning', () => {
    const result = classifyProcess(process({ name: 'custom-daemon.exe', commandLine: null, executablePath: null }));

    expect(result.category).toBe('unknown');
    expect(result.risk).toBe('danger');
    expect(result.canTerminate).toBe(true);
  });
});
