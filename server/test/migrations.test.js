const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { Pool } = require("pg");
const { migrate } = require("../scripts/migrate");
const url = process.env.TEST_DATABASE_URL;

for (const fixture of ["original-schema.sql", "roster-schema.sql"]) {
  test(
    `migration preserves records from ${fixture}`,
    { skip: !url },
    async (t) => {
      assert.match(new URL(url).pathname, /^\/kiddy_test[a-z0-9_]*$/);
      const admin = new Pool({ connectionString: url });
      const schema = `test_${randomUUID().replaceAll("-", "")}`;
      await admin.query(`CREATE SCHEMA ${schema}`);
      const pool = new Pool({
        connectionString: url,
        options: `-c search_path=${schema}`,
      });
      t.after(async () => {
        await pool.end();
        await admin.query(`DROP SCHEMA ${schema} CASCADE`);
        await admin.end();
      });
      await pool.query(
        await readFile(path.join(__dirname, "fixtures", fixture), "utf8"),
      );
      const center = randomUUID(),
        room = randomUUID(),
        child = randomUUID();
      await pool.query(
        "INSERT INTO centers (id,name,capacity) VALUES ($1,'Legacy center',50)",
        [center],
      );
      await pool.query(
        "INSERT INTO classrooms (id,center_id,name,target_ratio_children) VALUES ($1,$2,'Legacy room',4)",
        [room, center],
      );
      const original = fixture === "original-schema.sql";
      await pool.query(
        `INSERT INTO children (id,center_id,classroom_id,first_name,last_name,date_of_birth,allergies)
      VALUES ($1,$2,$3,'Existing','Child','2023-01-02',$4)`,
        [
          child,
          center,
          room,
          original ? ["Peanuts", "Dairy"] : "Peanuts, Dairy",
        ],
      );
      await pool.query(
        "INSERT INTO attendance (child_id,classroom_id,check_in_time) VALUES ($1,$2,'2026-09-08 08:00:00')",
        [child, room],
      );
      if (!original)
        await pool.query(
          "UPDATE children SET parent_name='Existing Guardian', age_display='3 yrs' WHERE id=$1",
          [child],
        );
      await migrate(pool);
      await migrate(pool);
      const row = (
        await pool.query(
          "SELECT *, date_of_birth::text AS dob FROM children WHERE id=$1",
          [child],
        )
      ).rows[0];
      assert.equal(row.first_name, "Existing");
      assert.equal(row.dob, "2023-01-02");
      assert.equal(row.allergies, "Peanuts, Dairy");
      assert.equal(row.enrollment_status, "Active");
      if (!original) {
        assert.equal(row.parent_name, "Existing Guardian");
        assert.equal(row.age_display, "3 yrs");
      }
      assert.equal(
        (
          await pool.query("SELECT * FROM attendance WHERE child_id=$1", [
            child,
          ])
        ).rowCount,
        1,
      );
      await assert.rejects(
        pool.query("UPDATE children SET enrollment_status='Typo' WHERE id=$1", [
          child,
        ]),
        { code: "23514" },
      );
      await pool.query(
        "UPDATE schema_migrations SET checksum='tampered' WHERE name='001_base.sql'",
      );
      await assert.rejects(
        migrate(pool),
        /Previously applied migration changed/,
      );
      assert.equal(
        (
          await pool.query("SELECT * FROM attendance WHERE child_id=$1", [
            child,
          ])
        ).rowCount,
        1,
      );
    },
  );
}
