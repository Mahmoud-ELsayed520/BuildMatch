/**
 * BuildMatch Real PostgreSQL Migration & Security Integration Test Runner
 *
 * Requirements:
 * 1. Executes all 4 SQL migrations + seed on a genuine local PostgreSQL instance without skipping statements.
 * 2. Does NOT contaminate function privileges: verifies native PostgreSQL function grants via has_function_privilege().
 * 3. Tests real concurrent selection using separate PostgreSQL connections and transactions.
 * 4. Tests high-value authorization rules: anonymous denial, multi-tenant storage, KYC privacy, and role protections.
 * 5. Uses a dedicated, isolated test cluster (dynamically detecting PostgreSQL binaries or initializing with initdb).
 * 6. Repeats the full migration cycle twice from clean isolated databases to prove idempotency.
 */

import { spawn, execSync } from 'child_process';
import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const migrationsDir = path.resolve(__dirname, '../migrations');
const seedFile = path.resolve(__dirname, '../seed/seed.sql');

// Configuration
const TEST_PORT = parseInt(process.env.PG_PORT || '5433', 10);
const TEST_DATA_DIR = process.env.PG_DATA_DIR || path.join(projectRoot, '.pgdata_test');
const DB_NAME = 'buildmatch_real_test';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 1. Dynamic PostgreSQL Binary Detection
function detectPostgresBin() {
  if (process.env.PG_BIN && fs.existsSync(path.join(process.env.PG_BIN, 'postgres.exe'))) {
    return process.env.PG_BIN;
  }
  if (process.env.PG_BIN && fs.existsSync(path.join(process.env.PG_BIN, 'postgres'))) {
    return process.env.PG_BIN;
  }

  // Windows PATH check
  try {
    const stdout = execSync('where.exe postgres.exe', { stdio: 'pipe' }).toString().trim();
    if (stdout) {
      return path.dirname(stdout.split('\n')[0].trim());
    }
  } catch (err) {
    // Ignore not found error and continue searching
    void err;
  }

  // Unix PATH check
  try {
    const stdout = execSync('which postgres', { stdio: 'pipe' }).toString().trim();
    if (stdout) {
      return path.dirname(stdout);
    }
  } catch (err) {
    // Ignore not found error and continue searching
    void err;
  }

  // Common Windows installation paths
  const standardRoots = [
    'C:\\Program Files\\PostgreSQL',
    'C:\\Program Files (x86)\\PostgreSQL'
  ];
  for (const root of standardRoots) {
    if (fs.existsSync(root)) {
      const versions = fs.readdirSync(root).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
      for (const v of versions) {
        const bin = path.join(root, v, 'bin');
        if (fs.existsSync(path.join(bin, 'postgres.exe'))) {
          return bin;
        }
      }
    }
  }

  throw new Error(
    'PostgreSQL binaries could not be detected automatically.\n' +
    'Please ensure PostgreSQL is installed and set the PG_BIN environment variable.\n' +
    'Example: $env:PG_BIN = "C:\\Program Files\\PostgreSQL\\18\\bin"'
  );
}

// 2. Initialize dedicated test cluster if not present
function ensureTestClusterInitialized(pgBin) {
  const versionFile = path.join(TEST_DATA_DIR, 'PG_VERSION');
  if (fs.existsSync(versionFile)) {
    return;
  }

  console.log(`[PostgreSQL Runner] Initializing isolated test database cluster in ${TEST_DATA_DIR}...`);
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });

  const initdbName = process.platform === 'win32' ? 'initdb.exe' : 'initdb';
  const initdbPath = path.join(pgBin, initdbName);

  execSync(`"${initdbPath}" -D "${TEST_DATA_DIR}" -U postgres -A trust -E UTF8`, {
    stdio: 'pipe'
  });

  // Configure safe local-only network settings
  const confPath = path.join(TEST_DATA_DIR, 'postgresql.conf');
  fs.appendFileSync(confPath, `\nport = ${TEST_PORT}\nlisten_addresses = '127.0.0.1'\n`);
  console.log('[PostgreSQL Runner] Test cluster successfully initialized.');
}

