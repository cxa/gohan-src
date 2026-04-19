#!/usr/bin/env node
// Set ios/*.xcodeproj/project.pbxproj CURRENT_PROJECT_VERSION to git commit count.
// Invoked from yifan.xcscheme Archive pre-action so TestFlight uploads always get
// a monotonically increasing build number without needing to bump MARKETING_VERSION.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PBXPROJ = path.join(ROOT, 'ios/yifan.xcodeproj/project.pbxproj');

const buildNumber = parseInt(
  execSync('git rev-list --count HEAD', { cwd: ROOT, encoding: 'utf8' }).trim(),
  10,
);

const content = fs.readFileSync(PBXPROJ, 'utf8');
const updated = content.replace(
  /CURRENT_PROJECT_VERSION = \d+;/g,
  `CURRENT_PROJECT_VERSION = ${buildNumber};`,
);

if (updated === content) {
  console.log(`iOS CURRENT_PROJECT_VERSION already ${buildNumber}`);
} else {
  fs.writeFileSync(PBXPROJ, updated, 'utf8');
  console.log(`iOS CURRENT_PROJECT_VERSION → ${buildNumber}`);
}
