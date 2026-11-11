// Isolated JSX syntax/transformation smoke test only; does not build or deploy the application.
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
let rolldown;
try { ({ rolldown } = require('rolldown')); }
catch { ({ rolldown } = require('D:/AgentWorkspaces/engineering-network-v42-usability-remediation-20261102/node_modules/rolldown')); }
const root = fileURLToPath(new URL('../', import.meta.url));
for (const relative of ['src/pages/AtlasProjectsPage.jsx','src/App.jsx','src/components/common/Header.jsx']) {
  const bundle = await rolldown({
    input: join(root, relative),
    platform: 'browser',
    external: () => true,
    moduleTypes: { '.jsx': 'jsx' },
  });
  const out = await bundle.generate({ format: 'esm' });
  if (!out.output.some(x => x.type === 'chunk')) throw new Error('No output for ' + relative);
  await bundle.close();
  console.log('JSX_PARSE_PASS', relative);
}
