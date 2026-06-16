'use strict';

// Build an isolated sandbox: a fresh global config dir and a fresh project root
// (with a .git marker so config.projectRoot anchors there, not on some real
// repo above the temp dir).

const fs = require('fs');
const os = require('os');
const path = require('path');

function sandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fpbase-'));
  const project = path.join(root, 'project');
  fs.mkdirSync(path.join(project, '.git'), { recursive: true });
  process.env.FLAREPOINT_CONFIG_HOME = path.join(root, 'global');
  return {
    start: project,
    cleanup() { fs.rmSync(root, { recursive: true, force: true }); },
  };
}

module.exports = { sandbox };
