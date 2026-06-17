'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const recap = require('../hooks/recap');
const session = require('../hooks/_session');

// --- tool classification ---------------------------------------------------

test('classifyTool buckets edits, reads, and commands; ignores the rest', () => {
  assert.equal(recap.classifyTool('Edit'), 'edit');
  assert.equal(recap.classifyTool('Write'), 'edit');
  assert.equal(recap.classifyTool('NotebookEdit'), 'edit');
  assert.equal(recap.classifyTool('Read'), 'read');
  assert.equal(recap.classifyTool('Bash'), 'command');
  assert.equal(recap.classifyTool('Glob'), null);
  assert.equal(recap.classifyTool(''), null);
});

// --- recap rendering -------------------------------------------------------

const activity = {
  intent: 'Fix the login bug',
  lastPrompt: 'now add tests',
  turns: 2,
  edited: ['src/auth/login.js', 'src/auth/login.js', 'b.test.js'],
  read: ['src/auth/login.js'],
  commands: ['npm test', 'git add .', 'git commit -m wip'],
};

test('buildRecap renders where-you-left-off and steps-ahead, de-dups files', () => {
  const out = recap.buildRecap(activity);
  assert.match(out, /Resuming your last session \(2 turns\)/);
  assert.match(out, /Where you left off:/);
  assert.match(out, /Goal: "Fix the login bug"/);
  assert.match(out, /Files changed: `auth\/login\.js`, `b\.test\.js`/); // shortened + de-duped
  assert.match(out, /Recent commands:.*`git commit -m wip`/);
  assert.match(out, /Steps ahead:/);
  assert.match(out, /Continue from your last request: "now add tests"/); // fallback anchor
  assert.doesNotMatch(out, /Files read/); // concise mode omits reads
});

test('buildRecap verbose adds files read', () => {
  const out = recap.buildRecap(activity, { verbose: true });
  assert.match(out, /Files read: `auth\/login\.js`/);
});

test('extractNextSteps pulls offers, todos, and questions from the final message', () => {
  const text = [
    'I updated the parser and ran the tests, all green.',
    '- TODO: wire up the CLI flag',
    'Want me to update the README too?',
    'Just a closing status line.',
  ].join('\n');
  const steps = recap.extractNextSteps(text);
  assert.equal(steps.length, 2);
  assert.match(steps[0], /wire up the CLI flag/);
  assert.match(steps[1], /update the README too\?/);
});

test('buildRecap surfaces the model\'s own next steps over the fallback', () => {
  const out = recap.buildRecap({ ...activity, lastAssistant: 'Want me to add tests for the gate?' });
  assert.match(out, /Steps ahead:/);
  assert.match(out, /Want me to add tests for the gate\?/);
  assert.doesNotMatch(out, /Continue from your last request/);
});

test('buildRecap returns empty when there is nothing worth remembering', () => {
  assert.equal(recap.buildRecap(null), '');
  assert.equal(recap.buildRecap({ intent: '', edited: [], commands: [], turns: 0 }), '');
});

// --- the surface gate ------------------------------------------------------

test('shouldSurface shows a prior recap once, in a new session only', () => {
  const base = { hasRecap: true, sessionId: 'S2', recapSession: 'S1', shownSession: '' };
  assert.equal(recap.shouldSurface(base), true);
  assert.equal(recap.shouldSurface({ ...base, hasRecap: false }), false); // nothing stored
  assert.equal(recap.shouldSurface({ ...base, sessionId: '' }), false); // unknown session
  assert.equal(recap.shouldSurface({ ...base, recapSession: 'S2' }), false); // recap is this session
  assert.equal(recap.shouldSurface({ ...base, shownSession: 'S2' }), false); // already shown
});

// --- transcript reading ----------------------------------------------------

function writeTranscript(dir, entries) {
  const file = path.join(dir, 'transcript.jsonl');
  fs.writeFileSync(file, entries.map((e) => JSON.stringify(e)).join('\n') + '\n');
  return file;
}

test('extractActivity accumulates intent, files, and commands across the session', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fpr-tx-'));
  const file = writeTranscript(dir, [
    { type: 'user', message: { role: 'user', content: 'Fix the login bug' } },
    {
      type: 'assistant',
      message: {
        role: 'assistant',
        content: [
          { type: 'text', text: 'on it' },
          { type: 'tool_use', name: 'Read', input: { file_path: 'a.js' } },
          { type: 'tool_use', name: 'Edit', input: { file_path: 'a.js' } },
          { type: 'tool_use', name: 'Bash', input: { command: 'npm test' } },
        ],
      },
    },
    // a tool_result-only user entry is NOT a human turn
    { type: 'user', message: { role: 'user', content: [{ type: 'tool_result', content: 'ok' }] } },
    { type: 'user', message: { role: 'user', content: [{ type: 'text', text: 'now add tests' }] } },
    {
      type: 'assistant',
      message: {
        role: 'assistant',
        content: [{ type: 'tool_use', name: 'Write', input: { file_path: 'b.test.js' } }],
      },
    },
  ]);
  const a = session.extractActivity(file);
  assert.equal(a.intent, 'Fix the login bug');
  assert.equal(a.lastPrompt, 'now add tests');
  assert.equal(a.turns, 2);
  assert.deepEqual(a.edited, ['a.js', 'b.test.js']);
  assert.deepEqual(a.read, ['a.js']);
  assert.deepEqual(a.commands, ['npm test']);
  assert.equal(a.lastAssistant, 'on it'); // final assistant prose, for steps-ahead
  fs.rmSync(dir, { recursive: true, force: true });
  assert.equal(session.extractActivity('/no/such/file'), null);
});

