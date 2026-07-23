#!/usr/bin/env node

const { existsSync, readFileSync } = require('fs');
const { spawn } = require('child_process');
const { join } = require('path');

const API_ENV_ALIASES = new Map([
  ['prod', 'production'],
  ['production', 'production'],
  ['staging', 'staging'],
]);

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};

  return readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return env;

      const separator = trimmed.indexOf('=');
      if (separator === -1) return env;

      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      env[key] = value;
      return env;
    }, {});
}

function parseArgs(args) {
  let apiEnv = 'production';
  const nextArgs = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--staging') {
      apiEnv = 'staging';
      continue;
    }

    if (arg === '--prod' || arg === '--production') {
      apiEnv = 'production';
      continue;
    }

    if (arg === '--api' || arg === '--api-env') {
      const value = args[i + 1];
      const normalized = API_ENV_ALIASES.get(value);
      if (!normalized) {
        console.error(`Unknown API environment "${value}". Use "production" or "staging".`);
        process.exit(1);
      }
      apiEnv = normalized;
      i += 1;
      continue;
    }

    if (arg.startsWith('--api=') || arg.startsWith('--api-env=')) {
      const value = arg.slice(arg.indexOf('=') + 1);
      const normalized = API_ENV_ALIASES.get(value);
      if (!normalized) {
        console.error(`Unknown API environment "${value}". Use "production" or "staging".`);
        process.exit(1);
      }
      apiEnv = normalized;
      continue;
    }

    nextArgs.push(arg);
  }

  return { apiEnv, nextArgs };
}

const root = process.cwd();
const localEnv = parseEnvFile(join(root, '.env.local'));
const { apiEnv, nextArgs } = parseArgs(process.argv.slice(2));
const apiUrlKey = `REETLE_API_BASE_URL_${apiEnv.toUpperCase()}`;
const apiUrl = process.env[apiUrlKey] || localEnv[apiUrlKey];

if (!apiUrl) {
  console.error(`Missing ${apiUrlKey} in .env.local.`);
  process.exit(1);
}

const nextBin = require.resolve('next/dist/bin/next');
const child = spawn(process.execPath, [nextBin, 'dev', ...nextArgs], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXT_PUBLIC_API_BASE_URL: apiUrl,
  },
});

console.log(`Using ${apiEnv} API: ${apiUrl}`);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
