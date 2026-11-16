import { rmSync } from 'node:fs';
import { join } from 'node:path';

for (const dir of ['dist', 'dist-electron', 'release']) {
  rmSync(join(process.cwd(), dir), {
    recursive: true,
    force: true
  });
}