// --- cli -------------------------------------------------------------------

function withProject(fn) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'fpr-home-'));
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'fpr-proj-'));
  const prevHome = process.env.FLAREPOINT_CONFIG_HOME;
  const prevCwd = process.cwd();
  process.env.FLAREPOINT_CONFIG_HOME = home;
  fs.mkdirSync(path.join(project, '.git'), { recursive: true });
  process.chdir(project);
  delete require.cache[require.resolve('../hooks/cli')];
  const cli = require('../hooks/cli');
  try {
    fn(cli, project);
  } finally {
    process.chdir(prevCwd);
    if (prevHome === undefined) delete process.env.FLAREPOINT_CONFIG_HOME;
    else process.env.FLAREPOINT_CONFIG_HOME = prevHome;
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(project, { recursive: true, force: true });
  }
}

test('cli switches mode, reports, and shows the stored recap', () => {
  withProject((cli) => {
    assert.equal(cli.run('status'), 'fp-recap: on'); // default
    assert.equal(cli.run('verbose'), 'fp-recap: verbose');
    assert.equal(cli.run('off'), 'fp-recap: off');
    assert.equal(cli.run('on'), 'fp-recap: on');
    assert.match(cli.run('show'), /no recap stored/);
    recap.saveRecap('Picking up from your last session (1 turn):\n- Started with: "x"', 'S1');
    assert.match(cli.run('show'), /Picking up from your last session/);
    assert.match(cli.run('help'), /\/fp-recap:mode/);
  });
});

// --- integration: real hook processes --------------------------------------

function runHook(script, repo, home, payload) {
  const r = spawnSync('node', [path.join(__dirname, '..', 'hooks', script)], {
    cwd: repo,
    encoding: 'utf8',
    input: JSON.stringify(payload),
    env: { ...process.env, FLAREPOINT_CONFIG_HOME: home },
  });
  return r.stdout || '';
}

test('capture stores a recap; inject surfaces it once in the next session', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'fpr-git-'));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'fpr-h-'));
  try {
    fs.mkdirSync(path.join(repo, '.git'), { recursive: true });
    const transcript = writeTranscript(repo, [
      { type: 'user', message: { role: 'user', content: 'Refactor fp-bump' } },
      {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            { type: 'tool_use', name: 'Edit', input: { file_path: 'hooks/bump.js' } },
            { type: 'tool_use', name: 'Bash', input: { command: 'npm test' } },
          ],
        },
      },
    ]);

    // Stop hook (session S1) writes the recap to the project's personal store
    runHook('capture.js', repo, home, { transcript_path: transcript, session_id: 'S1' });
    const recapFile = path.join(repo, '.flarepoint', 'recap', 'personal', 'last-session.md');
    assert.ok(fs.existsSync(recapFile), 'recap file written');
    assert.match(fs.readFileSync(recapFile, 'utf8'), /Refactor fp-bump/);

    // First prompt of a NEW session (S2) -> recap surfaced
    const shown = runHook('inject.js', repo, home, { prompt: 'hello', session_id: 'S2' });
    assert.match(shown, /<fp:recap mode=on>/);
    assert.match(shown, /Refactor fp-bump/);

    // Same session again -> already shown, stays silent
    assert.equal(runHook('inject.js', repo, home, { prompt: 'more', session_id: 'S2' }).trim(), '');

    // The session that produced the recap never re-surfaces it
    assert.equal(runHook('inject.js', repo, home, { prompt: 'hi', session_id: 'S1' }).trim(), '');
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('capture stays silent when off', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'fpr-git2-'));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'fpr-h2-'));
  try {
    fs.mkdirSync(path.join(repo, '.git'), { recursive: true });
    fs.mkdirSync(path.join(repo, '.flarepoint'), { recursive: true });
    fs.writeFileSync(
      path.join(repo, '.flarepoint', 'config.json'),
      JSON.stringify({ recap: { mode: 'off' } }),
    );
    const transcript = writeTranscript(repo, [
      { type: 'user', message: { role: 'user', content: 'do a thing' } },
      {
        type: 'assistant',
        message: { role: 'assistant', content: [{ type: 'tool_use', name: 'Edit', input: { file_path: 'a.js' } }] },
      },
    ]);
    runHook('capture.js', repo, home, { transcript_path: transcript, session_id: 'S1' });
    assert.equal(fs.existsSync(path.join(repo, '.flarepoint', 'recap')), false);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  }
});
