/**
 * BuildMatch Real PostgreSQL Migration & Security Integration Test Runner
 *
 * Requirements:
 * 1. Executes all 9 SQL migrations + seed on a genuine local PostgreSQL instance without skipping statements.
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
    const { rows } = await testClient.query('SHOW data_directory;');
    const actualDataDir = path.resolve(rows[0].data_directory).toLowerCase();
    const expectedDataDir = path.resolve(TEST_DATA_DIR).toLowerCase();
    if (actualDataDir !== expectedDataDir) {
      throw new Error(`Refusing to use PostgreSQL outside the isolated test cluster. Expected ${expectedDataDir}, connected to ${actualDataDir}.`);
    }
    await testClient.end();
    console.log(`[PostgreSQL Runner] Connected to isolated test cluster on port ${TEST_PORT}.`);
    return null;
  } catch (err) {
    if (err.message?.startsWith('Refusing to use PostgreSQL outside')) {
      await testClient.end().catch(() => {});
      throw err;
    }
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
    // Existing Auth identities without app profiles exercise migration backfill.
    await client.query(`
      INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
        ('00000000-0000-0000-0000-000000000060', 'legacy-contractor@buildmatch.local', '{"role":"contractor","full_name":"Legacy Contractor","city":"Giza"}'),
        ('00000000-0000-0000-0000-000000000061', 'legacy-admin@buildmatch.local', '{"role":"admin","full_name":"Legacy Admin"}');
    `);
    await runMigrationFile(client, '20261116000001_initial_schema.sql');
    await runMigrationFile(client, '20261116000002_rls_policies.sql');
    await runMigrationFile(client, '20261116000003_functions_and_rpc.sql');
    await runMigrationFile(client, '20261116000004_storage_buckets.sql');
    await runMigrationFile(client, '20261117000001_fix_rpc_authorization.sql');
    await runMigrationFile(client, '20261117000002_set_view_security_invoker.sql');
    await grantPostgrestTablePrivileges(client);
    // Simulate legacy independent column ACLs to verify migration 07 revokes them too.
    await client.query('GRANT UPDATE (status, title) ON public.milestones TO anon, authenticated;');
    await runMigrationFile(client, '20261117000003_limit_milestone_status_updates.sql');
    await runMigrationFile(client, '20261117175421_auth_profile_bootstrap.sql');
    await runMigrationFile(client, '20261117181620_harden_business_update_paths.sql');
    await runSeedFile(client);
    console.log(`\n✓ [MIGRATION RUN #${cycleNumber} SUCCESS]: All 9 migrations and seed applied with ZERO skipped statements!`);
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
  const MILESTONE_POLICY_PACKAGE_ID = '22222222-2222-2222-2222-222222222298';
  const MILESTONE_PENDING_ID = '44444444-4444-4444-4444-444444444498';
  const MILESTONE_REVIEW_ID = '44444444-4444-4444-4444-444444444497';
  const MILESTONE_CONCURRENCY_ID = '44444444-4444-4444-4444-444444444496';
  const MILESTONE_ADMIN_ID = '44444444-4444-4444-4444-444444444495';
  const OTHER_PROJECT_ID = '11111111-1111-1111-1111-111111111199';
  const OTHER_PACKAGE_ID = '22222222-2222-2222-2222-222222222297';
  const OTHER_MILESTONE_ID = '44444444-4444-4444-4444-444444444494';

  async function seedMilestone(id, sequence, status, assignedContractorId = CONTRACTOR1_APPROVED) {
    const assignedContractorSql = assignedContractorId ? `'${assignedContractorId}'` : 'NULL';
    await client.query(`
      INSERT INTO public.project_packages (id, project_id, title, category, description, scope_of_work, status, assigned_contractor_id)
      VALUES ('${MILESTONE_POLICY_PACKAGE_ID}', '${PROJECT_ID}', 'Milestone security test', 'masonry', 'Test package', 'Test scope', 'in_progress', ${assignedContractorSql})
      ON CONFLICT (id) DO UPDATE SET assigned_contractor_id = EXCLUDED.assigned_contractor_id, status = 'in_progress';
      INSERT INTO public.milestones (id, package_id, title, description, sequence_order, status, submitted_at, approved_at, rework_notes)
      VALUES ('${id}', '${MILESTONE_POLICY_PACKAGE_ID}', 'Security test milestone', 'Fixture', ${sequence}, '${status}', NULL, NULL, NULL)
      ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, submitted_at = NULL, approved_at = NULL, rework_notes = NULL;
    `);
  }

  // Seed contractor 3 for multi-bidder scenarios
  await client.query(`
    INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ('${CONTRACTOR3_APPROVED}', 'contractor3@buildmatch.local', '{"role":"contractor","full_name":"Contractor Three"}') ON CONFLICT DO NOTHING;
    INSERT INTO public.profiles (id, role, full_name, phone, city)
    VALUES ('${CONTRACTOR3_APPROVED}', 'contractor', 'م. حسام الدين (شركة التعمير)', '+201000000005', 'Cairo')
    ON CONFLICT DO NOTHING;
    INSERT INTO public.contractor_profiles (id, business_name, bio, specializations, years_of_experience, verification_status)
    VALUES ('${CONTRACTOR3_APPROVED}', 'شركة التعمير الهندسية', 'مقاولات عامة', ARRAY['concrete_skeleton'], 10, 'approved')
    ON CONFLICT (id) DO UPDATE SET verification_status = 'approved';
  `);

  await test('Auth Profiles: Signup trigger creates supported profiles without granting admin self-registration', async () => {
    const contractor = await client.query(`
      SELECT p.role, p.full_name, p.city, cp.business_name, cp.verification_status
      FROM public.profiles p JOIN public.contractor_profiles cp ON cp.id = p.id
      WHERE p.id = '00000000-0000-0000-0000-000000000060';
    `);
    const legacyAdmin = await client.query(`SELECT id FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000061';`);
    if (contractor.rows.length !== 1 || contractor.rows[0].role !== 'contractor'
      || contractor.rows[0].full_name !== 'Legacy Contractor' || contractor.rows[0].city !== 'Giza'
      || contractor.rows[0].business_name !== 'Legacy Contractor' || contractor.rows[0].verification_status !== 'pending') {
      throw new Error('Legacy contractor profile was not safely backfilled with pending verification');
    }
    if (legacyAdmin.rows.length !== 0) throw new Error('Legacy admin metadata must not create a self-assigned profile');

    await client.query(`
      INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
        ('00000000-0000-0000-0000-000000000050', 'new-contractor@buildmatch.local', '{"role":"contractor","full_name":"New Contractor","city":"Cairo"}'),
        ('00000000-0000-0000-0000-000000000051', 'attempted-admin@buildmatch.local', '{"role":"admin","full_name":"Attempted Admin"}');
    `);
    const newContractor = await client.query(`
      SELECT p.role, cp.verification_status FROM public.profiles p
      JOIN public.contractor_profiles cp ON cp.id = p.id
      WHERE p.id = '00000000-0000-0000-0000-000000000050';
    `);
    const attemptedAdmin = await client.query(`SELECT role FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000051';`);
    if (newContractor.rows.length !== 1 || newContractor.rows[0].role !== 'contractor'
      || newContractor.rows[0].verification_status !== 'pending') {
      throw new Error('Auth signup trigger did not create a pending contractor profile');
    }
    if (attemptedAdmin.rows.length !== 1 || attemptedAdmin.rows[0].role !== 'landowner') {
      throw new Error('User-controlled Auth metadata assigned an administrative profile');
    }
  });

  await test('Auth Trigger Security: Bootstrap function is not directly executable by API roles and timestamp path is fixed', async () => {
    const fn = 'public.handle_new_auth_user()';
    for (const role of ['anon', 'authenticated', 'service_role']) {
      const { rows } = await client.query(`SELECT has_function_privilege('${role}', '${fn}', 'EXECUTE') AS can_exec;`);
      if (rows[0].can_exec) throw new Error(`Auth trigger function is directly executable by ${role}`);
    }
    const { rows } = await client.query(`
      SELECT p.proconfig FROM pg_proc p
      WHERE p.oid = 'public.handle_updated_at()'::regprocedure;
    `);
    if (!rows[0].proconfig?.some((setting) => setting.startsWith('search_path='))) {
      throw new Error('handle_updated_at must have a fixed search_path');
    }
  });

  // ----------------------------------------------------------------------------
  // GROUP 1: FUNCTION PRIVILEGE CHECKS (Verifying migrations without test contamination)
  // ----------------------------------------------------------------------------
  await test('Function Grants: Sensitive RPCs are revoked from anon and granted to authenticated', async () => {
    const sensitiveFunctions = [
      'public.select_contractor_for_package(uuid, uuid)',
      'public.admin_verify_contractor(uuid, text, text)',
      'public.request_package_handover(uuid)',
      'public.approve_package_completion(uuid)',
      'public.decide_change_request(uuid, text, text)',
      'public.publish_project_package(uuid)',
      'public.withdraw_proposal(uuid)'
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
      if (fn.includes('publish_project_package') || fn.includes('withdraw_proposal')) {
        const serviceRes = await client.query(`SELECT has_function_privilege('service_role', '${fn}', 'EXECUTE') AS can_exec;`);
        if (serviceRes.rows[0].can_exec) throw new Error(`Trusted RPC ${fn} should not be directly executable by service_role`);
      }
    }

    // Public lookup function MUST be executable by anon and authenticated
    const pubResAnon = await client.query(`SELECT has_function_privilege('anon', 'public.get_public_contractor_profile(uuid)', 'EXECUTE') as can_exec;`);
    const pubResAuth = await client.query(`SELECT has_function_privilege('authenticated', 'public.get_public_contractor_profile(uuid)', 'EXECUTE') as can_exec;`);
    if (pubResAnon.rows[0].can_exec !== true || pubResAuth.rows[0].can_exec !== true) {
      throw new Error('Public contractor profile function must be executable by anon and authenticated');
    }
  });

  await test('Business Update Privileges: Client writes are column-limited and decision fields are RPC-only', async () => {
    for (const role of ['anon', 'authenticated']) {
      for (const table of ['change_requests', 'project_packages', 'proposals']) {
        const { rows } = await client.query(`SELECT has_table_privilege('${role}', 'public.${table}', 'UPDATE') AS can_update;`);
        if (rows[0].can_update) throw new Error(`${role} still has table-level UPDATE on ${table}`);
      }
    }
    const { rows: publicTableUpdate } = await client.query(`
      SELECT count(*)::int AS count
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace,
        LATERAL aclexplode(c.relacl) acl
      WHERE n.nspname = 'public' AND c.relname IN ('change_requests', 'project_packages', 'proposals')
        AND acl.grantee = 0 AND acl.privilege_type = 'UPDATE';
    `);
    const { rows: publicColumnUpdate } = await client.query(`
      SELECT count(*)::int AS count
      FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace,
        LATERAL aclexplode(a.attacl) acl
      WHERE n.nspname = 'public' AND c.relname IN ('change_requests', 'project_packages', 'proposals')
        AND a.attnum > 0 AND NOT a.attisdropped AND acl.grantee = 0 AND acl.privilege_type = 'UPDATE';
    `);
    if (publicTableUpdate[0].count !== 0 || publicColumnUpdate[0].count !== 0) {
      throw new Error('PUBLIC retains direct table or column UPDATE privileges on protected business tables');
    }

    const checks = [
      ['anon', 'milestones', 'id', 'UPDATE', false],
      ['authenticated', 'milestones', 'status', 'UPDATE', false],
      ['service_role', 'milestones', 'status', 'UPDATE', true],
      ['authenticated', 'project_packages', 'title', 'UPDATE', true],
      ['authenticated', 'project_packages', 'status', 'UPDATE', false],
      ['authenticated', 'project_packages', 'assigned_contractor_id', 'UPDATE', false],
      ['anon', 'project_packages', 'title', 'UPDATE', false],
      ['authenticated', 'project_packages', 'title', 'INSERT', true],
      ['authenticated', 'project_packages', 'status', 'INSERT', false],
      ['authenticated', 'proposals', 'total_price', 'UPDATE', true],
      ['authenticated', 'proposals', 'status', 'UPDATE', false],
      ['authenticated', 'proposals', 'submitted_at', 'INSERT', false],
      ['authenticated', 'change_requests', 'status', 'UPDATE', false],
    ];
    for (const [role, table, column, privilege, expected] of checks) {
      const { rows } = await client.query(`SELECT has_column_privilege('${role}', 'public.${table}', '${column}', '${privilege}') AS allowed;`);
      if (rows[0].allowed !== expected) throw new Error(`${role} ${privilege} on ${table}.${column} expected ${expected}, got ${rows[0].allowed}`);
    }
    for (const table of ['change_requests', 'project_packages', 'proposals']) {
      const { rows } = await client.query(`SELECT has_table_privilege('service_role', 'public.${table}', 'UPDATE') AS allowed;`);
      if (!rows[0].allowed) throw new Error(`Trusted service_role UPDATE was not retained on ${table}`);
    }
    const { rows: insertRows } = await client.query(`
      SELECT has_table_privilege('authenticated', 'public.change_requests', 'INSERT') AS change_insert,
        has_table_privilege('authenticated', 'public.project_packages', 'SELECT') AS package_select,
        has_table_privilege('authenticated', 'public.proposals', 'SELECT') AS proposal_select;
    `);
    if (!insertRows[0].change_insert || !insertRows[0].package_select || !insertRows[0].proposal_select) {
      throw new Error('Required request INSERT or business-object SELECT privileges were removed');
    }
  });

  await test('Package Publication: Direct status/assignment writes fail and owner RPC publishes drafts', async () => {
    const packageId = '22222222-2222-2222-2222-222222222296';
    await client.query(`
      INSERT INTO public.project_packages (id, project_id, title, category, description, scope_of_work)
      VALUES ('${packageId}', '${PROJECT_ID}', 'Hardened package', 'masonry', 'Package test', 'Test scope')
      ON CONFLICT (id) DO UPDATE SET status = 'draft', assigned_contractor_id = NULL, assigned_proposal_id = NULL;
    `);

    let directWriteDenied = false;
    try {
      await asUser(LANDOWNER_ID, 'authenticated', () => client.query(`
        UPDATE public.project_packages
        SET status = 'assigned', assigned_contractor_id = '${CONTRACTOR1_APPROVED}'
        WHERE id = '${packageId}';
      `));
    } catch (err) { directWriteDenied = err.code === '42501'; }
    if (!directWriteDenied) throw new Error('Direct package status/assignment UPDATE was not blocked');

    const published = await asUser(LANDOWNER_ID, 'authenticated', () => client.query(
      `SELECT (public.publish_project_package('${packageId}')).status AS status;`
    ));
    if (published.rows[0]?.status !== 'open') throw new Error('Project owner could not publish a draft through the RPC');

    let unrelatedUserDenied = false;
    try {
      await asUser(CONTRACTOR1_APPROVED, 'authenticated', () => client.query(
        `SELECT public.publish_project_package('${packageId}');`
      ));
    } catch (err) { unrelatedUserDenied = err.code === '42501'; }
    if (!unrelatedUserDenied) throw new Error('Unrelated contractor published a project package');
  });

  await test('Proposal Lifecycle: Accepted proposals are immutable and contractor withdrawal uses its RPC', async () => {
    const packageId = '22222222-2222-2222-2222-222222222296';
    const acceptedId = '33333333-3333-3333-3333-333333333394';
    const submittedId = '33333333-3333-3333-3333-333333333393';
    await client.query(`
      INSERT INTO public.proposals (id, package_id, contractor_id, total_price, proposed_duration_days, scope_summary, payment_schedule_terms, status)
      VALUES
        ('${acceptedId}', '${packageId}', '${CONTRACTOR1_APPROVED}', 10000, 10, 'Accepted bid', 'Terms', 'accepted'),
        ('${submittedId}', '${packageId}', '${CONTRACTOR3_APPROVED}', 12000, 12, 'Submitted bid', 'Terms', 'submitted')
      ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
    `);

    const acceptedUpdate = await asUser(CONTRACTOR1_APPROVED, 'authenticated', () => client.query(`
      UPDATE public.proposals SET total_price = 1 WHERE id = '${acceptedId}' RETURNING id;
    `));
    if (acceptedUpdate.rows.length !== 0) throw new Error('Contractor changed an accepted proposal');

    let directStatusDenied = false;
    try {
      await asUser(CONTRACTOR3_APPROVED, 'authenticated', () => client.query(`
        UPDATE public.proposals SET status = 'withdrawn' WHERE id = '${submittedId}';
      `));
    } catch (err) { directStatusDenied = err.code === '42501'; }
    if (!directStatusDenied) throw new Error('Contractor changed proposal status outside the withdrawal RPC');

    const withdrawn = await asUser(CONTRACTOR3_APPROVED, 'authenticated', () => client.query(
      `SELECT (public.withdraw_proposal('${submittedId}')).status AS status;`
    ));
    if (withdrawn.rows[0]?.status !== 'withdrawn') throw new Error('Contractor could not withdraw their submitted proposal');

    let wrongOwnerDenied = false;
    try {
      await asUser(CONTRACTOR1_APPROVED, 'authenticated', () => client.query(
        `SELECT public.withdraw_proposal('${submittedId}');`
      ));
    } catch (err) { wrongOwnerDenied = err.code === '42501'; }
    if (!wrongOwnerDenied) throw new Error('A different contractor withdrew this proposal');
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

  await test('View Security: contractor_public_directory has security_invoker = true', async () => {
    const res = await client.query(`
      SELECT c.relname, c.reloptions
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'contractor_public_directory';
    `);
    if (res.rows.length !== 1) {
      throw new Error('View public.contractor_public_directory does not exist');
    }
    const reloptions = res.rows[0].reloptions || [];
    const hasSecInvoker = reloptions.some(opt => opt === 'security_invoker=true' || opt === 'security_invoker=on');
    if (!hasSecInvoker) {
      throw new Error(`Expected security_invoker=true on contractor_public_directory, found: ${JSON.stringify(reloptions)}`);
    }
  });

// Updated tests for contractor_public_directory with security_invoker
  await test('Profiles Privacy: anon cannot see any contractors in public directory (RLS enforced)', async () => {
    const res = await asUser(null, 'anon', async () => {
      return client.query(`SELECT * FROM public.contractor_public_directory;`);
    });
    if (res.rows.length !== 0) {
      throw new Error(`Expected 0 rows for anon in contractor_public_directory, got ${res.rows.length}`);
    }
  });

  await test('Profiles Privacy: authenticated users see approved contractors without phone/notes', async () => {
    const res = await asUser(CONTRACTOR1_APPROVED, 'authenticated', async () => {
      return client.query(`SELECT * FROM public.contractor_public_directory;`);
    });
    if (res.rows.length < 1) {
      throw new Error('Expected at least 1 approved contractor in public directory for authenticated user');
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

  await test('Milestone Privileges: Exact table, column, SELECT/INSERT, and RPC grants', async () => {
    const privileges = await client.query(`
      WITH columns AS (
        SELECT attname
        FROM pg_attribute
        WHERE attrelid = 'public.milestones'::regclass
          AND attnum > 0 AND NOT attisdropped
      ), relation_acl AS (
        SELECT COALESCE(bool_or(acl.grantee = 0 AND acl.privilege_type = 'UPDATE'), false) AS public_table_update
        FROM pg_class c
        CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) acl
        WHERE c.oid = 'public.milestones'::regclass
      ), column_acl AS (
        SELECT
          count(*) FILTER (WHERE acl.grantee = 0 AND acl.privilege_type = 'UPDATE') AS public_column_acl_updates,
          count(*) FILTER (WHERE acl.grantee = (SELECT oid FROM pg_roles WHERE rolname = 'anon') AND acl.privilege_type = 'UPDATE') AS anon_column_acl_updates,
          count(*) FILTER (WHERE acl.grantee = (SELECT oid FROM pg_roles WHERE rolname = 'authenticated') AND acl.privilege_type = 'UPDATE') AS auth_column_acl_updates,
          count(*) FILTER (WHERE acl.grantee = (SELECT oid FROM pg_roles WHERE rolname = 'service_role') AND acl.privilege_type = 'UPDATE') AS service_column_acl_updates
        FROM pg_attribute a
        CROSS JOIN LATERAL aclexplode(a.attacl) acl
        WHERE a.attrelid = 'public.milestones'::regclass
          AND a.attnum > 0 AND NOT a.attisdropped
      )
      SELECT relation_acl.public_table_update,
             has_table_privilege('anon', 'public.milestones', 'UPDATE') AS anon_table_update,
             has_table_privilege('authenticated', 'public.milestones', 'UPDATE') AS auth_table_update,
             has_table_privilege('service_role', 'public.milestones', 'UPDATE') AS service_table_update,
             column_acl.*,
             (SELECT count(*) FROM columns WHERE has_column_privilege('anon', 'public.milestones', attname, 'UPDATE')) AS anon_effective_column_updates,
             (SELECT count(*) FROM columns WHERE has_column_privilege('authenticated', 'public.milestones', attname, 'UPDATE')) AS auth_effective_column_updates,
             (SELECT count(*) FROM columns WHERE has_column_privilege('service_role', 'public.milestones', attname, 'UPDATE')) AS service_effective_column_updates,
             has_table_privilege('anon', 'public.milestones', 'SELECT') AS anon_select,
             has_table_privilege('anon', 'public.milestones', 'INSERT') AS anon_insert,
             has_table_privilege('authenticated', 'public.milestones', 'SELECT') AS auth_select,
             has_table_privilege('authenticated', 'public.milestones', 'INSERT') AS auth_insert,
             has_table_privilege('service_role', 'public.milestones', 'SELECT') AS service_select,
             has_table_privilege('service_role', 'public.milestones', 'INSERT') AS service_insert,
             has_function_privilege('anon', 'public.update_milestone_status(uuid,text,text)', 'EXECUTE') AS anon_rpc,
             has_function_privilege('authenticated', 'public.update_milestone_status(uuid,text,text)', 'EXECUTE') AS auth_rpc,
             has_function_privilege('service_role', 'public.update_milestone_status(uuid,text,text)', 'EXECUTE') AS service_rpc,
             proc.prosecdef AS security_definer,
             proc.proconfig @> ARRAY['search_path=pg_catalog, public, auth, pg_temp'] AS fixed_search_path,
             NOT EXISTS (
               SELECT 1 FROM aclexplode(COALESCE(proc.proacl, acldefault('f', proc.proowner))) acl
               WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
             ) AS public_rpc_revoked
      FROM pg_proc proc
      CROSS JOIN relation_acl
      CROSS JOIN column_acl
      WHERE proc.oid = 'public.update_milestone_status(uuid,text,text)'::regprocedure;
    `);
    const p = privileges.rows[0];
    const columnsCount = 14;
    if (!p || p.public_table_update || p.anon_table_update || p.auth_table_update || !p.service_table_update
      || Number(p.public_column_acl_updates) !== 0 || Number(p.anon_column_acl_updates) !== 0 || Number(p.auth_column_acl_updates) !== 0 || Number(p.service_column_acl_updates) !== 0
      || Number(p.anon_effective_column_updates) !== 0 || Number(p.auth_effective_column_updates) !== 0
      || Number(p.service_effective_column_updates) !== columnsCount
      || !p.anon_select || !p.anon_insert || !p.auth_select || !p.auth_insert || !p.service_select || !p.service_insert
      || p.anon_rpc || !p.auth_rpc || p.service_rpc || !p.security_definer || !p.fixed_search_path || !p.public_rpc_revoked) {
      throw new Error(`Unexpected milestone privileges: ${JSON.stringify(p)}`);
    }
    const publicFunctionExecute = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM aclexplode(COALESCE(proc.proacl, acldefault('f', proc.proowner))) acl
        WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
      ) AS allowed
      FROM pg_proc proc
      WHERE proc.oid = 'public.update_milestone_status(uuid,text,text)'::regprocedure;
    `);
    if (publicFunctionExecute.rows[0].allowed) throw new Error('PUBLIC retains milestone RPC EXECUTE');
  });

  await test('Milestone Authentication: Anonymous and missing-uid callers cannot transition', async () => {
    await seedMilestone(MILESTONE_PENDING_ID, 1, 'pending');
    for (const [uid, role] of [[null, 'anon'], [null, 'authenticated']]) {
      let rejected = false;
      try {
        await asUser(uid, role, () => client.query(
          `SELECT public.update_milestone_status('${MILESTONE_PENDING_ID}', 'in_progress', NULL);`
        ));
      } catch (err) { rejected = err.code === '42501'; }
      if (!rejected) throw new Error(`Expected SQLSTATE 42501 for ${role} with no user id`);
    }
  });

  await test('Milestone Direct Writes: Authenticated clients cannot update status or protected fields', async () => {
    const original = await client.query(`SELECT * FROM public.milestones WHERE id = '${MILESTONE_PENDING_ID}';`);
    for (const mutation of [
      `status = 'approved'`,
      `title = 'Tampered title'`,
      `description = 'Tampered description'`,
      `sequence_order = 9`,
      `due_date = CURRENT_DATE`,
      `payment_percentage = 99`,
      `package_id = '${PKG1_ID}'`,
    ]) {
      let rejected = false;
      try {
        await asUser(CONTRACTOR1_APPROVED, 'authenticated', () => client.query(
          `UPDATE public.milestones SET ${mutation} WHERE id = '${MILESTONE_PENDING_ID}';`
        ));
      } catch (err) { rejected = err.code === '42501'; }
      if (!rejected) throw new Error(`Direct milestone mutation was not denied: ${mutation}`);
    }
    let anonRejected = false;
    try {
      await asUser(null, 'anon', () => client.query(
        `UPDATE public.milestones SET status = 'approved' WHERE id = '${MILESTONE_PENDING_ID}';`
      ));
    } catch (err) { anonRejected = err.code === '42501'; }
    if (!anonRejected) throw new Error('Anonymous direct milestone UPDATE was not denied');
    const after = await client.query(`SELECT * FROM public.milestones WHERE id = '${MILESTONE_PENDING_ID}';`);
    if (JSON.stringify(original.rows[0]) !== JSON.stringify(after.rows[0])) throw new Error('A denied direct write changed the milestone');
  });

  await test('Milestone Contractor Flow: Start and submit valid transitions with DB timestamps', async () => {
    const before = await client.query(`SELECT title, description, package_id, sequence_order, due_date, payment_percentage, payment_amount FROM public.milestones WHERE id = '${MILESTONE_PENDING_ID}';`);
    const started = await asUser(CONTRACTOR1_APPROVED, 'authenticated', () => client.query(
      `SELECT (public.update_milestone_status('${MILESTONE_PENDING_ID}', 'in_progress', NULL)).status AS status;`
    ));
    if (started.rows[0]?.status !== 'in_progress') throw new Error('Contractor start transition did not return the updated status');

    const submitted = await asUser(CONTRACTOR1_APPROVED, 'authenticated', () => client.query(
      `SELECT (public.update_milestone_status('${MILESTONE_PENDING_ID}', 'submitted_for_review', NULL)).status AS status;`
    ));
    const submissionRow = await client.query(`SELECT status, submitted_at, approved_at FROM public.milestones WHERE id = '${MILESTONE_PENDING_ID}';`);
    if (submitted.rows[0]?.status !== 'submitted_for_review' || submissionRow.rows[0]?.submitted_at == null || submissionRow.rows[0]?.approved_at != null) {
      throw new Error('Submission timestamps/status are incorrect');
    }
    const after = await client.query(`SELECT title, description, package_id, sequence_order, due_date, payment_percentage, payment_amount FROM public.milestones WHERE id = '${MILESTONE_PENDING_ID}';`);
    if (JSON.stringify(before.rows[0]) !== JSON.stringify(after.rows[0])) throw new Error('Status RPC changed protected milestone fields');
  });

  await test('Milestone Review/Rework: Owner decisions, required notes, and contractor resume flow', async () => {
    await seedMilestone(MILESTONE_REVIEW_ID, 2, 'submitted_for_review');
    let blankNotesRejected = false;
    try {
      await asUser(LANDOWNER_ID, 'authenticated', () => client.query(
        `SELECT public.update_milestone_status('${MILESTONE_REVIEW_ID}', 'rework_required', '   ');`
      ));
    } catch (err) { blankNotesRejected = err.code === '22023'; }
    if (!blankNotesRejected) throw new Error('Rework with blank notes was not rejected with 22023');
    const afterFailure = await client.query(`SELECT status, submitted_at, approved_at, rework_notes FROM public.milestones WHERE id = '${MILESTONE_REVIEW_ID}';`);
    if (afterFailure.rows[0].status !== 'submitted_for_review' || afterFailure.rows[0].rework_notes !== null) throw new Error('Invalid rework partially changed milestone');

    await asUser(LANDOWNER_ID, 'authenticated', () => client.query(
      `SELECT (public.update_milestone_status('${MILESTONE_REVIEW_ID}', 'rework_required', 'Please correct the finish.')).status;`
    ));
    const rework = await client.query(`SELECT status, rework_notes, approved_at FROM public.milestones WHERE id = '${MILESTONE_REVIEW_ID}';`);
    if (rework.rows[0]?.status !== 'rework_required' || rework.rows[0]?.rework_notes !== 'Please correct the finish.' || rework.rows[0]?.approved_at != null) throw new Error('Owner rework decision was not recorded correctly');

    await asUser(CONTRACTOR1_APPROVED, 'authenticated', () => client.query(
      `SELECT (public.update_milestone_status('${MILESTONE_REVIEW_ID}', 'in_progress', NULL)).status;`
    ));
    const resumed = await client.query(`SELECT status, rework_notes FROM public.milestones WHERE id = '${MILESTONE_REVIEW_ID}';`);
    if (resumed.rows[0]?.status !== 'in_progress' || resumed.rows[0]?.rework_notes !== 'Please correct the finish.') throw new Error('Resume did not preserve the rework note');
    const resubmitted = await asUser(CONTRACTOR1_APPROVED, 'authenticated', () => client.query(
      `SELECT (public.update_milestone_status('${MILESTONE_REVIEW_ID}', 'submitted_for_review', NULL)).status;`
    ));
    if (resubmitted.rows[0]?.status !== 'submitted_for_review') throw new Error('Contractor could not resubmit after rework');
    await asUser(LANDOWNER_ID, 'authenticated', () => client.query(
      `SELECT (public.update_milestone_status('${MILESTONE_REVIEW_ID}', 'approved', NULL)).status;`
    ));
    const approved = await client.query(`SELECT status, approved_at, submitted_at FROM public.milestones WHERE id = '${MILESTONE_REVIEW_ID}';`);
    if (approved.rows[0]?.status !== 'approved' || approved.rows[0]?.approved_at == null || approved.rows[0]?.submitted_at == null) throw new Error('Approval timestamps/status are incorrect');
  });

  await test('Milestone Authorization: Owner, unrelated user, and transition graph enforced', async () => {
    await seedMilestone(MILESTONE_PENDING_ID, 1, 'pending');
    for (const [uid, status] of [[LANDOWNER_ID, 'in_progress'], [STRANGER_ID, 'in_progress'], [CONTRACTOR1_APPROVED, 'approved']]) {
      let rejected = false;
      try {
        await asUser(uid, 'authenticated', () => client.query(
          `SELECT public.update_milestone_status('${MILESTONE_PENDING_ID}', '${status}', NULL);`
        ));
      } catch (err) { rejected = err.code === '42501'; }
      if (!rejected) throw new Error(`${uid} unexpectedly performed ${status} from pending`);
    }
    let unknownRejected = false;
    try {
      await asUser(CONTRACTOR1_APPROVED, 'authenticated', () => client.query(
        `SELECT public.update_milestone_status('${MILESTONE_PENDING_ID}', 'queued', NULL);`
      ));
    } catch (err) { unknownRejected = err.code === '22023'; }
    if (!unknownRejected) throw new Error('Unknown status did not fail with SQLSTATE 22023');
    let missingRejected = false;
    try {
      await asUser(CONTRACTOR1_APPROVED, 'authenticated', () => client.query(
        `SELECT public.update_milestone_status('44444444-4444-4444-4444-444444444499', 'in_progress', NULL);`
      ));
    } catch (err) { missingRejected = err.code === 'P0002'; }
    if (!missingRejected) throw new Error('Missing milestone did not fail with SQLSTATE P0002');

    await seedMilestone(MILESTONE_PENDING_ID, 1, 'pending', null);
    let unassignedPackageOwnerRejected = false;
    try {
      await asUser(LANDOWNER_ID, 'authenticated', () => client.query(
        `SELECT public.update_milestone_status('${MILESTONE_PENDING_ID}', 'in_progress', NULL);`
      ));
    } catch (err) { unassignedPackageOwnerRejected = err.code === '42501'; }
    if (!unassignedPackageOwnerRejected) throw new Error('Owner transitioned an unassigned package milestone through NULL role logic');
    const unchanged = await client.query(`SELECT status FROM public.milestones WHERE id = '${MILESTONE_PENDING_ID}';`);
    if (unchanged.rows[0]?.status !== 'pending') throw new Error('Denied unassigned milestone transition changed its status');
  });

  await test('Milestone Project Ownership: Only the actual project owner may review', async () => {
    await client.query(`
      INSERT INTO auth.users (id, email) VALUES ('${STRANGER_ID}', 'other-owner@buildmatch.local') ON CONFLICT DO NOTHING;
      INSERT INTO public.profiles (id, role, full_name, city) VALUES ('${STRANGER_ID}', 'landowner', 'Other Owner', 'Cairo') ON CONFLICT (id) DO UPDATE SET role = 'landowner';
      INSERT INTO public.projects (id, owner_id, title, description, city, land_area_sqm, floors_count, construction_type, status)
      VALUES ('${OTHER_PROJECT_ID}', '${STRANGER_ID}', 'Other owner project', 'Test project', 'Cairo', 100, 1, 'renovation', 'draft')
      ON CONFLICT (id) DO UPDATE SET owner_id = EXCLUDED.owner_id;
      INSERT INTO public.project_packages (id, project_id, title, category, description, scope_of_work, status, assigned_contractor_id)
      VALUES ('${OTHER_PACKAGE_ID}', '${OTHER_PROJECT_ID}', 'Other owner package', 'masonry', 'Test', 'Test', 'in_progress', '${CONTRACTOR1_APPROVED}')
      ON CONFLICT (id) DO UPDATE SET project_id = EXCLUDED.project_id, assigned_contractor_id = EXCLUDED.assigned_contractor_id;
      INSERT INTO public.milestones (id, package_id, title, description, sequence_order, status)
      VALUES ('${OTHER_MILESTONE_ID}', '${OTHER_PACKAGE_ID}', 'Other owner review', 'Test', 1, 'submitted_for_review')
      ON CONFLICT (id) DO UPDATE SET package_id = EXCLUDED.package_id, status = 'submitted_for_review';
    `);
    let unrelatedOwnerRejected = false;
    try {
      await asUser(LANDOWNER_ID, 'authenticated', () => client.query(
        `SELECT public.update_milestone_status('${OTHER_MILESTONE_ID}', 'approved', NULL);`
      ));
    } catch (err) { unrelatedOwnerRejected = err.code === '42501'; }
    if (!unrelatedOwnerRejected) throw new Error('A different landowner approved this project milestone');
    const actualOwner = await asUser(STRANGER_ID, 'authenticated', () => client.query(
      `SELECT (public.update_milestone_status('${OTHER_MILESTONE_ID}', 'approved', NULL)).status AS status;`
    ));
    if (actualOwner.rows[0]?.status !== 'approved') throw new Error('The actual project owner could not approve their milestone');
  });

  await test('Milestone Contractor Review Denial: Contractor cannot approve or request rework', async () => {
    await seedMilestone(MILESTONE_REVIEW_ID, 2, 'submitted_for_review');
    for (const status of ['approved', 'rework_required']) {
      let rejected = false;
      try {
        await asUser(CONTRACTOR1_APPROVED, 'authenticated', () => client.query(
          `SELECT public.update_milestone_status('${MILESTONE_REVIEW_ID}', '${status}', 'Contractor attempted review');`
        ));
      } catch (err) { rejected = err.code === '42501'; }
      if (!rejected) throw new Error(`Assigned contractor performed forbidden review action: ${status}`);
    }
    const unchanged = await client.query(`SELECT status, rework_notes FROM public.milestones WHERE id = '${MILESTONE_REVIEW_ID}';`);
    if (unchanged.rows[0]?.status !== 'submitted_for_review' || unchanged.rows[0]?.rework_notes !== null) throw new Error('Denied contractor review request changed the milestone');
  });

  await test('Milestone Admin: Admin may review submissions but cannot start execution', async () => {
    await seedMilestone(MILESTONE_ADMIN_ID, 4, 'pending');
    let startRejected = false;
    try {
      await asUser(ADMIN_ID, 'authenticated', () => client.query(
        `SELECT public.update_milestone_status('${MILESTONE_ADMIN_ID}', 'in_progress', NULL);`
      ));
    } catch (err) { startRejected = err.code === '42501'; }
    if (!startRejected) throw new Error('Admin unexpectedly started contractor execution');
    await client.query(`UPDATE public.milestones SET status = 'submitted_for_review' WHERE id = '${MILESTONE_ADMIN_ID}';`);
    await asUser(ADMIN_ID, 'authenticated', () => client.query(
      `SELECT (public.update_milestone_status('${MILESTONE_ADMIN_ID}', 'approved', NULL)).status;`
    ));
    const result = await client.query(`SELECT status FROM public.milestones WHERE id = '${MILESTONE_ADMIN_ID}';`);
    if (result.rows[0]?.status !== 'approved') throw new Error('Admin review permission did not match the existing UI contract');
  });

  await test('Milestone Multi-Role: Admin assigned as contractor retains execution and review actions', async () => {
    await client.query(`
      INSERT INTO public.contractor_profiles (id, business_name, verification_status)
      VALUES ('${ADMIN_ID}', 'Admin test contractor profile', 'approved')
      ON CONFLICT (id) DO NOTHING;
    `);
    await seedMilestone(MILESTONE_ADMIN_ID, 4, 'pending', ADMIN_ID);
    await asUser(ADMIN_ID, 'authenticated', () => client.query(
      `SELECT public.update_milestone_status('${MILESTONE_ADMIN_ID}', 'in_progress', NULL);`
    ));
    await asUser(ADMIN_ID, 'authenticated', () => client.query(
      `SELECT public.update_milestone_status('${MILESTONE_ADMIN_ID}', 'submitted_for_review', NULL);`
    ));
    const approved = await asUser(ADMIN_ID, 'authenticated', () => client.query(
      `SELECT (public.update_milestone_status('${MILESTONE_ADMIN_ID}', 'approved', NULL)).status AS status;`
    ));
    if (approved.rows[0]?.status !== 'approved') throw new Error('Admin assigned contractor lost an authorized review transition');

    await seedMilestone(MILESTONE_ADMIN_ID, 4, 'pending', ADMIN_ID);
    let invalidReviewRejected = false;
    try {
      await asUser(ADMIN_ID, 'authenticated', () => client.query(
        `SELECT public.update_milestone_status('${MILESTONE_ADMIN_ID}', 'approved', NULL);`
      ));
    } catch (err) { invalidReviewRejected = err.code === '42501'; }
    if (!invalidReviewRejected) throw new Error('Admin/contractor combination bypassed the old-state transition graph');
  });

  await test('Milestone Multi-Role: Project owner also assigned as contractor retains both scoped actions', async () => {
    await client.query(`
      INSERT INTO public.contractor_profiles (id, business_name, verification_status)
      VALUES ('${LANDOWNER_ID}', 'Owner test contractor profile', 'approved')
      ON CONFLICT (id) DO NOTHING;
    `);
    await seedMilestone(MILESTONE_ADMIN_ID, 4, 'pending', LANDOWNER_ID);
    await asUser(LANDOWNER_ID, 'authenticated', () => client.query(
      `SELECT public.update_milestone_status('${MILESTONE_ADMIN_ID}', 'in_progress', NULL);`
    ));
    await asUser(LANDOWNER_ID, 'authenticated', () => client.query(
      `SELECT public.update_milestone_status('${MILESTONE_ADMIN_ID}', 'submitted_for_review', NULL);`
    ));
    const approved = await asUser(LANDOWNER_ID, 'authenticated', () => client.query(
      `SELECT (public.update_milestone_status('${MILESTONE_ADMIN_ID}', 'approved', NULL)).status AS status;`
    ));
    if (approved.rows[0]?.status !== 'approved') throw new Error('Owner/contractor combination lost one of its authorized actions');
  });

  await test('Milestone Concurrency: Conflicting submissions serialize under row lock', async () => {
    await seedMilestone(MILESTONE_CONCURRENCY_ID, 3, 'in_progress');
    const clientA = new Client({ host: '127.0.0.1', port: TEST_PORT, user: 'postgres', database: DB_NAME });
    const clientB = new Client({ host: '127.0.0.1', port: TEST_PORT, user: 'postgres', database: DB_NAME });
    await clientA.connect();
    await clientB.connect();
    try {
      const call = (targetClient) => asUser(CONTRACTOR1_APPROVED, 'authenticated', () => targetClient.query(
        `SELECT public.update_milestone_status('${MILESTONE_CONCURRENCY_ID}', 'submitted_for_review', NULL);`
      ), targetClient);
      const outcomes = await Promise.allSettled([call(clientA), call(clientB)]);
      const successes = outcomes.filter((outcome) => outcome.status === 'fulfilled').length;
      const denied = outcomes.filter((outcome) => outcome.status === 'rejected' && outcome.reason.code === '42501').length;
      if (successes !== 1 || denied !== 1) throw new Error(`Expected one success and one transition denial, got ${successes} success / ${denied} denied`);
    } finally { await clientA.end(); await clientB.end(); }
    const finalRow = await client.query(`SELECT status, submitted_at FROM public.milestones WHERE id = '${MILESTONE_CONCURRENCY_ID}';`);
    if (finalRow.rows[0]?.status !== 'submitted_for_review' || finalRow.rows[0]?.submitted_at == null) throw new Error('Concurrent transition left invalid milestone state');
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

    let directDecisionDenied = false;
    try {
      await asUser(CONTRACTOR1_APPROVED, 'authenticated', () => client.query(`
        UPDATE public.change_requests SET status = 'approved'
        WHERE id = '${crId}';
      `));
    } catch (err) { directDecisionDenied = err.code === '42501'; }
    if (!directDecisionDenied) throw new Error('Change request decision was writable outside its RPC');

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
  return { passed, failed };
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
    const securityResults = await runRealSecurityTests();

    // Run Migration Cycle 2 (Repeatability / Idempotence Verification from zero)
    await executeMigrationCycle(2);

    const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n======================================================================`);
    console.log(`ALL 2 MIGRATION RUNS AND ${securityResults.passed} REAL SECURITY TESTS PASSED (${totalSeconds}s)`);
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
