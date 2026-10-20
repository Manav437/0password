import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const enabled = process.env.RUN_DATABASE_TESTS === "1";
const metadata = {
    version: 2,
    salt: Buffer.alloc(16, 1).toString("base64"),
    iterations: 600000,
    encrypted_verification: Buffer.alloc(32, 2).toString("base64"),
    verification_iv: Buffer.alloc(12, 3).toString("base64"),
};
const legacyTitle = "__0PASSWORD_VERIFICATION__";
const oldCiphertext = Buffer.alloc(32, 4).toString("base64");
const oldIv = Buffer.alloc(12, 5).toString("base64");
const newCiphertext = Buffer.alloc(32, 6).toString("base64");
const newIv = Buffer.alloc(12, 7).toString("base64");

function literal(value: string): string {
    return `'${value.replace(/'/g, "''")}'`;
}

function json(value: unknown): string {
    return `${literal(JSON.stringify(value))}::jsonb`;
}

test("disposable PostgreSQL vault integration", {
    skip: enabled ? false : "Set RUN_DATABASE_TESTS=1 to start a disposable local PostgreSQL cluster",
    timeout: 240_000,
}, async (t) => {
    const temporary = mkdtempSync(join(tmpdir(), "pg-"));
    const data = join(temporary, "data");
    const log = join(temporary, "postgres.log");
    // macOS's /private prefix can push a socket under os.tmpdir() past sun_path's limit.
    const socket = process.platform === "darwin" && temporary.startsWith("/private/")
        ? temporary.slice("/private".length)
        : temporary;
    const env = { ...process.env };
    for (const key of Object.keys(env)) {
        if (/^PG/i.test(key)) delete env[key];
    }
    env.LC_ALL = "C";

    // Node 24.2 can resolve t.test() before queued subtests execute. Wait for the
    // callback itself so the outer finally cannot tear down a still-needed cluster.
    async function check(name: string, callback: () => void, skip: string | false = false) {
        if (skip) {
            void t.test(name, { skip }, callback);
            return;
        }
        await new Promise<void>((resolve) => {
            void t.test(name, () => {
                try {
                    callback();
                } finally {
                    resolve();
                }
            });
        });
    }

    function run(command: string, args: string[], input?: string, timeout = 20_000) {
        return spawnSync(command, args, {
            cwd: temporary,
            env,
            input,
            encoding: "utf8",
            timeout,
            killSignal: "SIGKILL",
            maxBuffer: 4 * 1024 * 1024,
        });
    }

    function checked(command: string, args: string[], input?: string): string {
        const result = run(command, args, input);
        assert.ifError(result.error);
        assert.equal(result.status, 0, `${command} failed (${result.signal ?? result.status}):\n${result.stderr}\n${result.stdout}`);
        return result.stdout.trim();
    }

    function sql(statement: string, role = "service_role"): string {
        return checked("psql", [
            "-X", "--no-password", "-h", socket, "-p", "55439", "-U", "postgres", "-d", "postgres",
            "-qAt", "-v", "ON_ERROR_STOP=1",
        ], `SET statement_timeout = '5s'; SET lock_timeout = '3s'; SET ROLE ${role};\n${statement}`);
    }

    function rows<T = Record<string, unknown>>(statement: string, role = "postgres"): T[] {
        return JSON.parse(sql(`SELECT coalesce(json_agg(result), '[]'::json) FROM (${statement}) result;`, role));
    }

    function fails(statement: string, expected: RegExp, role = "service_role") {
        const result = run("psql", [
            "-X", "--no-password", "-h", socket, "-p", "55439", "-U", "postgres", "-d", "postgres",
            "-qAt", "-v", "ON_ERROR_STOP=1",
        ], `SET statement_timeout = '5s'; SET lock_timeout = '3s'; SET ROLE ${role};\n${statement}`);
        assert.ifError(result.error);
        assert.equal(result.signal, null, "SQL must fail normally, not by timeout or signal");
        assert.notEqual(result.status, 0, `Expected SQL to fail: ${statement}`);
        assert.match(result.stderr, expected);
    }

    function initialize(user: string, snapshot: unknown[] = [], items: unknown[] = [], values = metadata): string {
        return `SELECT public.initialize_vault(${literal(user)}, ${json(values)}, ${json(snapshot)}, ${json(items)});`;
    }

    function write(user: string, vault: string, operation: string, id: string | null, item: unknown): string {
        return `SELECT public.write_vault_item(${literal(user)}, ${literal(vault)}::uuid, ${literal(operation)}, ${id === null ? "NULL" : literal(id)}, ${json(item)});`;
    }

    function revision(user: string): string {
        return sql(`SELECT public.vault_revision(${literal(user)});`);
    }

    function reset(user: string, expectedRevision: string | null): string {
        return `SELECT public.reset_vault(${literal(user)}, ${expectedRevision === null ? "NULL" : literal(expectedRevision)});`;
    }

    function state(user: string) {
        return {
            items: rows(`SELECT * FROM public.vault_items WHERE user_id = ${literal(user)} ORDER BY id`),
            metadata: rows(`SELECT * FROM public.vault_metadata WHERE user_id = ${literal(user)}`),
        };
    }

    function addUser(user: string) {
        sql(`INSERT INTO public.users (id) VALUES (${literal(user)});`, "postgres");
    }

    function legacy(user: string) {
        addUser(user);
        sql(`INSERT INTO public.vault_items (user_id, title, login_id, website_url, encrypted_password, iv)
            VALUES (${literal(user)}, 'First account', 'first@example.test', 'https://first.example.test', ${literal(oldCiphertext)}, ${literal(oldIv)}),
                   (${literal(user)}, 'Second account', 'second@example.test', NULL, ${literal(oldCiphertext)}, ${literal(oldIv)}),
                   (${literal(user)}, ${literal(legacyTitle)}, NULL, NULL, ${literal(oldCiphertext)}, ${literal(oldIv)});`, "postgres");
        const snapshot = rows<{ id: string; title: string; encrypted_password: string; iv: string }>(
            `SELECT id, title, encrypted_password, iv FROM public.vault_items WHERE user_id = ${literal(user)} ORDER BY id`,
        );
        const items = snapshot.filter((item) => item.title !== legacyTitle).map(({ id }) => ({
            id, encrypted_password: newCiphertext, iv: newIv,
        }));
        return { snapshot, items };
    }

    try {
        assert.equal(realpathSync(socket), realpathSync(temporary));
        assert.ok(Buffer.byteLength(join(socket, ".s.PGSQL.55439")) < 104, "Temporary Unix socket path is too long");
        checked("initdb", ["-D", data, "-U", "postgres", "--auth=trust", "--no-locale", "--encoding=UTF8"]);
        // No TCP listener and no inherited PGHOST/PGSERVICE/PGDATABASE configuration.
        const options = `-h '' -k '${socket.replace(/'/g, "'\\''")}' -p 55439`;
        const start = run("pg_ctl", ["-D", data, "-l", log, "-w", "-t", "15", "-o", options, "start"]);
        assert.ifError(start.error);
        assert.equal(start.status, 0, `pg_ctl start failed:\n${start.stderr}\n${existsSync(log) ? readFileSync(log, "utf8") : start.stdout}`);
        sql(`CREATE ROLE anon NOLOGIN;
            CREATE ROLE authenticated NOLOGIN;
            CREATE ROLE service_role NOLOGIN BYPASSRLS;
            CREATE TABLE public.users (id text PRIMARY KEY);
            CREATE TABLE public.vault_items (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id text REFERENCES public.users(id),
                title text,
                login_id text,
                website_url text,
                encrypted_password text,
                iv text,
                created_at timestamptz DEFAULT now()
            );
            GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;`, "postgres");
        const migration = readFileSync(new URL("../supabase/migrations/202610200001_vault_metadata.sql", import.meta.url), "utf8");
        sql(migration, "postgres");
        assert.equal(sql("SHOW listen_addresses;", "postgres"), "", "PostgreSQL must not listen on TCP");

        await check("new setup persists metadata once and rejects a second setup", () => {
            addUser("setup");
            const vault = sql(initialize("setup"));
            assert.match(vault, /^[0-9a-f-]{36}$/);
            assert.deepEqual(state("setup"), {
                items: [],
                metadata: [{ user_id: "setup", vault_id: vault, ...metadata }],
            });
            const before = state("setup");
            fails(initialize("setup"), /Vault already initialized/);
            assert.deepEqual(state("setup"), before);
            fails(initialize("missing-user"), /foreign key constraint/);
            assert.deepEqual(state("missing-user"), { items: [], metadata: [] });
        });

        await check("legacy migration replaces every ciphertext and removes only its verifier atomically", () => {
            const { snapshot, items } = legacy("legacy");
            const before = state("legacy");
            const vault = sql(initialize("legacy", snapshot, items));
            const after = state("legacy");
            assert.deepEqual(after.metadata, [{ user_id: "legacy", vault_id: vault, ...metadata }]);
            assert.deepEqual(after.items, before.items.filter((item) => item.title !== legacyTitle).map((item) => ({
                ...item, encrypted_password: newCiphertext, iv: newIv,
            })));
        });

        await check("stale, duplicate, and missing snapshots leave all old ciphertext untouched", () => {
            const { snapshot, items } = legacy("snapshots");
            const before = state("snapshots");
            const cases = [
                snapshot.map((item, index) => index === 0 ? { ...item, encrypted_password: newCiphertext } : item),
                snapshot.map((item, index) => index === 0 ? { ...item, iv: newIv } : item),
                snapshot.map((item, index) => index === 0 ? { ...item, title: "Stale title" } : item),
                [snapshot[0], snapshot[0], snapshot[2]],
                snapshot.slice(1),
                [...snapshot, { ...snapshot[0], id: "00000000-0000-4000-8000-000000000001" }],
            ];
            for (const invalid of cases) {
                fails(initialize("snapshots", invalid, items), /Vault changed during setup/);
                assert.deepEqual(state("snapshots"), before);
            }
        });

        await check("incomplete/duplicate replacements and a late metadata failure roll migration back", () => {
            const { snapshot, items } = legacy("rollback");
            const before = state("rollback");
            for (const invalid of [
                items.slice(1),
                [items[0], items[0]],
                items.map((item, index) => index === 0 ? { ...item, iv: "bad" } : item),
                items.map((item, index) => index === 0 ? { ...item, encrypted_password: "bad" } : item),
                items.map((item, index) => index === 0 ? { ...item, id: "00000000-0000-4000-8000-000000000002" } : item),
            ]) {
                fails(initialize("rollback", snapshot, invalid), /Incomplete migration/);
                assert.deepEqual(state("rollback"), before);
            }
            // The metadata insert runs after ciphertext updates and verifier deletion.
            fails(initialize("rollback", snapshot, items, { ...metadata, iterations: 1 }), /check constraint/);
            assert.deepEqual(state("rollback"), before);
            sql(`INSERT INTO public.vault_items (user_id, title, encrypted_password, iv)
                VALUES ('rollback', ${literal(legacyTitle)}, ${literal(oldCiphertext)}, ${literal(oldIv)});`, "postgres");
            const duplicateVerifier = state("rollback");
            const fullSnapshot = rows(`SELECT id, title, encrypted_password, iv FROM public.vault_items WHERE user_id = 'rollback'`);
            fails(initialize("rollback", fullSnapshot, items), /Multiple legacy verification records/);
            assert.deepEqual(state("rollback"), duplicateVerifier);
        });

        await check("metadata-only edits preserve ciphertext; wrong vault/user writes are rejected", () => {
            addUser("writer");
            addUser("other-writer");
            const vault = sql(initialize("writer"));
            const otherVault = sql(initialize("other-writer"));
            const item = { title: "Original", login_id: "old@example.test", website_url: "https://old.example.test", encryptedPassword: oldCiphertext, iv: oldIv };
            const id = sql(write("writer", vault, "insert", null, item));
            const otherId = sql(write("other-writer", otherVault, "insert", null, item));
            const before = state("writer").items[0];
            const edit = { title: "Renamed", login_id: "new@example.test", website_url: "https://new.example.test" };
            assert.equal(sql(write("writer", vault, "update", id, edit)), id);
            assert.deepEqual(state("writer").items, [{ ...before, ...edit }]);
            const writerState = state("writer");
            const otherState = state("other-writer");
            for (const operation of ["insert", "update", "delete"]) {
                fails(write("writer", otherVault, operation, id, item), /Vault session expired/);
                fails(write("other-writer", vault, operation, id, item), /Vault session expired/);
                fails(write("writer", "00000000-0000-4000-8000-000000000003", operation, id, item), /Vault session expired/);
            }
            for (const operation of ["update", "delete"]) {
                fails(write("writer", vault, operation, otherId, item), /Vault item no longer exists/);
            }
            assert.deepEqual(state("writer"), writerState);
            assert.deepEqual(state("other-writer"), otherState);
            assert.equal(sql(write("writer", vault, "update", id, { ...edit, encryptedPassword: newCiphertext, iv: newIv })), id);
            assert.deepEqual(state("writer").items, [{ ...before, ...edit, encrypted_password: newCiphertext, iv: newIv }]);
            assert.equal(sql(write("writer", vault, "delete", id, {})), id);
            assert.deepEqual(state("writer").items, []);
        });

        await check("reset is user-scoped and atomic, and invalidates old vault sessions", () => {
            for (const user of ["reset-me", "keep-me"]) {
                addUser(user);
                const vault = sql(initialize(user));
                sql(write(user, vault, "insert", null, { title: "Keep ciphertext", encryptedPassword: oldCiphertext, iv: oldIv }));
            }
            const before = state("reset-me");
            const other = state("keep-me");
            const oldVault = String(before.metadata[0].vault_id);
            const oldId = String(before.items[0].id);
            const capturedRevision = revision("reset-me");
            assert.equal(capturedRevision, oldVault);
            // Force failure at the second DELETE to prove the first DELETE rolls back.
            sql(`CREATE FUNCTION public.reject_test_reset() RETURNS trigger LANGUAGE plpgsql AS $$
                    BEGIN RAISE EXCEPTION 'test reset failure'; END; $$;
                CREATE TRIGGER reject_test_reset BEFORE DELETE ON public.vault_metadata
                    FOR EACH ROW WHEN (OLD.user_id = 'reset-me') EXECUTE FUNCTION public.reject_test_reset();`, "postgres");
            try {
                fails(reset("reset-me", capturedRevision), /test reset failure/);
                assert.deepEqual(state("reset-me"), before);
                assert.deepEqual(state("keep-me"), other);
            } finally {
                sql("DROP TRIGGER reject_test_reset ON public.vault_metadata; DROP FUNCTION public.reject_test_reset();", "postgres");
            }
            sql(reset("reset-me", capturedRevision));
            assert.deepEqual(state("reset-me"), { items: [], metadata: [] });
            assert.deepEqual(state("keep-me"), other);
            assert.deepEqual(rows("SELECT id FROM public.users WHERE id = 'reset-me'"), [{ id: "reset-me" }]);
            const item = { title: "Stale", encryptedPassword: newCiphertext, iv: newIv };
            for (const operation of ["insert", "update", "delete"]) {
                fails(write("reset-me", oldVault, operation, oldId, item), /Vault session expired/);
            }
            const freshVault = sql(initialize("reset-me", [], [], {
                ...metadata, salt: Buffer.alloc(16, 8).toString("base64"),
            }));
            assert.notEqual(freshVault, oldVault);
            assert.equal(revision("reset-me"), freshVault);
            for (const title of ["Replacement first", "Replacement second"]) {
                sql(write("reset-me", freshVault, "insert", null, {
                    ...item, title, login_id: "replacement@example.test", website_url: "https://replacement.example.test",
                }));
            }
            const freshState = state("reset-me");
            assert.equal(freshState.items.length, 2);
            // A second confirmation from the original dialog must not delete a replacement vault.
            for (const staleRevision of [capturedRevision, "", null]) {
                fails(reset("reset-me", staleRevision), /Vault changed since reset was requested/);
                assert.deepEqual(state("reset-me"), freshState);
                assert.deepEqual(state("keep-me"), other);
            }
            for (const operation of ["insert", "update", "delete"]) {
                fails(write("reset-me", oldVault, operation, oldId, item), /Vault session expired/);
            }
            assert.deepEqual(state("reset-me"), freshState);
            assert.deepEqual(state("keep-me"), other);
        });

        await check("legacy revisions change on ciphertext and metadata edits and reject stale resets", () => {
            const { snapshot } = legacy("legacy-reset");
            const id = snapshot.find((item) => item.title !== legacyTitle)!.id;
            const originalRevision = revision("legacy-reset");
            assert.match(originalRevision, /^legacy:[0-9a-f]{32}$/);
            assert.equal(revision("legacy-reset"), originalRevision, "Unchanged legacy rows have a stable revision");
            const other = state("setup");
            const otherRevision = revision("setup");
            const edits = [
                `encrypted_password = ${literal(newCiphertext)}`,
                `iv = ${literal(newIv)}`,
                "title = 'Renamed legacy account'",
                "login_id = 'changed@example.test'",
                "website_url = 'https://changed.example.test'",
                "created_at = created_at + interval '1 second'",
            ];
            let currentRevision = originalRevision;
            for (const edit of edits) {
                const capturedRevision = currentRevision;
                const before = state("legacy-reset");
                sql(`UPDATE public.vault_items SET ${edit} WHERE user_id = 'legacy-reset' AND id = ${literal(id)}::uuid;`, "service_role");
                currentRevision = revision("legacy-reset");
                assert.match(currentRevision, /^legacy:[0-9a-f]{32}$/);
                assert.notEqual(currentRevision, capturedRevision, edit);
                assert.notEqual(currentRevision, originalRevision, edit);
                const edited = state("legacy-reset");
                assert.notDeepEqual(edited.items, before.items);
                assert.deepEqual(edited.metadata, []);
                for (const staleRevision of new Set([originalRevision, capturedRevision])) {
                    fails(reset("legacy-reset", staleRevision), /Vault changed since reset was requested/);
                    assert.deepEqual(state("legacy-reset"), edited);
                }
                assert.deepEqual(state("setup"), other);
                assert.equal(revision("setup"), otherRevision);
            }
            sql(reset("legacy-reset", currentRevision));
            assert.deepEqual(state("legacy-reset"), { items: [], metadata: [] });
            assert.notEqual(revision("legacy-reset"), currentRevision);
            assert.deepEqual(rows("SELECT id FROM public.users WHERE id = 'legacy-reset'"), [{ id: "legacy-reset" }]);
        });

        const searchFunctions = rows<{ args: string[]; signature: string }>(`SELECT proargnames AS args,
            oid::regprocedure::text AS signature FROM pg_proc
            WHERE pronamespace = 'public'::regnamespace AND proname = 'search_vault_items'`);

        await check("search RPC treats punctuation literally and isolates users", () => {
            assert.equal(searchFunctions.length, 1, "Expected one search RPC signature");
            const args = searchFunctions[0].args;
            assert.ok(args.includes("p_user_id"), "Search RPC must accept p_user_id");
            assert.ok(args.includes("p_query"), "Search RPC must accept a query parameter p_query");
            addUser("searcher");
            addUser("other-searcher");
            const vault = sql(initialize("searcher"));
            const otherVault = sql(initialize("other-searcher"));
            function search(user: string, query: string) {
                return rows<{ id: string }>(`SELECT * FROM public.search_vault_items(p_user_id => ${literal(user)}, p_query => ${literal(query)})`, "service_role");
            }
            const cases = ["%", "_", "\\", "*", "x%),user_id.neq.other-searcher", "O'Reilly"];
            for (const [index, query] of cases.entries()) {
                const item = { title: `Title ${query} literal`, login_id: `login-${index}`, encryptedPassword: oldCiphertext, iv: oldIv };
                const titleId = sql(write("searcher", vault, "insert", null, item));
                const loginId = sql(write("searcher", vault, "insert", null, { ...item, title: `Login match ${index}`, login_id: `prefix${query}suffix` }));
                const foreignId = sql(write("other-searcher", otherVault, "insert", null, item));
                sql(write("searcher", vault, "insert", null, { ...item, title: `Plain decoy ${index}`, login_id: `ordinary-${index}` }));
                assert.deepEqual(search("searcher", query).map((row) => row.id).sort(), [titleId, loginId].sort());
                assert.deepEqual(search("other-searcher", query).map((row) => row.id), [foreignId]);
            }
            assert.deepEqual(search("nonexistent-searcher", "%"), []);
        });

        await check("RLS tables deny browser reads and anon/authenticated cannot execute any vault RPC", () => {
            const before = state("setup");
            const vault = String(before.metadata[0].vault_id);
            const capturedRevision = revision("setup");
            const tables = ["users", "vault_items", "vault_metadata"];
            assert.deepEqual(rows(`SELECT relname, relrowsecurity FROM pg_class
                WHERE oid IN ('public.users'::regclass, 'public.vault_items'::regclass, 'public.vault_metadata'::regclass)
                ORDER BY relname`), tables.map((relname) => ({ relname, relrowsecurity: true })));
            assert.deepEqual(rows(`SELECT c.relname FROM pg_class c
                CROSS JOIN LATERAL aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) acl
                WHERE c.oid IN ('public.users'::regclass, 'public.vault_items'::regclass, 'public.vault_metadata'::regclass)
                    AND acl.grantee = 0`), [], "PUBLIC must have no table privileges");
            for (const role of ["anon", "authenticated"]) {
                for (const table of tables) {
                    fails(`SELECT * FROM public.${table};`, new RegExp(`permission denied for table ${table}`), role);
                    assert.deepEqual(rows(`SELECT has_table_privilege(${literal(role)}, ${literal(`public.${table}`)}, 'SELECT') AS allowed`),
                        [{ allowed: false }]);
                }
                fails(initialize("setup"), /permission denied for function initialize_vault/, role);
                fails(write("setup", vault, "insert", null, { title: "Unauthorized" }), /permission denied for function write_vault_item/, role);
                fails(`SELECT public.vault_revision('setup');`, /permission denied for function vault_revision/, role);
                fails(reset("setup", capturedRevision), /permission denied for function reset_vault/, role);
                fails("SELECT * FROM public.search_vault_items(p_user_id => 'setup', p_query => '%');", /permission denied for function search_vault_items/, role);
            }
            const signatures = [
                "public.initialize_vault(text,jsonb,jsonb,jsonb)",
                "public.write_vault_item(text,uuid,text,text,jsonb)",
                "public.vault_revision(text)",
                "public.reset_vault(text,text)",
                ...searchFunctions.map((fn) => fn.signature),
            ];
            for (const signature of signatures) {
                assert.deepEqual(rows(`SELECT has_function_privilege('anon', ${literal(signature)}, 'EXECUTE') AS anon,
                    has_function_privilege('authenticated', ${literal(signature)}, 'EXECUTE') AS authenticated,
                    has_function_privilege('service_role', ${literal(signature)}, 'EXECUTE') AS service_role`),
                    [{ anon: false, authenticated: false, service_role: true }]);
            }
            assert.deepEqual(state("setup"), before);
        });
    } finally {

        try {
            const stopped = run("pg_ctl", ["-D", data, "-m", "immediate", "-w", "-t", "15", "stop"]);
            if (existsSync(join(data, "postmaster.pid"))) {
                assert.ifError(stopped.error);
                assert.equal(stopped.status, 0, `Failed to stop disposable PostgreSQL:\n${stopped.stderr}\n${stopped.stdout}`);
                assert.fail("Disposable PostgreSQL still has a postmaster.pid after pg_ctl stop");
            }
        } finally {
            rmSync(temporary, { recursive: true, force: true });
        }
    }
});
