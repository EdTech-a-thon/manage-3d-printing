import { mkdir, writeFile, chmod, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const root = process.cwd();
const baseDir = `${root}/.local/pocketbase`;
const binaryPath = `${baseDir}/pocketbase`;
const pbDir = `${root}/pb_data`;
const adminEmail = process.env.PB_ADMIN_EMAIL;
const adminPassword = process.env.PB_ADMIN_PASSWORD;
const release = 'v0.39.6';
const downloadUrl = `https://github.com/pocketbase/pocketbase/releases/download/${release}/pocketbase_0.39.6_linux_amd64.zip`;

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function ensureBinary() {
  await mkdir(baseDir, { recursive: true });
  if (await exists(binaryPath)) return;

  const zipPath = `${baseDir}/pocketbase.zip`;
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`PocketBase download failed: ${response.status}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  await writeFile(zipPath, bytes);

  await new Promise((resolve, reject) => {
    const unzip = spawn('unzip', ['-o', zipPath, '-d', baseDir], { stdio: 'inherit' });
    unzip.on('exit', (code) => (code === 0 ? resolve(null) : reject(new Error('unzip failed'))));
  });

  await chmod(binaryPath, 0o755);
}

async function waitForServer(url) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await delay(1000);
  }
  throw new Error('PocketBase did not start in time.');
}

async function ensureAdmin() {
  const auth = await fetch('http://127.0.0.1:8090/api/collections/_superusers/auth-with-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: adminEmail, password: adminPassword })
  });

  let token = '';
  if (auth.ok) {
    const data = await auth.json();
    token = data.token;
  } else {
    throw new Error('Could not authenticate PocketBase admin.');
  }

  return token;
}

async function getCollections(token) {
  const response = await fetch('http://127.0.0.1:8090/api/collections', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await response.json();
  return data.items || [];
}

function authCollection() {
  return {
    name: 'teachers',
    type: 'auth',
    system: false,
    fields: [
      {
        name: 'name',
        type: 'text',
        required: true,
        unique: false,
        options: { min: 1, max: 120, pattern: '' }
      }
    ],
    indexes: [],
    listRule: 'id = @request.auth.id',
    viewRule: 'id = @request.auth.id',
    createRule: '@request.auth.id = ""',
    updateRule: 'id = @request.auth.id',
    deleteRule: 'id = @request.auth.id',
    authRule: '',
    manageRule: 'id = @request.auth.id',
    passwordAuth: {
      enabled: true,
      identityFields: ['email']
    }
  };
}

function requestCollection() {
  return {
    name: 'print_requests',
    type: 'base',
    system: false,
    fields: [
      {
        name: 'teacher_id',
        type: 'text',
        required: true,
        unique: false,
        options: { min: 1, max: 50, pattern: '' }
      },
      {
        name: 'title',
        type: 'text',
        required: true,
        unique: false,
        options: { min: 1, max: 150, pattern: '' }
      },
      {
        name: 'slug',
        type: 'text',
        required: true,
        unique: true,
        options: { min: 1, max: 80, pattern: '' }
      },
      {
        name: 'description',
        type: 'text',
        required: false,
        unique: false,
        options: { min: 0, max: 1000, pattern: '' }
      },
      {
        name: 'created',
        type: 'autodate',
        onCreate: true,
        onUpdate: false
      }
    ],
    indexes: ['CREATE UNIQUE INDEX `idx_print_requests_slug` ON `print_requests` (`slug`)'],
    listRule: 'slug != ""',
    viewRule: 'slug != ""',
    createRule: 'teacher_id = @request.auth.id',
    updateRule: 'teacher_id = @request.auth.id',
    deleteRule: 'teacher_id = @request.auth.id',
  };
}

function submissionCollection() {
  return {
    name: 'submissions',
    type: 'base',
    system: false,
    fields: [
      {
        name: 'teacher_id',
        type: 'text',
        required: true,
        unique: false,
        options: { min: 1, max: 50, pattern: '' }
      },
      {
        name: 'request_id',
        type: 'text',
        required: true,
        unique: false,
        options: { min: 1, max: 120, pattern: '' }
      },
      {
        name: 'request_slug',
        type: 'text',
        required: true,
        unique: false,
        options: { min: 1, max: 80, pattern: '' }
      },
      {
        name: 'request_title',
        type: 'text',
        required: true,
        unique: false,
        options: { min: 1, max: 150, pattern: '' }
      },
      {
        name: 'student_name',
        type: 'text',
        required: true,
        unique: false,
        options: { min: 1, max: 120, pattern: '' }
      },
      {
        name: 'note',
        type: 'text',
        required: false,
        unique: false,
        options: { min: 0, max: 1000, pattern: '' }
      },
      {
        name: 'file',
        type: 'file',
        required: true,
        unique: false,
        options: { maxSelect: 1, maxSize: 250000000, mimeTypes: [] }
      },
      {
        name: 'created',
        type: 'autodate',
        onCreate: true,
        onUpdate: false
      }
    ],
    indexes: [],
    listRule: 'teacher_id = @request.auth.id',
    viewRule: 'teacher_id = @request.auth.id',
    createRule: '@request.auth.id = "" || teacher_id = @request.auth.id',
    updateRule: 'teacher_id = @request.auth.id',
    deleteRule: 'teacher_id = @request.auth.id',
  };
}

async function ensureCollection(token, name, payload) {
  const collections = await getCollections(token);
  const existing = collections.find((collection) => collection.name === name);
  if (existing) {
    const missingFields = payload.fields.filter(
      (field) => !existing.fields.some((existingField) => existingField.name === field.name)
    );
    const ruleNames = ['listRule', 'viewRule', 'createRule', 'updateRule', 'deleteRule'];
    const changedRules = Object.fromEntries(
      ruleNames
        .filter((rule) => payload[rule] !== existing[rule])
        .map((rule) => [rule, payload[rule]])
    );

    if (missingFields.length === 0 && Object.keys(changedRules).length === 0) return existing;

    const response = await fetch(`http://127.0.0.1:8090/api/collections/${existing.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...changedRules,
        ...(missingFields.length > 0 ? { fields: [...existing.fields, ...missingFields] } : {})
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Could not update collection ${name}: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  const response = await fetch('http://127.0.0.1:8090/api/collections', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Could not create collection ${name}: ${response.status} ${errorText}`);
  }

  return response.json();
}

await ensureBinary();
await mkdir(pbDir, { recursive: true });

const superuser = spawn(binaryPath, ['superuser', 'upsert', adminEmail, adminPassword, `--dir=${pbDir}`], {
  stdio: 'inherit'
});

const superuserExit = await new Promise((resolve) => {
  superuser.on('exit', (code) => resolve(code));
});

if (superuserExit !== 0) {
  throw new Error('Could not create PocketBase superuser.');
}

let server = null;
const alreadyRunning = await fetch('http://127.0.0.1:8090/api/health')
  .then((response) => response.ok)
  .catch(() => false);

if (!alreadyRunning) {
  server = spawn(binaryPath, ['serve', '--http=127.0.0.1:8090', `--dir=${pbDir}`], {
    stdio: 'inherit'
  });

  process.on('exit', () => server?.kill('SIGTERM'));
  process.on('SIGINT', () => server?.kill('SIGTERM'));
  process.on('SIGTERM', () => server?.kill('SIGTERM'));

  await waitForServer('http://127.0.0.1:8090/api/health');
}

const token = await ensureAdmin();
await ensureCollection(token, 'teachers', authCollection());
await ensureCollection(token, 'print_requests', {
  ...requestCollection(),
  fields: requestCollection().fields
});
await ensureCollection(token, 'submissions', {
  ...submissionCollection(),
  fields: submissionCollection().fields
});