// 3. Ensure test PostgreSQL server is running
async function ensureServerRunning(pgBin) {
  const testClient = new Client({
    host: '127.0.0.1',
    port: TEST_PORT,
    user: 'postgres',
    database: 'postgres'
  });

  try {
    await testClient.connect();
    await testClient.end();
    console.log(`[PostgreSQL Runner] Connected to existing server on port ${TEST_PORT}.`);
    return null;
  } catch (err) {
    // Server is not yet running on port; proceed to start it
    void err;
  }

  console.log(`[PostgreSQL Runner] Starting dedicated PostgreSQL instance on port ${TEST_PORT}...`);
  const postgresName = process.platform === 'win32' ? 'postgres.exe' : 'postgres';
  const proc = spawn(path.join(pgBin, postgresName), [
    '-D', TEST_DATA_DIR,
    '-p', String(TEST_PORT)
  ], { stdio: 'pipe' });

  proc.stderr.on('data', (d) => {
    const msg = d.toString();
    if (msg.includes('PANIC')) {
      console.error('[PostgreSQL stderr]:', msg.trim());
    }
  });

  for (let i = 0; i < 35; i++) {
    await sleep(400);
    const client = new Client({
      host: '127.0.0.1',
      port: TEST_PORT,
      user: 'postgres',
      database: 'postgres'
    });
    try {
      await client.connect();
      const res = await client.query('SELECT version();');
      console.log(`[PostgreSQL Runner] ${res.rows[0].version}`);
      await client.end();
      return proc;
    } catch (err) {
      // Retry until server finishes starting
      void err;
    }
  }

  throw new Error(`Timeout waiting for PostgreSQL to start on port ${TEST_PORT}.`);
}

// 4. Create fresh test database
async function createFreshDatabase() {
  const rootClient = new Client({
    host: '127.0.0.1',
    port: TEST_PORT,
    user: 'postgres',
    database: 'postgres'
  });
  await rootClient.connect();

  await rootClient.query(`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();
  `);

  await rootClient.query(`DROP DATABASE IF EXISTS ${DB_NAME};`);
  await rootClient.query(`CREATE DATABASE ${DB_NAME};`);
  await rootClient.end();
}

// 5. Setup Supabase PostgREST emulation shim (ROLES & SCHEMAS ONLY - NO FUNCTION EXECUTE PRIVILEGE CONTAMINATION)
async function setupSupabaseShim(client) {
  console.log('  -> Setting up Supabase system roles, auth schema, and storage tables...');
  await client.query(`
    -- Create standard Supabase roles
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN BYPASSRLS;
      END IF;
    END
    $$;

    -- Create auth schema and auth.users
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE TABLE IF NOT EXISTS auth.users (
      id UUID PRIMARY KEY,
      email TEXT,
      raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Emulate auth.uid() and auth.role() session accessors
    CREATE OR REPLACE FUNCTION auth.uid()
    RETURNS UUID
    LANGUAGE sql STABLE
    AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;

    CREATE OR REPLACE FUNCTION auth.role()
    RETURNS TEXT
    LANGUAGE sql STABLE
    AS $$
      SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), 'anon');
    $$;

    -- Create storage schema and tables
    CREATE SCHEMA IF NOT EXISTS storage;
    CREATE TABLE IF NOT EXISTS storage.buckets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      public BOOLEAN DEFAULT false,
      file_size_limit BIGINT,
      allowed_mime_types TEXT[],
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS storage.objects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bucket_id TEXT REFERENCES storage.buckets(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      owner UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
      metadata JSONB DEFAULT '{}'::jsonb
    );

    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

    CREATE OR REPLACE FUNCTION storage.foldername(name text)
    RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
    BEGIN
      RETURN string_to_array(name, '/');
    END;
    $$;

    -- Schema usage grants
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
    GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
    GRANT SELECT ON auth.users TO anon, authenticated, service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA storage TO anon, authenticated, service_role;
  `);
}

// 6. Grant only table and sequence privileges (NEVER GRANT ROUTINES - let migrations manage function grants!)
async function grantPostgrestTablePrivileges(client) {
  console.log('  -> Granting table and sequence privileges to PostgREST roles (ROUTINES EXCLUDED)...');
  await client.query(`
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA storage TO anon, authenticated, service_role;
  `);
}

