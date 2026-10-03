const { spawn } = require('child_process');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

let worker = null;
let rl = null;
let reqCounter = 0;
const pendingCallbacks = new Map();

function startWorker() {
  const workerPath = path.join(__dirname, 'db_worker.py');
  worker = spawn('python3', [workerPath]);

  rl = readline.createInterface({ input: worker.stdout });

  rl.on('line', (line) => {
    try {
      const res = JSON.parse(line);
      const cb = pendingCallbacks.get(res.id);
      if (cb) {
        pendingCallbacks.delete(res.id);
        if (res.error) {
          cb.reject(new Error(res.error));
        } else {
          cb.resolve(res);
        }
      }
    } catch (e) {
      console.error('Error parsing line from DB worker:', e, line);
    }
  });

  worker.stderr.on('data', (data) => {
    console.error('DB worker stderr:', data.toString());
  });

  worker.on('exit', (code, signal) => {
    console.warn(`DB worker exited with code ${code}, restarting...`);
    setTimeout(startWorker, 500);
  });
}

startWorker();

function send(action, sql, params = []) {
  return new Promise((resolve, reject) => {
    const id = ++reqCounter;
    pendingCallbacks.set(id, { resolve, reject });
    const payload = JSON.stringify({ id, action, sql, params }) + '\n';
    worker.stdin.write(payload);
  });
}

const db = {
  async query(sql, params = []) {
    return send('query', sql, params);
  },

  async get(sql, params = []) {
    const res = await send('query', sql, params);
    return res.rows && res.rows.length > 0 ? res.rows[0] : null;
  },

  async all(sql, params = []) {
    const res = await send('query', sql, params);
    return res.rows || [];
  },

  async run(sql, params = []) {
    const res = await send('query', sql, params);
    return { changes: res.changes, lastID: res.lastID };
  },

  async exec(sql) {
    return send('exec', sql);
  },

  async initDb() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await send('exec', schemaSql);
    console.log('✓ SQLite database schema initialized successfully');
  }
};

module.exports = db;
