export interface B2Account {
  keyId: string;
  appKey: string;
  bucket: string;
  region: string;
}

export interface AppConfig {
  adminEmail: string;
  adminPassword: string;
  sessionSecret: string;
  mongoUri: string;
  publicHost: string;
  publicOrigin: string;
  maxUploadBytes: number;
  accounts: B2Account[];
  isProduction: boolean;
}

const REQUIRED = [
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'SESSION_SECRET',
  'MONGODB_URI',
  'PUBLIC_HOST',
  'PUBLIC_ORIGIN',
  'B2_ACCOUNTS',
] as const;

/** Reads and validates the whole environment once, at boot. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const fail = (message: string): never => {
    throw new Error(`Config error: ${message}`);
  };
  const req = (key: string): string => {
    const value = env[key]?.trim();
    return value ? value : fail(`${key} is required`);
  };

  for (const key of REQUIRED) req(key);

  const adminPassword = req('ADMIN_PASSWORD');
  if (adminPassword.length < 8) fail('ADMIN_PASSWORD must be at least 8 characters');
  if (adminPassword.length > 15) fail('ADMIN_PASSWORD must be at most 15 characters');

  const sessionSecret = req('SESSION_SECRET');
  if (sessionSecret.length < 32) fail('SESSION_SECRET must be at least 32 characters');

  // The two values shipped in .env.example are public; refuse to boot with them.
  if (adminPassword === 'changeme123') fail('ADMIN_PASSWORD is still the example value');
  if (sessionSecret === 'replace-with-32-plus-random-characters') {
    fail('SESSION_SECRET is still the example value');
  }

  const rawAccounts = req('B2_ACCOUNTS');
  let accounts: B2Account[];
  try {
    accounts = JSON.parse(rawAccounts);
  } catch {
    return fail('B2_ACCOUNTS must be a JSON array');
  }
  if (!Array.isArray(accounts) || accounts.length === 0) {
    fail('B2_ACCOUNTS must contain at least 1 account');
  }
  if (accounts.length > 10) fail('B2_ACCOUNTS must contain at most 10 accounts');
  accounts.forEach((account, index) => {
    for (const key of ['keyId', 'appKey', 'bucket', 'region'] as const) {
      if (typeof account?.[key] !== 'string' || !account[key].trim()) {
        fail(`B2_ACCOUNTS[${index}].${key} is required`);
      }
    }
  });

  // A file records only its bucket name, so two entries sharing one bucket
  // would make it ambiguous which key to use when reading or deleting.
  const buckets = new Set<string>();
  accounts.forEach((account, index) => {
    if (buckets.has(account.bucket)) {
      fail(`B2_ACCOUNTS[${index}].bucket repeats "${account.bucket}" — use a different bucket per account`);
    }
    buckets.add(account.bucket);
  });

  const maxMb = Number(env.MAX_UPLOAD_MB ?? 50);
  if (!Number.isFinite(maxMb) || maxMb <= 0) fail('MAX_UPLOAD_MB must be a positive number');

  return {
    adminEmail: req('ADMIN_EMAIL'),
    adminPassword,
    sessionSecret,
    mongoUri: req('MONGODB_URI'),
    publicHost: req('PUBLIC_HOST'),
    publicOrigin: req('PUBLIC_ORIGIN').replace(/\/+$/, ''),
    maxUploadBytes: Math.floor(maxMb * 1024 * 1024),
    accounts,
    isProduction: env.NODE_ENV === 'production',
  };
}

export const APP_CONFIG = Symbol('APP_CONFIG');