// 7. Migration runners
async function runMigrationFile(client, filename) {
  const filePath = path.join(migrationsDir, filename);
  const sql = fs.readFileSync(filePath, 'utf-8');
  console.log(`  -> Executing migration: ${filename}...`);
  const start = Date.now();
  await client.query(sql);
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`     ✓ Applied ${filename} cleanly in ${elapsed}s`);
}

async function runSeedFile(client) {
  if (!fs.existsSync(seedFile)) return;
  const sql = fs.readFileSync(seedFile, 'utf-8');
  console.log(`  -> Executing development seed data: seed.sql...`);
  const start = Date.now();
  await client.query(sql);
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`     ✓ Applied seed.sql cleanly in ${elapsed}s`);
}

async function executeMigrationCycle(cycleNumber) {
  console.log(`\n======================================================================`);
  console.log(`[MIGRATION RUN #${cycleNumber}] Executing Clean Migration Sequence on Real PostgreSQL`);
  console.log(`======================================================================`);

  await createFreshDatabase();

  const client = new Client({
    host: '127.0.0.1',
    port: TEST_PORT,
    user: 'postgres',
    database: DB_NAME
  });
  await client.connect();

  try {
    await setupSupabaseShim(client);
    await runMigrationFile(client, '20261116000001_initial_schema.sql');
    await runMigrationFile(client, '20261116000002_rls_policies.sql');
    await runMigrationFile(client, '20261116000003_functions_and_rpc.sql');
    await runMigrationFile(client, '20261116000004_storage_buckets.sql');
    await runMigrationFile(client, '20261117000001_fix_rpc_authorization.sql');
    await grantPostgrestTablePrivileges(client);
    await runSeedFile(client);
    console.log(`\n✓ [MIGRATION RUN #${cycleNumber} SUCCESS]: All 5 migrations and seed applied with ZERO skipped statements!`);
  } finally {
    await client.end();
  }
}

