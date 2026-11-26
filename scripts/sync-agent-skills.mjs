import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export function validateSkill(text, directoryName) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]+)$/);
  if (!match) throw new Error(`${directoryName}: missing YAML frontmatter or Markdown body`);
  // Our portable subset uses exactly the two shared fields; quoted descriptions
  // are JSON strings, which are valid YAML double-quoted scalars too.
  const fields = match[1].split(/\r?\n/);
  if (fields.length !== 2 || !fields[0].startsWith('name: ') || !fields[1].startsWith('description: ')) {
    throw new Error(`${directoryName}: expected name and description only`);
  }
  const name = fields[0].slice(6);
  const description = JSON.parse(fields[1].slice(13));
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || name.length > 64 || name !== directoryName) {
    throw new Error(`${directoryName}: invalid or mismatched skill name`);
  }
  if (typeof description !== 'string' || !description.trim() || description.length > 1024 || !description.includes('Use ')) {
    throw new Error(`${directoryName}: description must include a usage trigger and be at most 1024 characters`);
  }
  for (const section of ['## When to use', '## Required output']) {
    if (!match[2].includes(section)) throw new Error(`${directoryName}: missing ${section}`);
  }
}

export async function collectSkillFiles(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(resolve(directory, prefix), { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error(`Skill bundles must not contain symlinks: ${relative}`);
    if (entry.isDirectory()) result.push(...await collectSkillFiles(directory, relative));
    else if (entry.isFile()) result.push(relative);
    else throw new Error(`Unsupported skill asset: ${relative}`);
  }
  return result.sort();
}

export async function syncSkills(check = true, workspaceRoot = root) {
  const names = (await readdir(resolve(workspaceRoot, 'skills'), { withFileTypes: true }))
    .filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
  if (!names.length) throw new Error('No canonical skills found');
  let fileCount = 0;
  for (const name of names) {
    const source = resolve(workspaceRoot, 'skills', name);
    const files = await collectSkillFiles(source);
    const text = await readFile(resolve(source, 'SKILL.md'), 'utf8');
    validateSkill(text, name);
    for (const relative of files) {
      const bytes = await readFile(resolve(source, relative));
      fileCount++;
      for (const target of ['.agents/skills', '.claude/skills']) {
        const path = resolve(workspaceRoot, target, name, relative);
        if (check) {
          let actual;
          try { actual = await readFile(path); } catch { throw new Error(`Missing ${target}/${name}/${relative}; run npm run skills:sync`); }
          if (!actual.equals(bytes)) throw new Error(`Drift at ${target}/${name}/${relative}; run npm run skills:sync`);
        } else {
          await mkdir(dirname(path), { recursive: true });
          await writeFile(path, bytes);
        }
      }
    }
  }
  console.log(`${check ? 'Verified' : 'Synced'} ${names.length} portable skill bundles (${fileCount} source files) for Codex and Claude Code`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && !['--check', '--write'].includes(args[0]))) {
    throw new Error(`Usage: node ${basename(process.argv[1])} [--check|--write]`);
  }
  await syncSkills(args[0] !== '--write');
}
