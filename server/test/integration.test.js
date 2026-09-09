const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID, randomBytes, createHash } = require("node:crypto");
const { Pool } = require("pg");
const { migrate } = require("../scripts/migrate");
const { hashPassword } = require("../lib/passwords");
const { createApp } = require("../app");

const url = process.env.TEST_DATABASE_URL;
const origin = "http://localhost:5173";

test(
  "PostgreSQL migrations and authenticated HTTP workflows",
  { skip: !url },
  async (t) => {
    assert.match(
      new URL(url).pathname,
      /^\/kiddy_test[a-z0-9_]*$/,
      "Use a dedicated kiddy_test database.",
    );
    const admin = new Pool({ connectionString: url });
    const schema = `test_${randomUUID().replaceAll("-", "")}`;
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new Pool({
      connectionString: url,
      options: `-c search_path=${schema}`,
    });
    let server;
    t.after(async () => {
      if (server) await new Promise((resolve) => server.close(resolve));
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    });
    await migrate(pool);
    await migrate(pool);
    assert.equal(
      (await pool.query("SELECT * FROM schema_migrations")).rowCount,
      3,
    );
    const centerA = randomUUID(),
      centerB = randomUUID(),
      roomA = randomUUID(),
      roomB = randomUUID();
    const userA = randomUUID();
    const password = "test-only-password-123";
    await pool.query(
      `INSERT INTO centers (id, name, capacity) VALUES ($1,'Center A',50),($2,'Center B',30)`,
      [centerA, centerB],
    );
    await pool.query(
      `INSERT INTO classrooms (id, center_id, name, target_ratio_children) VALUES ($1,$2,'Room',4),($3,$4,'Room',4)`,
      [roomA, centerA, roomB, centerB],
    );
    await pool.query(
      `INSERT INTO app_users (id,email,password_hash,center_id,role) VALUES ($1,'owner@example.com',$2,$3,'owner')`,
      [userA, await hashPassword(password), centerA],
    );
    server = await new Promise((resolve) => {
      const instance = createApp({ pool, origin }).listen(0, "127.0.0.1", () =>
        resolve(instance),
      );
    });
    const base = `http://127.0.0.1:${server.address().port}`;
    const request = (
      path,
      {
        method = "GET",
        body,
        cookie,
        requestOrigin = origin,
        contentType = "application/json",
      } = {},
    ) =>
      fetch(`${base}/api${path}`, {
        method,
        headers: {
          ...(requestOrigin ? { Origin: requestOrigin } : {}),
          "Content-Type": contentType,
          ...(cookie ? { Cookie: cookie } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    let cookie, childId;
    const child = {
      firstName: "Test",
      lastName: "Child",
      age: "2 yrs",
      classroomId: roomA,
      parent: "Test Guardian",
      contact: "555-0100",
      allergies: "None",
      status: "Active",
    };

    await t.test(
      "all business endpoints reject unauthenticated requests",
      async () => {
        for (const [path, method] of [
          ["/children", "GET"],
          ["/classrooms", "GET"],
          ["/dashboard/summary", "GET"],
          ["/children", "POST"],
          [`/children/${randomUUID()}`, "PUT"],
          [`/children/${randomUUID()}`, "DELETE"],
        ]) {
          assert.equal(
            (
              await request(path, {
                method,
                ...(method === "GET" ? {} : { body: {} }),
              })
            ).status,
            401,
          );
        }
      },
    );
    await t.test(
      "login rejects cross-origin and non-JSON requests",
      async () => {
        for (const requestOrigin of ["https://untrusted.example", null]) {
          assert.equal(
            (
              await request("/auth/login", {
                method: "POST",
                body: {},
                requestOrigin,
              })
            ).status,
            403,
          );
        }
        assert.equal(
          (
            await request("/auth/login", {
              method: "POST",
              body: {},
              contentType: "text/plain",
            })
          ).status,
          415,
        );
        assert.equal(
          (
            await request("/auth/login", {
              method: "POST",
              body: { email: "owner@example.com", password: "wrong" },
            })
          ).status,
          401,
        );
      },
    );
    await t.test("owner signs in with an opaque HttpOnly cookie", async () => {
      const response = await request("/auth/login", {
        method: "POST",
        body: { email: " OWNER@example.com ", password },
      });
      assert.equal(response.status, 200);
      const header = response.headers.get("set-cookie");
      assert.match(header, /HttpOnly/);
      assert.match(header, /SameSite=Strict/);
      cookie = header.split(";")[0];
      const payload = await response.json();
      assert.equal(payload.user.centerId, centerA);
      assert.equal(payload.user.password_hash, undefined);
      assert.equal((await request("/auth/me", { cookie })).status, 200);
      const classrooms = await (
        await request("/classrooms", { cookie })
      ).json();
      assert.deepEqual(
        classrooms.map((r) => r.id),
        [roomA],
      );
    });
    await t.test(
      "input validation rejects invalid fields and foreign classrooms",
      async () => {
        for (const body of [
          null,
          [],
          { ...child, firstName: 123 },
          { ...child, status: "nonsense" },
          { ...child, contact: " " },
          { ...child, classroomId: roomB },
          { ...child, firstName: "x".repeat(101) },
        ]) {
          assert.equal(
            (await request("/children", { method: "POST", body, cookie }))
              .status,
            400,
          );
        }
        assert.equal(
          (
            await request("/children/not-a-uuid", {
              method: "PUT",
              body: child,
              cookie,
            })
          ).status,
          400,
        );
      },
    );
    await t.test(
      "create and update preserve center ownership and write audit records",
      async () => {
        let response = await request("/children", {
          method: "POST",
          cookie,
          body: { ...child, centerId: centerB },
        });
        assert.equal(response.status, 201);
        const created = await response.json();
        childId = created.id;
        assert.equal(created.room, "Room");
        assert.equal(
          (
            await pool.query("SELECT center_id FROM children WHERE id=$1", [
              childId,
            ])
          ).rows[0].center_id,
          centerA,
        );
        response = await request(`/children/${childId}`, {
          method: "PUT",
          cookie,
          body: { ...child, firstName: "Updated" },
        });
        assert.equal(response.status, 200);
        assert.equal((await response.json()).firstName, "Updated");
        assert.equal(
          (
            await pool.query("SELECT * FROM audit_events WHERE entity_id=$1", [
              childId,
            ])
          ).rowCount,
          2,
        );
      },
    );
    await t.test(
      "another center cannot be read or changed by guessed IDs",
      async () => {
        const otherId = randomUUID();
        await pool.query(
          `INSERT INTO children (id,center_id,classroom_id,first_name,last_name) VALUES ($1,$2,$3,'Private','Child')`,
          [otherId, centerB, roomB],
        );
        const list = await (await request("/children", { cookie })).json();
        assert.equal(
          list.some((c) => c.id === otherId),
          false,
        );
        assert.equal(
          (
            await request(`/children/${otherId}`, {
              method: "PUT",
              cookie,
              body: child,
            })
          ).status,
          404,
        );
        assert.equal(
          (
            await request(`/children/${otherId}/withdraw`, {
              method: "POST",
              cookie,
              body: {},
            })
          ).status,
          404,
        );
      },
    );
    await t.test(
      "dashboard reports enrollment without fabricated attendance or teachers",
      async () => {
        const summary = await (
          await request("/dashboard/summary", { cookie })
        ).json();
        assert.equal(summary.enrollment.enrolled, 1);
        assert.equal(summary.attendance, undefined);
        assert.equal(summary.classrooms[0].teachers, undefined);
      },
    );
    await t.test(
      "withdrawal retains attendance; deletion is blocked in API and database",
      async () => {
        await pool.query(
          "INSERT INTO attendance (child_id,classroom_id,check_in_time) VALUES ($1,$2,now())",
          [childId, roomA],
        );
        assert.equal(
          (
            await request(`/children/${childId}`, {
              method: "DELETE",
              cookie,
              body: {},
            })
          ).status,
          405,
        );
        assert.equal(
          (
            await request(`/children/${childId}/withdraw`, {
              method: "POST",
              cookie,
              body: {},
            })
          ).status,
          204,
        );
        assert.equal(
          (
            await pool.query(
              "SELECT enrollment_status FROM children WHERE id=$1",
              [childId],
            )
          ).rows[0].enrollment_status,
          "Inactive",
        );
        assert.equal(
          (
            await pool.query("SELECT * FROM attendance WHERE child_id=$1", [
              childId,
            ])
          ).rowCount,
          1,
        );
        await assert.rejects(
          pool.query("DELETE FROM children WHERE id=$1", [childId]),
          (error) => ["23503", "23001"].includes(error.code),
        );
        assert.equal(
          (await (await request("/dashboard/summary", { cookie })).json())
            .enrollment.enrolled,
          0,
        );
        await migrate(pool);
        assert.equal(
          (
            await pool.query("SELECT * FROM attendance WHERE child_id=$1", [
              childId,
            ])
          ).rowCount,
          1,
        );
      },
    );
    await t.test(
      "roles, account disabling, expiration and logout are enforced server-side",
      async () => {
        await pool.query("UPDATE app_users SET role='teacher' WHERE id=$1", [
          userA,
        ]);
        assert.equal((await request("/children", { cookie })).status, 403);
        await pool.query(
          "UPDATE app_users SET role='owner', disabled_at=now() WHERE id=$1",
          [userA],
        );
        assert.equal((await request("/children", { cookie })).status, 401);
        await pool.query("UPDATE app_users SET disabled_at=NULL WHERE id=$1", [
          userA,
        ]);
        assert.equal(
          (await request("/auth/logout", { method: "POST", cookie, body: {} }))
            .status,
          204,
        );
        assert.equal((await request("/children", { cookie })).status, 401);
        const expired = randomBytes(32).toString("hex");
        await pool.query(
          "INSERT INTO app_sessions VALUES ($1,$2,now()-interval '1 second')",
          [createHash("sha256").update(expired).digest("hex"), userA],
        );
        assert.equal(
          (await request("/children", { cookie: `kiddy_session=${expired}` }))
            .status,
          401,
        );
      },
    );
    await t.test("login attempts are persistently rate limited", async () => {
      await pool.query("DELETE FROM login_attempts");
      for (let i = 0; i < 10; i++)
        assert.equal(
          (
            await request("/auth/login", {
              method: "POST",
              body: { email: "owner@example.com", password: "wrong" },
            })
          ).status,
          401,
        );
      const blocked = await request("/auth/login", {
        method: "POST",
        body: { email: "owner@example.com", password },
      });
      assert.equal(blocked.status, 429);
      assert.equal(blocked.headers.get("retry-after"), "900");
    });
  },
);
