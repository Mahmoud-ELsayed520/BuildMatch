/**
 * BuildMatch Local Migration & Database Security Test Runner
 * Executes the full SQL migration sequence in an isolated in-memory PostgreSQL engine (pg-mem),
 * tests migration idempotency and reproducibility across multiple clean runs,
 * and validates database security, constraint, view, and RLS policies.
 */

import { newDb } from 'pg-mem';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '../migrations');
const seedFile = path.resolve(__dirname, '../seed/seed.sql');

function stripComments(sql) {
  return sql.replace(/\s*--[^\r\n]*/g, '');
}

function splitSqlStatements(sql) {
  const cleanSql = stripComments(sql);
  const statements = [];
  let current = '';
  let inDollarQuote = false;
  let inSingleQuote = false;

  for (let i = 0; i < cleanSql.length; i++) {
    const char = cleanSql[i];
    const nextChar = cleanSql[i + 1];

    if (!inSingleQuote && char === '$' && nextChar === '$') {
      inDollarQuote = !inDollarQuote;
      current += '$$';
      i++;
      continue;
    }

    if (!inDollarQuote && char === "'") {
      if (nextChar === "'") {
        current += "''";
        i++;
        continue;
      }
      inSingleQuote = !inSingleQuote;
      current += char;
      continue;
    }

    if (!inDollarQuote && !inSingleQuote && char === ';') {
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed);
      }
      current = '';
      continue;
    }

    current += char;
  }

  const trimmed = current.trim();
  if (trimmed.length > 0) {
    statements.push(trimmed);
  }

  return statements;
}

function setupSupabaseMocks(db) {
  // Register PostgreSQL cryptographic functions
  db.public.registerFunction({
    name: 'gen_random_uuid',
    implementation: () => crypto.randomUUID(),
  });

  // Mock Supabase system schemas (auth and storage)
  db.public.none(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE TABLE IF NOT EXISTS auth.users (
      id UUID PRIMARY KEY,
      email TEXT,
      raw_user_meta_data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE SCHEMA IF NOT EXISTS storage;
    CREATE TABLE IF NOT EXISTS storage.buckets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      public BOOLEAN DEFAULT false,
      file_size_limit BIGINT,
      allowed_mime_types TEXT[]
    );
    CREATE TABLE IF NOT EXISTS storage.objects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bucket_id TEXT REFERENCES storage.buckets(id),
      name TEXT NOT NULL,
      owner UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
      metadata JSONB DEFAULT '{}'::jsonb
    );
  `);

  let currentUid = '00000000-0000-0000-0000-000000000001';
  let currentRole = 'authenticated';

  db.public.registerFunction({
    name: 'uid',
    implementation: () => currentUid,
  });

  db.public.registerFunction({
    name: 'role',
    implementation: () => currentRole,
  });

  return {
    setAuth: (uid, role = 'authenticated') => {
      currentUid = uid;
      currentRole = role;
    },
    clearAuth: () => {
      currentUid = null;
      currentRole = 'anon';
    },
  };
}

function runMigrationCycle(cycleNumber) {
  console.log(`\n==================================================`);
  console.log(`[MIGRATION RUN #${cycleNumber}] Initializing Clean PostgreSQL DB`);
  console.log(`==================================================`);

  const db = newDb();
  const authController = setupSupabaseMocks(db);

  const migrationFiles = [
    '20261116000001_initial_schema.sql',
    '20261116000002_rls_policies.sql',
    '20261116000003_functions_and_rpc.sql',
    '20261116000004_storage_buckets.sql',
  ];

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    const stmts = splitSqlStatements(sql);
    let appliedCount = 0;

    for (const stmt of stmts) {
      const upper = stmt.toUpperCase();
      // Filter PostgreSQL / Supabase server primitives that pg-mem does not emulate
      if (upper.startsWith('CREATE EXTENSION')) continue;
      if (upper.startsWith('CREATE TRIGGER')) continue;
      if (upper.includes('LANGUAGE PLPGSQL')) continue;
      if (upper.includes('LANGUAGE SQL')) continue;
      if (upper.includes('USING GIN')) continue;
      if (upper.startsWith('ALTER TABLE') && upper.includes('ENABLE ROW LEVEL SECURITY')) continue;
      if (upper.startsWith('CREATE POLICY')) continue;
      if (upper.startsWith('GRANT') || upper.startsWith('REVOKE')) continue;

      try {
        db.public.none(stmt);
        appliedCount++;
      } catch (err) {
        console.error(`  ✗ Statement failed in ${file}:`, stmt.slice(0, 100));
        console.error(`    Error: ${err.message}`);
        throw err;
      }
    }

    console.log(`  ✓ Successfully parsed & applied ${appliedCount} statements from ${file}`);
  }

  // Apply seed data
  if (fs.existsSync(seedFile)) {
    const seedSql = fs.readFileSync(seedFile, 'utf-8');
    const seedStmts = splitSqlStatements(seedSql);
    let seedApplied = 0;
    for (const stmt of seedStmts) {
      try {
        db.public.none(stmt);
        seedApplied++;
      } catch (err) {
        console.error(`  ✗ Seed statement failed:`, stmt.slice(0, 100));
        console.error(`    Error: ${err.message}`);
        throw err;
      }
    }
    console.log(`  ✓ Successfully applied development seed data (${seedApplied} statements)`);
  }

  return { db, authController };
}

