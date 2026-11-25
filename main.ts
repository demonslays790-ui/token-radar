// Token Radar entrypoint (Node 22, standard library only).
//
// Reads the sealed snapshot, builds the ranked board with lib/model.ts, and writes the
// graded artifact into the output directory: board.json, data.js for the dashboard,
// dashboard/ and screenshots/ copied from this repository, and dossier.json written
// last with the vendored make.fun library, byte for byte as the scorer rebuilds it.
//
//   node main.ts --help
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json|dir>
//
// In the grader's container the input is /input/snapshot.json and the output /output.

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardIssue, buildRadar, dataScript, parseSnapshot } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

const here = fileURLToPath(new URL('.', import.meta.url));

const USAGE = `token radar: build the token launch radar from the sealed snapshot

usage:
  node main.ts [--input <snapshot.json|directory>] [--output <directory>]

  --input    the sealed snapshot file, or a directory holding snapshot.json
             (default: /input, the grader's mount)
  --output   where board.json, data.js, dashboard/, screenshots/ and
             dossier.json are written (default: $MAKEFUN_OUTPUT_DIR or /output)
  --help     this text
`;

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  process.stdout.write(USAGE);
  process.exit(0);
}

/** --name <value> out of the arguments, or the fallback. */
function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  if (at >= 0 && at + 1 < process.argv.length) return process.argv[at + 1]!;
  const withEquals = process.argv.find((a) => a.startsWith(`--${name}=`));
  return withEquals === undefined ? fallback : withEquals.slice(name.length + 3);
}

const inputArg = arg('input', '/input');
const inputFile = inputArg.endsWith('.json') ? inputArg : join(inputArg, 'snapshot.json');
if (!existsSync(inputFile)) {
  process.stderr.write(`token radar: no snapshot at ${inputFile}: pass --input <snapshot.json|directory> or mount the sealed /input\n`);
  process.exit(2);
}
const out = arg('output', process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

const snapshot = parseSnapshot(readFileSync(inputFile, 'utf8'));
const { board, radar } = buildRadar(snapshot);
const issue = boardIssue(board, snapshot);
if (issue !== null) {
  process.stderr.write(`token radar: the model wrote a board the gate refuses: ${issue}\n`);
  process.exit(1);
}

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'board.json'), `${JSON.stringify({ rows: board })}\n`);
writeFileSync(join(out, 'data.js'), dataScript(radar));

/** Copy a directory tree of regular files into `to`, skipping dot-names the gate refuses. */
function copyTree(from: string, to: string): string[] {
  if (!existsSync(from)) return [];
  mkdirSync(to, { recursive: true });
  const copied: string[] = [];
  for (const name of readdirSync(from)) {
    if (name.startsWith('.')) continue;
    const src = join(from, name);
    const dst = join(to, name);
    if (statSync(src).isDirectory()) copied.push(...copyTree(src, dst));
    else if (statSync(src).isFile()) {
      copyFileSync(src, dst);
      copied.push(name);
    }
  }
  return copied;
}

const dashFiles = copyTree(join(here, 'dashboard'), join(out, 'dashboard'));
const shots = copyTree(join(here, 'screenshots'), join(out, 'screenshots'));
if (shots.length < 3) {
  process.stderr.write(`token radar: screenshots/ holds ${shots.length} image(s): hand in 3, the board, a detail view and a filtered view\n`);
  process.exit(1);
}

// The dossier is written last: the scorer rebuilds it from this output and compares bytes.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 65_536,
    screenshots: { max: 4, max_bytes: 524_288 },
    dashboard: { max_files: 400, max_bytes: 4_194_304 },
  }),
);

process.stdout.write(
  `token radar: ${snapshot.protocols.length} protocols, ${snapshot.watchlist.length} on the watchlist, ` +
    `${board.length} rows scored (${radar.summary.early} early finds, ${radar.summary.live} live set aside)\n` +
    `token radar: wrote board.json, data.js, dashboard/ (${dashFiles.length} files), screenshots/ (${shots.length} images) and dossier.json to ${out}\n`,
);
