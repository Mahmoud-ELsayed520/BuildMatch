/**
 * BuildMatch Real PostgreSQL Migration & Security Integration Test Runner
 * Executes the complete migration sequence (01 to 04 + seed) on a real local PostgreSQL 18.6 instance.
 * Tests actual Row Level Security (RLS) enforcement, PL/pgSQL triggers, RPC functions, and permissions.
 */

import { spawn } from 'child_process';
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

const pgBin = 'C:\\Program Files\\PostgreSQL\\18\\bin';
const dataDir = path.join(projectRoot, '.pgdata');
const port = 5433;
const dbName = 'buildmatch_real_test';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Ensure postgres is running or start it
async function ensurePostgresRunning() {
  const testClient = new Client({
    host: '127.0.0.1',
    port,
    user: 'postgres',
    database: 'postgres'
  });

  try {
    await testClient.connect();
    await testClient.end();
    console.log('[PostgreSQL] Server already running on port', port);
    return null; // was already running
  } catch {
    // Need to start
  }

  console.log('[PostgreSQL] Starting PostgreSQL 18.6 server on port', port, '...');
  const proc = spawn(path.join(pgBin, 'postgres.exe'), [
    '-D', dataDir,
    '-p', String(port)
  ], { stdio: 'pipe' });

  proc.stderr.on('data', (d) => {
    const msg = d.toString();
    if (msg.includes('FATAL') || msg.includes('PANIC')) {
      console.error('[PostgreSQL stderr]:', msg.trim());
    }
  });

  for (let i = 0; i < 30; i++) {
    await sleep(400);
    const client = new Client({
      host: '127.0.0.1',
      port,
      user: 'postgres',
      database: 'postgres'
    });
    try {
      await client.connect();
      await client.end();
      console.log('[PostgreSQL] Server successfully started and accepting connections.');
      return proc;
    } catch {
      // Retry
    }
  }

  throw new Error('Failed to start PostgreSQL 18.6 within timeout.');
}

async function createFreshDatabase() {
  const rootClient = new Client({
    host: '127.0.0.1',
    port,
    user: 'postgres',
    database: 'postgres'
  });
  await rootClient.connect();

  // Terminate any existing connections to the test database
  await rootClient.query(`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = '${dbName}' AND pid <> pg_backend_pid();
  `);

  await rootClient.query(`DROP DATABASE IF EXISTS ${dbName};`);
  await rootClient.query(`CREATE DATABASE ${dbName};`);
  await rootClient.end();
}

async function setupSupabaseShim(client) {
  console.log('  -> Setting up Supabase system roles, auth schema, and storage tables...');
  await client.query(`
    -- 1. Create standard Supabase roles
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

    -- 2. Create auth schema and users table
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE TABLE IF NOT EXISTS auth.users (
      id UUID PRIMARY KEY,
      email TEXT,
      raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 3. Emulate auth.uid() and auth.role() via request.jwt.claim session variables
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

    -- 4. Create storage schema and tables
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

    -- Enable RLS on storage.objects (matching Supabase default)
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

    -- 5. Emulate storage.foldername helper
    CREATE OR REPLACE FUNCTION storage.foldername(name text)
    RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
    BEGIN
      RETURN string_to_array(name, '/');
    END;
    $$;

    -- 6. Grant basic schema permissions to roles
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
    GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
    GRANT SELECT ON auth.users TO anon, authenticated, service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA storage TO anon, authenticated, service_role;
  `);
}

async function grantPublicTablePrivileges(client) {
  console.log('  -> Granting table privileges to anon, authenticated, service_role (PostgREST model)...');
  await client.query(`
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA storage TO anon, authenticated, service_role;
  `);
}

async function runMigrationFile(client, filename) {
  const filePath = path.join(migrationsDir, filename);
  const sql = fs.readFileSync(filePath, 'utf-8');
  console.log(`  -> Executing migration: ${filename} ...`);
  const start = Date.now();
  await client.query(sql);
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`     ✓ Applied ${filename} successfully in ${elapsed}s`);
}