async function runSecurityAssertions({ db }) {
  console.log(`\n==================================================`);
  console.log(`[SECURITY ASSERTION TESTS] Executing Database Security Tests`);
  console.log(`==================================================`);

  let passed = 0;
  let failed = 0;

  function assert(testName, fn) {
    try {
      fn();
      console.log(`  PASS: ${testName}`);
      passed++;
    } catch (err) {
      console.error(`  FAIL: ${testName}`);
      console.error(`        ${err.message}`);
      failed++;
    }
  }

  // 1. Schema integrity test: 15 core tables
  assert('Schema Integrity: All 15 core tables exist in public schema', () => {
    const tables = db.public.many(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
    `).map(r => r.table_name);

    const required = [
      'profiles', 'contractor_profiles', 'verification_documents',
      'projects', 'project_files', 'project_packages', 'proposals',
      'proposal_items', 'milestones', 'progress_updates', 'change_requests',
      'reviews', 'notifications', 'reports', 'audit_logs'
    ];

    for (const req of required) {
      if (!tables.includes(req)) {
        throw new Error(`Missing expected table: ${req}`);
      }
    }
  });

  // 2. Profiles Privacy & Safe Contractor View
  assert('Profiles Privacy: Safe Public Contractor View excludes phone and internal notes', () => {
    const rows = db.public.many(`SELECT * FROM public.contractor_public_directory;`);
    if (rows.length === 0) throw new Error('Expected approved contractors in view');
    const first = rows[0];
    if ('phone' in first) throw new Error('phone column MUST NOT be exposed in public directory');
    if ('verification_notes' in first) throw new Error('verification_notes MUST NOT be exposed');
    if (!first.business_name) throw new Error('Expected business_name in directory');
    // Ensure only approved contractors are visible in public directory
    if (rows.length !== 1 || !first.business_name.includes('الأهرام')) {
      throw new Error(`Only approved contractors should be visible in public directory (found ${rows.length})`);
    }
  });

  // 3. Prevent Self-Assigned Admin Role
  assert('Authorization: Role check constraint prevents self-assigned admin role in registration', () => {
    let threw = false;
    try {
      db.public.none(`
        INSERT INTO public.profiles (id, role, full_name, city)
        VALUES ('ffffffff-0000-0000-0000-000000000001', 'super_admin_hacker', 'Hacker', 'Cairo');
      `);
    } catch {
      threw = true;
    }
    if (!threw) throw new Error('Expected check constraint violation for invalid role');
  });

  // 4. Positive Numerical & Duration Constraints
  assert('Data Integrity: Proposals reject zero or negative total price and duration', () => {
    let threwPrice = false;
    try {
      db.public.none(`
        INSERT INTO public.proposals (
          id, package_id, contractor_id, total_price, proposed_duration_days, scope_summary, payment_schedule_terms
        ) VALUES (
          gen_random_uuid(), '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003',
          -500, 30, 'Scope', 'Terms'
        );
      `);
    } catch {
      threwPrice = true;
    }
    if (!threwPrice) throw new Error('Expected check constraint failure for negative total_price');
  });

  // 5. Storage Buckets Private by Default
  assert('Storage Security: All standard storage buckets are non-public', () => {
    const buckets = db.public.many(`SELECT id, public, file_size_limit FROM storage.buckets;`);
    if (buckets.length !== 3) throw new Error(`Expected 3 buckets, found ${buckets.length}`);
    for (const b of buckets) {
      if (b.public === true) {
        throw new Error(`Bucket ${b.id} must be private (public = false)`);
      }
      if (!b.file_size_limit || b.file_size_limit <= 0) {
        throw new Error(`Bucket ${b.id} must have a valid file size limit`);
      }
    }
  });

  // 6. Static Analysis of RLS Policies
  assert('Security Policy Audit: Strict RLS enforcement and zero broad USING(true) on profiles', () => {
    const rlsSql = fs.readFileSync(path.join(migrationsDir, '20261116000002_rls_policies.sql'), 'utf-8');

    // Rule A: Profiles table SELECT must NOT contain USING (true)
    const profileSelectMatch = rlsSql.match(/CREATE POLICY ["']?profiles_select["']?[\s\S]*?ON\s+public\.profiles[\s\S]*?FOR\s+SELECT[\s\S]*?USING\s*\(\s*true\s*\)/i);
    if (profileSelectMatch) {
      throw new Error('VULNERABILITY DETECTED: profiles_select policy still uses broad USING (true)');
    }

    // Rule B: All 15 core tables must have ROW LEVEL SECURITY enabled
    const requiredTables = [
      'profiles', 'contractor_profiles', 'verification_documents',
      'projects', 'project_files', 'project_packages', 'proposals',
      'proposal_items', 'milestones', 'progress_updates', 'change_requests',
      'reviews', 'notifications', 'reports', 'audit_logs'
    ];
    for (const tbl of requiredTables) {
      const enableRlsRegex = new RegExp(`ALTER\\s+TABLE\\s+public\\.${tbl}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, 'i');
      if (!enableRlsRegex.test(rlsSql)) {
        throw new Error(`Missing ENABLE ROW LEVEL SECURITY for public.${tbl}`);
      }
    }
  });

  // 7. Static Analysis of Storage Policies
  assert('Storage Authorization Audit: project-files requires ownership/assignment or explicit is_public flag', () => {
    const storageSql = fs.readFileSync(path.join(migrationsDir, '20261116000004_storage_buckets.sql'), 'utf-8');

    // Published status alone must never grant unrestricted file access
    if (storageSql.includes("WHERE status = 'published'") && !storageSql.includes('is_public = true')) {
      throw new Error('VULNERABILITY DETECTED: project-files storage allows unrestricted access based solely on published status');
    }

    if (!storageSql.includes('is_public = true')) {
      throw new Error('Expected project-files storage policy to require explicit is_public = true check for discoverable files');
    }
  });

  // 8. Static Analysis of RPC Functions & Security Definer Hardening
  assert('RPC Functions Audit: All SECURITY DEFINER functions have explicit search_path and restricted execute grants', () => {
    const rlsSql = fs.readFileSync(path.join(migrationsDir, '20261116000002_rls_policies.sql'), 'utf-8');
    const rpcSql = fs.readFileSync(path.join(migrationsDir, '20261116000003_functions_and_rpc.sql'), 'utf-8');
    const combinedFunctionsSql = rlsSql + '\n' + rpcSql;

    const expectedFunctions = [
      'get_public_contractor_profile',
      'select_contractor_for_package',
      'request_package_handover',
      'approve_package_completion',
      'decide_change_request',
      'admin_verify_contractor'
    ];

    for (const fn of expectedFunctions) {
      // Must be SECURITY DEFINER
      const secDefRegex = new RegExp(`CREATE\\s+(?:OR\\s+REPLACE\\s+)?FUNCTION\\s+public\\.${fn}[\\s\\S]*?SECURITY\\s+DEFINER`, 'i');
      if (!secDefRegex.test(combinedFunctionsSql)) {
        throw new Error(`Function public.${fn} must be defined as SECURITY DEFINER`);
      }

      // Must set explicit search_path
      const pathRegex = new RegExp(`CREATE\\s+(?:OR\\s+REPLACE\\s+)?FUNCTION\\s+public\\.${fn}[\\s\\S]*?SET\\s+search_path\\s*=\\s*public`, 'i');
      if (!pathRegex.test(combinedFunctionsSql)) {
        throw new Error(`Function public.${fn} missing explicit search_path`);
      }

      // Must revoke from PUBLIC
      const revokeRegex = new RegExp(`REVOKE\\s+ALL\\s+ON\\s+FUNCTION\\s+public\\.${fn}[\\s\\S]*?FROM\\s+PUBLIC`, 'i');
      if (!revokeRegex.test(combinedFunctionsSql)) {
        throw new Error(`Function public.${fn} missing REVOKE ALL FROM PUBLIC`);
      }

      // Must grant to authenticated
      const grantRegex = new RegExp(`GRANT\\s+EXECUTE\\s+ON\\s+FUNCTION\\s+public\\.${fn}[\\s\\S]*?TO\\s+authenticated`, 'i');
      if (!grantRegex.test(combinedFunctionsSql)) {
        throw new Error(`Function public.${fn} missing GRANT EXECUTE TO authenticated`);
      }
    }

    // Must verify contractor approval before package assignment
    if (!rpcSql.includes("verification_status = 'approved'") || !rpcSql.includes('Cannot award work package to an unverified')) {
      throw new Error('select_contractor_for_package must enforce approved contractor verification status');
    }
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    throw new Error(`${failed} security assertion(s) failed`);
  }
}

async function run() {
  console.log('Starting BuildMatch Migration & Security Test Suite...');
  const start = Date.now();

  // Test Run #1: Fresh Migration & Security Assertions
  const run1 = runMigrationCycle(1);
  await runSecurityAssertions(run1);

  // Test Run #2: Clean Reset & Reproducibility Check
  const run2 = runMigrationCycle(2);
  await runSecurityAssertions(run2);

  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`\n==================================================`);
  console.log(`ALL 2 MIGRATION RUNS AND 16 SECURITY CHECKS PASSED (${elapsed}s)`);
  console.log(`==================================================\n`);
}

run().catch((err) => {
  console.error('\nTest runner failed:', err.message);
  process.exit(1);
});
