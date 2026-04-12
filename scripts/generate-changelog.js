#!/usr/bin/env node
// Usage: node scripts/generate-changelog.js [--from <tag>] [--to <ref>]
// Generates user-facing changelog from conventional commits.
// Filters out infrastructure-only changes.
// Writes to .changelog/zh-Hans.txt and .changelog/en.txt.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

function getPreviousTag() {
  try {
    const tags = execSync('git tag --sort=-version:refname', { cwd: ROOT, encoding: 'utf8' })
      .trim().split('\n').filter(Boolean);
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const currentTag = `v${pkg.version}`;
    for (const tag of tags) {
      if (tag !== currentTag) return tag;
    }
  } catch { /* fallback */ }
  return null;
}

const fromTag = arg('from') || getPreviousTag();
const toRef = arg('to') || 'HEAD';

if (!fromTag) {
  console.error('Could not determine previous version tag. Use --from <tag>.');
  process.exit(1);
}

console.error(`Changelog: ${fromTag}..${toRef}\n`);

// Get commits with hashes
const log = execSync(
  `git log ${fromTag}..${toRef} --no-merges --format="%H %s"`,
  { cwd: ROOT, encoding: 'utf8' },
).trim();

if (!log) {
  console.error('No commits found.');
  writeDefaults();
  process.exit(0);
}

const commits = log.split('\n');

// Skip these commit types entirely
const SKIP_TYPES = new Set(['chore', 'ci', 'build', 'test', 'docs', 'style', 'refactor']);

// Paths that are infrastructure-only (not user-facing even if typed feat/fix)
const INFRA_PATTERNS = [
  /^\.github\//,
  /^scripts\//,
  /^\.changelog\//,
  /^\.husky\//,
  /^\.eslint/,
  /^tsconfig/,
  /^\.prettier/,
];

// Files that are build/release mechanics, not user-facing
const BUILD_ONLY_FILES = new Set([
  'package.json',
  'package-lock.json',
  'ios/yifan.xcodeproj/project.pbxproj',
  'android/app/build.gradle',
]);

function isInfraOnly(hash) {
  const files = execSync(`git diff-tree --no-commit-id --name-only -r ${hash}`, {
    cwd: ROOT, encoding: 'utf8',
  }).trim().split('\n').filter(Boolean);
  if (files.length === 0) return false;
  return files.every(f =>
    INFRA_PATTERNS.some(p => p.test(f)) || BUILD_ONLY_FILES.has(f),
  );
}

const features = [];
const fixes = [];

for (const line of commits) {
  const spaceIdx = line.indexOf(' ');
  const hash = line.slice(0, spaceIdx);
  const msg = line.slice(spaceIdx + 1);
  const match = msg.match(/^(\w+)(?:\((.+?)\))?!?:\s+(.+?)(?:\s*\(#\d+\))?$/);
  if (!match) continue;
  const [, type, , description] = match;
  if (SKIP_TYPES.has(type)) continue;
  if (isInfraOnly(hash)) continue;

  if (type === 'feat') {
    features.push(description);
  } else if (type === 'fix' || type === 'perf') {
    fixes.push(description);
  }
}

if (features.length === 0 && fixes.length === 0) {
  console.error('No user-facing changes found.');
  writeDefaults();
  process.exit(0);
}

// Build English changelog
const enLines = [];
for (const desc of features) enLines.push(`• ${desc}`);
for (const desc of fixes) enLines.push(`• ${desc}`);
const enText = enLines.join('\n');

// Build zh-Hans changelog (same descriptions — commit messages are the source of truth;
// manual editing of .changelog/zh-Hans.txt is expected before publishing to App Store)
const zhLines = [];
for (const desc of features) zhLines.push(`• ${desc}`);
for (const desc of fixes) zhLines.push(`• ${desc}`);
const zhText = zhLines.join('\n');

writeChangelogs(zhText, enText);

console.log(`zh-Hans:\n${zhText}\n`);
console.log(`en:\n${enText}\n`);
console.error('Edit .changelog/zh-Hans.txt to write Chinese release notes before publishing.');

function writeDefaults() {
  writeChangelogs('日常更新与问题修复。', 'Routine updates and bug fixes.');
  console.log('zh-Hans: 日常更新与问题修复。');
  console.log('en: Routine updates and bug fixes.');
}

function writeChangelogs(zh, en) {
  const outDir = path.join(ROOT, '.changelog');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'zh-Hans.txt'), zh + '\n');
  fs.writeFileSync(path.join(outDir, 'en.txt'), en + '\n');
}