async function runSeedFile(client) {
  if (!fs.existsSync(seedFile)) {
    console.log('  -> No seed file found, skipping.');
    return;
  }
  const sql = fs.readFileSync(seedFile, 'utf-8');
  console.log(`  -> Executing development seed data: seed.sql ...`);
  const start = Date.now();
  await client.query(sql);
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`     ✓ Applied seed.sql successfully in ${elapsed}s`);
}

async function executeMigrationCycle(cycleNumber) {
  console.log(`\n======================================================================`);
  console.log(`[REAL POSTGRESQL RUN #${cycleNumber}] Executing Full Migration Sequence on PostgreSQL 18.6`);
  console.log(`======================================================================`);

  await createFreshDatabase();

  const client = new Client({
    host: '127.0.0.1',
    port,
    user: 'postgres',
    database: dbName
  });
  await client.connect();

  try {
    await setupSupabaseShim(client);
    await runMigrationFile(client, '20261116000001_initial_schema.sql');
    await runMigrationFile(client, '20261116000002_rls_policies.sql');
    await runMigrationFile(client, '20261116000003_functions_and_rpc.sql');
    await runMigrationFile(client, '20261116000004_storage_buckets.sql');
    await grantPublicTablePrivileges(client);
    await runSeedFile(client);
    console.log(`\n✓ [RUN #${cycleNumber} SUCCESS]: All 4 migrations and seed applied with ZERO skipped statements!`);
  } finally {
    await client.end();
  }
}

