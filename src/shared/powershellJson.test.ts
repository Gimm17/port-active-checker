import { describe, expect, it } from 'vitest';
import { parsePowerShellJson, toArray } from './powershellJson';

describe('PowerShell JSON helpers', () => {
  it('parses empty stdout as null', () => {
    expect(parsePowerShellJson('')).toBeNull();
    expect(parsePowerShellJson('   ')).toBeNull();
  });

  it('wraps single object output into an array', () => {
    const parsed = parsePowerShellJson<{ LocalPort: number }>('{"LocalPort":3000}');

    expect(toArray(parsed)).toEqual([{ LocalPort: 3000 }]);
  });

  it('keeps array output as array', () => {
    const parsed = parsePowerShellJson<Array<{ LocalPort: number }>>('[{"LocalPort":3000},{"LocalPort":5173}]');

    expect(toArray(parsed)).toEqual([{ LocalPort: 3000 }, { LocalPort: 5173 }]);
  });
});