// 8. Comprehensive Database Security & Authorization Tests
async function runRealSecurityTests() {
  console.log(`\n======================================================================`);
  console.log(`[DATABASE SECURITY & AUTHORIZATION TESTS] Runtime RLS, Concurrency & Privilege Checks`);
  console.log(`======================================================================`);

  const client = new Client({
    host: '127.0.0.1',
    port: TEST_PORT,
    user: 'postgres',
    database: DB_NAME
  });
  await client.connect();

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  FAIL: ${name}`);
      console.error(`        Error: ${err.message}`);
      failed++;
    }
  }

  async function asUser(uid, role, queryFn, targetClient = client) {
    await targetClient.query('BEGIN;');
    try {
      await targetClient.query(`SET LOCAL ROLE ${role};`);
      if (uid) {
        await targetClient.query(`SET LOCAL "request.jwt.claim.sub" = '${uid}';`);
      }
      await targetClient.query(`SET LOCAL "request.jwt.claim.role" = '${role}';`);
      const res = await queryFn();
      await targetClient.query('COMMIT;');
      return res;
    } catch (e) {
      await targetClient.query('ROLLBACK;');
      throw e;
    }
  }

  const ADMIN_ID = '00000000-0000-0000-0000-000000000001';
  const LANDOWNER_ID = '00000000-0000-0000-0000-000000000002';
  const CONTRACTOR1_APPROVED = '00000000-0000-0000-0000-000000000003';
  const CONTRACTOR2_PENDING = '00000000-0000-0000-0000-000000000004';
  const CONTRACTOR3_APPROVED = '00000000-0000-0000-0000-000000000005';
  const STRANGER_ID = '00000000-0000-0000-0000-000000000099';

  const PROJECT_ID = '11111111-1111-1111-1111-111111111111';
  const PKG1_ID = '22222222-2222-2222-2222-222222222221';
  const PROP1_APPROVED = '33333333-3333-3333-3333-333333333331';

  // Seed contractor 3 for multi-bidder scenarios
  await client.query(`
    INSERT INTO auth.users (id, email) VALUES ('${CONTRACTOR3_APPROVED}', 'contractor3@buildmatch.local') ON CONFLICT DO NOTHING;
    INSERT INTO public.profiles (id, role, full_name, phone, city)
    VALUES ('${CONTRACTOR3_APPROVED}', 'contractor', 'م. حسام الدين (شركة التعمير)', '+201000000005', 'Cairo')
    ON CONFLICT DO NOTHING;
    INSERT INTO public.contractor_profiles (id, business_name, bio, specializations, years_of_experience, verification_status)
    VALUES ('${CONTRACTOR3_APPROVED}', 'شركة التعمير الهندسية', 'مقاولات عامة', ARRAY['concrete_skeleton'], 10, 'approved')
    ON CONFLICT DO NOTHING;
  `);

  // ----------------------------------------------------------------------------
  // GROUP 1: FUNCTION PRIVILEGE CHECKS (Verifying migrations without test contamination)
  // ----------------------------------------------------------------------------
  await test('Function Grants: Sensitive RPCs are revoked from anon and granted to authenticated', async () => {
    const sensitiveFunctions = [
      'public.select_contractor_for_package(uuid, uuid)',
      'public.admin_verify_contractor(uuid, text, text)',
      'public.request_package_handover(uuid)',
      'public.approve_package_completion(uuid)',
      'public.decide_change_request(uuid, text, text)'
    ];

    for (const fn of sensitiveFunctions) {
      const anonRes = await client.query(`SELECT has_function_privilege('anon', '${fn}', 'EXECUTE') as can_exec;`);
      if (anonRes.rows[0].can_exec !== false) {
        throw new Error(`SECURITY LEAK: Function ${fn} is executable by anon role!`);
      }

      const authRes = await client.query(`SELECT has_function_privilege('authenticated', '${fn}', 'EXECUTE') as can_exec;`);
      if (authRes.rows[0].can_exec !== true) {
        throw new Error(`CONFIGURATION ERROR: Function ${fn} should be executable by authenticated role!`);
      }
    }

    // Public lookup function MUST be executable by anon and authenticated
    const pubResAnon = await client.query(`SELECT has_function_privilege('anon', 'public.get_public_contractor_profile(uuid)', 'EXECUTE') as can_exec;`);
    const pubResAuth = await client.query(`SELECT has_function_privilege('authenticated', 'public.get_public_contractor_profile(uuid)', 'EXECUTE') as can_exec;`);
    if (pubResAnon.rows[0].can_exec !== true || pubResAuth.rows[0].can_exec !== true) {
      throw new Error('Public contractor profile function must be executable by anon and authenticated');
    }
  });

  // ----------------------------------------------------------------------------
  // GROUP 2: PROFILES & HORIZONTAL ACCESS
  // ----------------------------------------------------------------------------
  await test('RLS Profiles: Anonymous users cannot access private profiles', async () => {
    const res = await asUser(null, 'anon', async () => {
      return client.query(`SELECT * FROM public.profiles;`);
    });
    if (res.rows.length !== 0) {
      throw new Error(`Anon was able to access profiles table! Rows: ${res.rows.length}`);
    }
  });

  await test('RLS Profiles: Stranger authenticated user cannot read Landowner private profile', async () => {
    const res = await asUser(STRANGER_ID, 'authenticated', async () => {
      return client.query(`SELECT * FROM public.profiles WHERE id = '${LANDOWNER_ID}';`);
    });
    if (res.rows.length !== 0) {
      throw new Error(`Expected 0 rows for stranger querying landowner profile, got ${res.rows.length}`);
    }
  });

  await test('RLS Profiles: Owner can read own complete profile including phone number', async () => {
    const res = await asUser(LANDOWNER_ID, 'authenticated', async () => {
      return client.query(`SELECT * FROM public.profiles WHERE id = '${LANDOWNER_ID}';`);
    });
    if (res.rows.length !== 1 || !res.rows[0].phone) {
      throw new Error('Owner should see their own complete profile with phone number');
    }
  });

  await test('Profiles Privacy: Safe Public Directory exposes only approved contractors and hides phone/notes', async () => {
    const res = await asUser(null, 'anon', async () => {
      return client.query(`SELECT * FROM public.contractor_public_directory;`);
    });
    if (res.rows.length < 1) {
      throw new Error('Expected at least 1 approved contractor in public directory');
    }
    for (const c of res.rows) {
      if ('phone' in c) throw new Error('VULNERABILITY: phone exposed in contractor_public_directory');
      if ('verification_notes' in c) throw new Error('VULNERABILITY: verification_notes exposed in directory');
      if (c.id === CONTRACTOR2_PENDING) throw new Error('VULNERABILITY: pending contractor visible in public directory');
    }
  });

  await test('Role Integrity: Check constraint rejects unauthorized role modification', async () => {
    let threw = false;
    try {
      await client.query(`
        INSERT INTO public.profiles (id, role, full_name, city)
        VALUES ('ffffffff-0000-0000-0000-000000000001', 'super_admin_hacker', 'Hacker', 'Cairo');
      `);
    } catch {
      threw = true;
    }
    if (!threw) throw new Error('Expected check constraint failure for role "super_admin_hacker"');
  });

  // ----------------------------------------------------------------------------
  // GROUP 3: STORAGE MULTI-TENANT ACCESS
  // ----------------------------------------------------------------------------
  await test('Storage RLS: Stranger cannot read private project files; owner & public can access', async () => {
    await client.query(`
      INSERT INTO storage.objects (id, bucket_id, name, owner)
      VALUES
        ('a0000000-0000-0000-0000-000000000001', 'project-files', '${PROJECT_ID}/private_drawing.dwg', '${LANDOWNER_ID}'),
        ('a0000000-0000-0000-0000-000000000002', 'project-files', '${PROJECT_ID}/public_facade.jpg', '${LANDOWNER_ID}')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.project_files (id, project_id, file_category, file_path, file_name, is_public)
      VALUES
        ('f0000000-0000-0000-0000-000000000001', '${PROJECT_ID}', 'structural_drawing', '${PROJECT_ID}/private_drawing.dwg', 'private_drawing.dwg', false),
        ('f0000000-0000-0000-0000-000000000002', '${PROJECT_ID}', 'site_photo', '${PROJECT_ID}/public_facade.jpg', 'public_facade.jpg', true)
      ON CONFLICT (id) DO NOTHING;
    `);

    // Stranger querying private file
    const resPrivate = await asUser(STRANGER_ID, 'authenticated', async () => {
      return client.query(`SELECT * FROM storage.objects WHERE name = '${PROJECT_ID}/private_drawing.dwg';`);
    });
    if (resPrivate.rows.length !== 0) throw new Error('Stranger accessed private project file!');

    // Stranger querying public file
    const resPublic = await asUser(STRANGER_ID, 'authenticated', async () => {
      return client.query(`SELECT * FROM storage.objects WHERE name = '${PROJECT_ID}/public_facade.jpg';`);
    });
    if (resPublic.rows.length !== 1) throw new Error('Stranger could not access file with is_public = true');

    // Owner querying private file
    const resOwner = await asUser(LANDOWNER_ID, 'authenticated', async () => {
      return client.query(`SELECT * FROM storage.objects WHERE name = '${PROJECT_ID}/private_drawing.dwg';`);
    });
    if (resOwner.rows.length !== 1) throw new Error('Owner could not access own private file');
  });

  await test('Verification Documents RLS: Stranger cannot read KYC documents; owner can access', async () => {
    await client.query(`
      INSERT INTO public.verification_documents (id, contractor_id, document_type, file_path, file_name)
      VALUES ('d0000000-0000-0000-0000-000000000001', '${CONTRACTOR1_APPROVED}', 'commercial_register', 'contractor1/cr.pdf', 'cr.pdf')
      ON CONFLICT (id) DO NOTHING;
    `);

    const resStranger = await asUser(STRANGER_ID, 'authenticated', async () => {
      return client.query(`SELECT * FROM public.verification_documents;`);
    });
    if (resStranger.rows.length !== 0) throw new Error('Stranger accessed contractor verification documents!');

    const resOwner = await asUser(CONTRACTOR1_APPROVED, 'authenticated', async () => {
      return client.query(`SELECT * FROM public.verification_documents;`);
    });
    if (resOwner.rows.length !== 1) throw new Error('Contractor could not access own verification documents');
  });

  // ----------------------------------------------------------------------------
  // GROUP 4: RPC AUTHORIZATION RULES
  // ----------------------------------------------------------------------------
  await test('RPC Authorization: Non-admin cannot call admin_verify_contractor', async () => {
    let threw = false;
    try {
      await asUser(LANDOWNER_ID, 'authenticated', async () => {
        return client.query(`SELECT public.admin_verify_contractor('${CONTRACTOR2_PENDING}', 'approved', 'Hacked');`);
      });
    } catch (e) {
      if (e.message.includes('Only platform administrators can verify contractors') || e.message.includes('Unauthorized')) {
        threw = true;
      }
    }
    if (!threw) throw new Error('Expected admin_verify_contractor to reject non-admin call');
  });

  await test('RPC Authorization: Non-owner cannot approve change requests', async () => {
    const crId = 'c0000000-0000-0000-0000-000000000001';
    await client.query(`
      INSERT INTO public.change_requests (id, package_id, requested_by, title, reason, scope_change_description, cost_impact, time_impact_days, status)
      VALUES ('${crId}', '${PKG1_ID}', '${CONTRACTOR1_APPROVED}', 'Extra Excavation', 'Rock encounter', 'Scope details', 50000, 7, 'submitted')
      ON CONFLICT (id) DO NOTHING;
    `);

    let threw = false;
    try {
      await asUser(CONTRACTOR1_APPROVED, 'authenticated', async () => {
        return client.query(`SELECT public.decide_change_request('${crId}', 'approved', 'Approved by contractor self');`);
      });
    } catch (e) {
      if (e.message.includes('Only the project owner can decide change requests') || e.message.includes('Unauthorized')) {
        threw = true;
      }
    }
    if (!threw) throw new Error('Contractor was able to approve change request (must be owner only)');
  });

  await test('RPC Authorization: Contractor cannot self-approve package completion', async () => {
    let threw = false;
    try {
      await asUser(CONTRACTOR1_APPROVED, 'authenticated', async () => {
        return client.query(`SELECT public.approve_package_completion('${PKG1_ID}');`);
      });
    } catch (e) {
      if (e.message.includes('Only the landowner can approve completion') || e.message.includes('Unauthorized')) {
        threw = true;
      }
    }
    if (!threw) throw new Error('Contractor was able to self-approve package completion');
  });

  // ----------------------------------------------------------------------------
  // GROUP 4B: RPC NULL-SAFE & UNAUTHENTICATED REGRESSION TESTS
  // ----------------------------------------------------------------------------
  await test('RPC Null-Safety: Anonymous callers cannot execute sensitive RPCs (NULL auth.uid)', async () => {
    const crId = 'c0000000-0000-0000-0000-000000000001';

    // 1. select_contractor_for_package
    let threwSelect = false;
    try {
      await asUser(null, 'anon', async () => {
        return client.query(`SELECT public.select_contractor_for_package('${PKG1_ID}', '${PROP1_APPROVED}');`);
      });
    } catch (e) {
      if (e.message.includes('permission denied') || e.message.includes('Unauthorized')) {
        threwSelect = true;
      }
    }
    if (!threwSelect) throw new Error('Expected select_contractor_for_package to reject anonymous call');

    // 2. request_package_handover
    let threwHandover = false;
    try {
      await asUser(null, 'anon', async () => {
        return client.query(`SELECT public.request_package_handover('${PKG1_ID}');`);
      });
    } catch (e) {
      if (e.message.includes('permission denied') || e.message.includes('Unauthorized')) {
        threwHandover = true;
      }
    }
    if (!threwHandover) throw new Error('Expected request_package_handover to reject anonymous call');

    // 3. approve_package_completion
    let threwApprove = false;
    try {
      await asUser(null, 'anon', async () => {
        return client.query(`SELECT public.approve_package_completion('${PKG1_ID}');`);
      });
    } catch (e) {
      if (e.message.includes('permission denied') || e.message.includes('Unauthorized')) {
        threwApprove = true;
      }
    }
    if (!threwApprove) throw new Error('Expected approve_package_completion to reject anonymous call');

    // 4. decide_change_request
    let threwChange = false;
    try {
      await asUser(null, 'anon', async () => {
        return client.query(`SELECT public.decide_change_request('${crId}', 'approved', 'Hacked');`);
      });
    } catch (e) {
      if (e.message.includes('permission denied') || e.message.includes('Unauthorized')) {
        threwChange = true;
      }
    }
    if (!threwChange) throw new Error('Expected decide_change_request to reject anonymous call');

    // 5. admin_verify_contractor
    let threwVerify = false;
    try {
      await asUser(null, 'anon', async () => {
        return client.query(`SELECT public.admin_verify_contractor('${CONTRACTOR2_PENDING}', 'approved', 'Hacked');`);
      });
    } catch (e) {
      if (e.message.includes('permission denied') || e.message.includes('Unauthorized')) {
        threwVerify = true;
      }
    }
    if (!threwVerify) throw new Error('Expected admin_verify_contractor to reject anonymous call');
  });

  // ----------------------------------------------------------------------------
  // GROUP 5: REAL CONCURRENCY & TRANSACTION ISOLATION (Separate Connections)
  // ----------------------------------------------------------------------------
  await test('Concurrency & Atomicity: Real concurrent proposal selection with 2 separate database clients', async () => {
    const CONC_PKG_ID = '22222222-2222-2222-2222-222222222299';
    const CONC_PROP_A = '33333333-3333-3333-3333-333333333391';
    const CONC_PROP_B = '33333333-3333-3333-3333-333333333392';

    // 1. Prepare open package and two submitted proposals from different approved contractors
    await client.query(`
      INSERT INTO public.project_packages (id, project_id, title, category, description, scope_of_work, estimated_budget, target_duration_days, status)
      VALUES ('${CONC_PKG_ID}', '${PROJECT_ID}', 'Concurrent Test Package', 'turnkey', 'Desc', 'Scope', 2000000, 100, 'open')
      ON CONFLICT (id) DO UPDATE SET status = 'open', assigned_contractor_id = NULL, assigned_proposal_id = NULL;

      INSERT INTO public.proposals (id, package_id, contractor_id, total_price, proposed_duration_days, scope_summary, payment_schedule_terms, status, submitted_at)
      VALUES
        ('${CONC_PROP_A}', '${CONC_PKG_ID}', '${CONTRACTOR1_APPROVED}', 1900000, 95, 'Proposal A', 'Terms A', 'submitted', NOW()),
        ('${CONC_PROP_B}', '${CONC_PKG_ID}', '${CONTRACTOR3_APPROVED}', 1950000, 90, 'Proposal B', 'Terms B', 'submitted', NOW())
      ON CONFLICT (id) DO UPDATE SET status = 'submitted';
    `);

    // 2. Open two completely separate database client connections
    const clientA = new Client({ host: '127.0.0.1', port: TEST_PORT, user: 'postgres', database: DB_NAME });
    const clientB = new Client({ host: '127.0.0.1', port: TEST_PORT, user: 'postgres', database: DB_NAME });
    await clientA.connect();
    await clientB.connect();

    try {
      // 3. Initiate competing selection requests concurrently
      const taskA = asUser(LANDOWNER_ID, 'authenticated', async () => {
        return clientA.query(`SELECT public.select_contractor_for_package('${CONC_PKG_ID}', '${CONC_PROP_A}');`);
      }, clientA);

      const taskB = asUser(LANDOWNER_ID, 'authenticated', async () => {
        return clientB.query(`SELECT public.select_contractor_for_package('${CONC_PKG_ID}', '${CONC_PROP_B}');`);
      }, clientB);

      const [resA, resB] = await Promise.allSettled([taskA, taskB]);

      // 4. Assert: Exactly ONE transaction succeeded and ONE failed
      const aSucceeded = resA.status === 'fulfilled';
      const bSucceeded = resB.status === 'fulfilled';

      if ((aSucceeded && bSucceeded) || (!aSucceeded && !bSucceeded)) {
        throw new Error(`Concurrency violation! A status: ${resA.status}, B status: ${resB.status}`);
      }

      // Check winning proposal vs losing proposal in DB
      const propA = await client.query(`SELECT status FROM public.proposals WHERE id = '${CONC_PROP_A}';`);
      const propB = await client.query(`SELECT status FROM public.proposals WHERE id = '${CONC_PROP_B}';`);
      const pkg = await client.query(`SELECT status, assigned_contractor_id, assigned_proposal_id FROM public.project_packages WHERE id = '${CONC_PKG_ID}';`);

      const winningProp = aSucceeded ? propA.rows[0] : propB.rows[0];
      const losingProp = aSucceeded ? propB.rows[0] : propA.rows[0];

      if (winningProp.status !== 'accepted') {
        throw new Error(`Winning proposal should have status 'accepted', got ${winningProp.status}`);
      }
      if (losingProp.status !== 'rejected') {
        throw new Error(`Losing proposal should have status 'rejected', got ${losingProp.status}`);
      }
      if (pkg.rows[0].status !== 'assigned') {
        throw new Error(`Package status should be 'assigned', got ${pkg.rows[0].status}`);
      }

      // Check audit logs consistency
      const auditRes = await client.query(`
        SELECT count(*) as count FROM public.audit_logs
        WHERE entity_id = '${CONC_PKG_ID}' AND action = 'SELECT_CONTRACTOR_PROPOSAL';
      `);
      if (parseInt(auditRes.rows[0].count, 10) !== 1) {
        throw new Error(`Expected exactly 1 audit log record for package assignment, found ${auditRes.rows[0].count}`);
      }
    } finally {
      await clientA.end();
      await clientB.end();
    }
  });

  // ----------------------------------------------------------------------------
  // GROUP 6: ASSIGNED PARTNER ACCESS TO STORAGE & PROFILES
  // ----------------------------------------------------------------------------
  await test('Partner Visibility: Assigned contractor can access project files and landowner profile', async () => {
    // Award PKG1 to CONTRACTOR1_APPROVED
    await asUser(LANDOWNER_ID, 'authenticated', async () => {
      return client.query(`SELECT public.select_contractor_for_package('${PKG1_ID}', '${PROP1_APPROVED}');`);
    });

    // Assigned contractor can now view landowner profile
    const resProfile = await asUser(CONTRACTOR1_APPROVED, 'authenticated', async () => {
      return client.query(`SELECT id, full_name, phone FROM public.profiles WHERE id = '${LANDOWNER_ID}';`);
    });
    if (resProfile.rows.length !== 1) {
      throw new Error(`Assigned contractor could not see landowner profile: ${resProfile.rows.length}`);
    }

    // Assigned contractor CAN access project files
    const resFile = await asUser(CONTRACTOR1_APPROVED, 'authenticated', async () => {
      return client.query(`SELECT * FROM storage.objects WHERE name = '${PROJECT_ID}/private_drawing.dwg';`);
    });
    if (resFile.rows.length !== 1) {
      throw new Error(`Assigned contractor could not access project files: ${resFile.rows.length}`);
    }

    // Unassigned pending contractor CANNOT access private project files
    const resUnassigned = await asUser(CONTRACTOR2_PENDING, 'authenticated', async () => {
      return client.query(`SELECT * FROM storage.objects WHERE name = '${PROJECT_ID}/private_drawing.dwg';`);
    });
    if (resUnassigned.rows.length !== 0) {
      throw new Error(`Unassigned contractor was able to access private project files: ${resUnassigned.rows.length}`);
    }
  });

  await client.end();

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    throw new Error(`${failed} database security test(s) failed`);
  }
}

// 9. Main Orchestrator
async function main() {
  console.log('======================================================================');
  console.log('BuildMatch Real PostgreSQL Migration & Security Integration Suite');
  console.log('======================================================================');

  const pgBin = detectPostgresBin();
  console.log('[PostgreSQL Runner] Detected PostgreSQL Binary Dir:', pgBin);
  console.log('[PostgreSQL Runner] Test Data Directory:', TEST_DATA_DIR);
  console.log('[PostgreSQL Runner] Test Port:', TEST_PORT);

  ensureTestClusterInitialized(pgBin);

  let pgProcess = null;
  const startTime = Date.now();

  try {
    pgProcess = await ensureServerRunning(pgBin);

    // Run Migration Cycle 1
    await executeMigrationCycle(1);

    // Run Real Security and Authorization Tests
    await runRealSecurityTests();

    // Run Migration Cycle 2 (Repeatability / Idempotence Verification from zero)
    await executeMigrationCycle(2);

    const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n======================================================================`);
    console.log(`ALL 2 MIGRATION RUNS AND 13 REAL SECURITY TESTS PASSED (${totalSeconds}s)`);
    console.log(`======================================================================\n`);
  } finally {
    if (pgProcess) {
      console.log('[PostgreSQL Runner] Terminating spawned test PostgreSQL process...');
      pgProcess.kill();
    }
  }
}

main().catch((err) => {
  console.error('\n[FATAL] Test runner failed:', err.message);
  process.exit(1);
});