async function runRealSecurityTests() {
  console.log(`\n======================================================================`);
  console.log(`[REAL DATABASE SECURITY TESTS] Evaluating RLS, Triggers, RPC, and Grants`);
  console.log(`======================================================================`);

  const client = new Client({
    host: '127.0.0.1',
    port,
    user: 'postgres',
    database: dbName
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

  // Helper to run query as a specific user identity and role
  async function asUser(uid, role, queryFn) {
    await client.query('BEGIN;');
    try {
      await client.query(`SET LOCAL ROLE ${role};`);
      if (uid) {
        await client.query(`SET LOCAL "request.jwt.claim.sub" = '${uid}';`);
      }
      await client.query(`SET LOCAL "request.jwt.claim.role" = '${role}';`);
      const res = await queryFn();
      await client.query('COMMIT;');
      return res;
    } catch (e) {
      await client.query('ROLLBACK;');
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
  const PROP2_RIVAL = '33333333-3333-3333-3333-333333333332';
  const PROP_UNVERIFIED = '33333333-3333-3333-3333-333333333333';

  // Seed contractor 3 for rival proposals
  await client.query(`
    INSERT INTO auth.users (id, email) VALUES ('${CONTRACTOR3_APPROVED}', 'contractor3@buildmatch.local') ON CONFLICT DO NOTHING;
    INSERT INTO public.profiles (id, role, full_name, phone, city)
    VALUES ('${CONTRACTOR3_APPROVED}', 'contractor', 'م. حسام الدين (شركة التعمير)', '+201000000005', 'Cairo')
    ON CONFLICT DO NOTHING;
    INSERT INTO public.contractor_profiles (id, business_name, bio, specializations, years_of_experience, verification_status)
    VALUES ('${CONTRACTOR3_APPROVED}', 'شركة التعمير الهندسية', 'مقاولات متكاملة', ARRAY['concrete_skeleton'], 10, 'approved')
    ON CONFLICT DO NOTHING;
  `);

  // Test 1: User A cannot read User B's private profile
  await test('RLS Profiles: Stranger cannot read Landowner private profile', async () => {
    const res = await asUser(STRANGER_ID, 'authenticated', async () => {
      return client.query(`SELECT * FROM public.profiles WHERE id = '${LANDOWNER_ID}';`);
    });
    if (res.rows.length !== 0) {
      throw new Error(`Expected 0 rows for stranger querying landowner profile, got ${res.rows.length}`);
    }
  });

  // Test 2: An owner can read their own profile
  await test('RLS Profiles: Landowner can read own profile including phone number', async () => {
    const res = await asUser(LANDOWNER_ID, 'authenticated', async () => {
      return client.query(`SELECT * FROM public.profiles WHERE id = '${LANDOWNER_ID}';`);
    });
    if (res.rows.length !== 1) {
      throw new Error(`Expected 1 row for self-profile query, got ${res.rows.length}`);
    }
    if (!res.rows[0].phone) {
      throw new Error('Expected phone number to be visible to the profile owner');
    }
  });

  // Test 3: Public contractor directory exposes only approved public fields
  await test('Profiles Privacy: Safe Public Directory exposes only approved contractors and hides phone/notes', async () => {
    const res = await asUser(null, 'anon', async () => {
      return client.query(`SELECT * FROM public.contractor_public_directory;`);
    });
    // CONTRACTOR1_APPROVED and CONTRACTOR3_APPROVED are approved
    if (res.rows.length < 1) {
      throw new Error(`Expected at least 1 approved contractor in directory, got ${res.rows.length}`);
    }
    for (const contractor of res.rows) {
      if ('phone' in contractor) {
        throw new Error('VULNERABILITY: phone column MUST NOT exist in public contractor directory view');
      }
      if ('verification_notes' in contractor) {
        throw new Error('VULNERABILITY: verification_notes MUST NOT exist in public directory view');
      }
      if (contractor.id === CONTRACTOR2_PENDING) {
        throw new Error('VULNERABILITY: pending contractor must not appear in public directory view');
      }
    }
  });

  // Test 4: Role constraint prevents self-assigned admin
  await test('Role Integrity: Check constraint rejects self-assigned unauthorized roles', async () => {
    let threw = false;
    try {
      await client.query(`
        INSERT INTO public.profiles (id, role, full_name, city)
        VALUES ('ffffffff-0000-0000-0000-000000000001', 'super_admin_hacker', 'Hacker', 'Cairo');
      `);
    } catch {
      threw = true;
    }
    if (!threw) {
      throw new Error('Expected check constraint failure for role "super_admin_hacker"');
    }
  });

  // Test 5: Storage Authorization - Stranger cannot read private project files
  await test('Storage RLS: Stranger cannot read private project files', async () => {
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

    // Stranger queries storage.objects for private file
    const resPrivate = await asUser(STRANGER_ID, 'authenticated', async () => {
      return client.query(`SELECT * FROM storage.objects WHERE name = '${PROJECT_ID}/private_drawing.dwg';`);
    });
    if (resPrivate.rows.length !== 0) {
      throw new Error(`Stranger was able to access private file! Rows: ${resPrivate.rows.length}`);
    }

    // Stranger queries public file
    const resPublic = await asUser(STRANGER_ID, 'authenticated', async () => {
      return client.query(`SELECT * FROM storage.objects WHERE name = '${PROJECT_ID}/public_facade.jpg';`);
    });
    if (resPublic.rows.length !== 1) {
      throw new Error(`Stranger should be able to access file with is_public = true, got ${resPublic.rows.length}`);
    }

    // Owner queries private file
    const resOwner = await asUser(LANDOWNER_ID, 'authenticated', async () => {
      return client.query(`SELECT * FROM storage.objects WHERE name = '${PROJECT_ID}/private_drawing.dwg';`);
    });
    if (resOwner.rows.length !== 1) {
      throw new Error(`Owner should be able to access own private file, got ${resOwner.rows.length}`);
    }
  });

  // Test 6: Verification documents remain private to owner and admin
  await test('Verification Documents RLS: Stranger cannot read contractor verification documents', async () => {
    await client.query(`
      INSERT INTO public.verification_documents (id, contractor_id, document_type, file_path, file_name)
      VALUES ('d0000000-0000-0000-0000-000000000001', '${CONTRACTOR1_APPROVED}', 'commercial_register', 'contractor1/cr.pdf', 'cr.pdf')
      ON CONFLICT (id) DO NOTHING;
    `);

    const resStranger = await asUser(STRANGER_ID, 'authenticated', async () => {
      return client.query(`SELECT * FROM public.verification_documents;`);
    });
    if (resStranger.rows.length !== 0) {
      throw new Error(`Stranger accessed verification documents! Rows: ${resStranger.rows.length}`);
    }

    const resContractor = await asUser(CONTRACTOR1_APPROVED, 'authenticated', async () => {
      return client.query(`SELECT * FROM public.verification_documents;`);
    });
    if (resContractor.rows.length !== 1) {
      throw new Error(`Contractor should see own documents, got ${resContractor.rows.length}`);
    }
  });

  // Test 7: Unauthorized users cannot execute privileged RPC functions
  await test('RPC Authorization: Non-admin cannot call admin_verify_contractor', async () => {
    let threw = false;
    try {
      await asUser(LANDOWNER_ID, 'authenticated', async () => {
        return client.query(`SELECT public.admin_verify_contractor('${CONTRACTOR2_PENDING}', 'approved', 'Hacked');`);
      });
    } catch (e) {
      if (e.message.includes('Only platform administrators can verify contractors') || e.message.includes('Unauthorized')) {
        threw = true;
      } else {
        throw e;
      }
    }
    if (!threw) {
      throw new Error('Expected admin_verify_contractor to reject non-admin call');
    }
  });

  // Test 8: select_contractor_for_package enforces approved contractor and project ownership
  await test('RPC Contractor Selection: Cannot award package to unverified contractor', async () => {
    // Insert a proposal from unverified contractor and rival proposal from contractor 3
    await client.query(`
      INSERT INTO public.proposals (id, package_id, contractor_id, total_price, proposed_duration_days, scope_summary, payment_schedule_terms, status, submitted_at)
      VALUES
        ('${PROP2_RIVAL}', '${PKG1_ID}', '${CONTRACTOR3_APPROVED}', 1800000, 90, 'Rival proposal', 'Terms', 'submitted', NOW()),
        ('${PROP_UNVERIFIED}', '${PKG1_ID}', '${CONTRACTOR2_PENDING}', 1600000, 85, 'Unverified proposal', 'Terms', 'submitted', NOW())
      ON CONFLICT (id) DO NOTHING;
    `);

    let threw = false;
    try {
      await asUser(LANDOWNER_ID, 'authenticated', async () => {
        return client.query(`SELECT public.select_contractor_for_package('${PKG1_ID}', '${PROP_UNVERIFIED}');`);
      });
    } catch (e) {
      if (e.message.includes('Cannot award work package to an unverified or rejected contractor')) {
        threw = true;
      } else {
        throw e;
      }
    }
    if (!threw) {
      throw new Error('Expected select_contractor_for_package to reject unverified contractor');
    }
  });

  // Test 9: select_contractor_for_package is atomic and rejects second award
  await test('RPC Contractor Selection: Atomic execution and mutual exclusion of rival proposals', async () => {
    // 1. Award package to approved contractor proposal
    const res = await asUser(LANDOWNER_ID, 'authenticated', async () => {
      return client.query(`SELECT public.select_contractor_for_package('${PKG1_ID}', '${PROP1_APPROVED}');`);
    });
    const data = res.rows[0].select_contractor_for_package;
    if (!data.success) {
      throw new Error(`Award failed: ${JSON.stringify(data)}`);
    }

    // 2. Check winning proposal is accepted and rival is rejected
    const prop1 = await client.query(`SELECT status FROM public.proposals WHERE id = '${PROP1_APPROVED}';`);
    const prop2 = await client.query(`SELECT status FROM public.proposals WHERE id = '${PROP2_RIVAL}';`);
    const pkg = await client.query(`SELECT status, assigned_contractor_id FROM public.project_packages WHERE id = '${PKG1_ID}';`);

    if (prop1.rows[0].status !== 'accepted') {
      throw new Error(`Expected winning proposal to be 'accepted', got ${prop1.rows[0].status}`);
    }
    if (prop2.rows[0].status !== 'rejected') {
      throw new Error(`Expected rival proposal to be 'rejected', got ${prop2.rows[0].status}`);
    }
    if (pkg.rows[0].status !== 'assigned' || pkg.rows[0].assigned_contractor_id !== CONTRACTOR1_APPROVED) {
      throw new Error(`Package status/assigned contractor incorrect: ${JSON.stringify(pkg.rows[0])}`);
    }

    // 3. Second award attempt on already assigned package MUST fail
    let threw = false;
    try {
      await asUser(LANDOWNER_ID, 'authenticated', async () => {
        return client.query(`SELECT public.select_contractor_for_package('${PKG1_ID}', '${PROP1_APPROVED}');`);
      });
    } catch (e) {
      if (e.message.includes('Package is not currently open for selection')) {
        threw = true;
      } else {
        throw e;
      }
    }
    if (!threw) {
      throw new Error('Expected second award on already assigned package to fail');
    }
  });

  // Test 10: Project partner visibility - Landowner & assigned contractor see each other's profiles; stranger cannot
  await test('RLS Partner Visibility: Project partner visibility after assignment', async () => {
    // Since PKG1 is now assigned to CONTRACTOR1_APPROVED and owned by LANDOWNER_ID:
    // CONTRACTOR1_APPROVED should see LANDOWNER_ID
    const resContractorViewsOwner = await asUser(CONTRACTOR1_APPROVED, 'authenticated', async () => {
      return client.query(`SELECT id, full_name, phone FROM public.profiles WHERE id = '${LANDOWNER_ID}';`);
    });
    if (resContractorViewsOwner.rows.length !== 1) {
      throw new Error(`Assigned contractor should see landowner profile, got ${resContractorViewsOwner.rows.length}`);
    }

    // LANDOWNER_ID should see CONTRACTOR1_APPROVED
    const resOwnerViewsContractor = await asUser(LANDOWNER_ID, 'authenticated', async () => {
      return client.query(`SELECT id, full_name, phone FROM public.profiles WHERE id = '${CONTRACTOR1_APPROVED}';`);
    });
    if (resOwnerViewsContractor.rows.length !== 1) {
      throw new Error(`Landowner should see assigned contractor profile, got ${resOwnerViewsContractor.rows.length}`);
    }

    // Stranger still CANNOT see either
    const resStranger = await asUser(STRANGER_ID, 'authenticated', async () => {
      return client.query(`SELECT id FROM public.profiles WHERE id IN ('${LANDOWNER_ID}', '${CONTRACTOR1_APPROVED}');`);
    });
    if (resStranger.rows.length !== 0) {
      throw new Error(`Stranger should not see partner profiles, got ${resStranger.rows.length}`);
    }
  });

  await client.end();

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    throw new Error(`${failed} database security test(s) failed`);
  }
}

async function main() {
  console.log('BuildMatch Real PostgreSQL Migration & Security Test Suite');
  console.log('Target: Local PostgreSQL 18.6');
  console.log('Data Directory:', dataDir);

  let pgProcess = null;
  const start = Date.now();

  try {
    pgProcess = await ensurePostgresRunning();

    // Run Migration Cycle 1
    await executeMigrationCycle(1);

    // Run Real Security and Authorization Tests
    await runRealSecurityTests();

    // Run Migration Cycle 2 (Repeatability / Idempotence Verification)
    await executeMigrationCycle(2);

    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`\n======================================================================`);
    console.log(`ALL 2 REAL POSTGRESQL MIGRATION RUNS AND 10 SECURITY TESTS PASSED (${elapsed}s)`);
    console.log(`======================================================================\n`);
  } finally {
    if (pgProcess) {
      console.log('[PostgreSQL] Shutting down spawned test server...');
      pgProcess.kill();
    }
  }
}

main().catch((err) => {
  console.error('\n[FATAL] Test runner failed:', err.message);
  process.exit(1);
});
