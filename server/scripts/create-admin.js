const { readFileSync } = require("node:fs");
const { Writable } = require("node:stream");
const { createInterface } = require("node:readline/promises");
const { hashPassword } = require("../lib/passwords");
const { UUID } = require("../lib/http");
const pool = require("../db");

async function main() {
  const [emailArg, centerId] = process.argv.slice(2);
  const email = emailArg?.trim().toLowerCase();
  if (
    !email ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !UUID.test(centerId || "")
  ) {
    throw new Error(
      "Usage: npm run create-admin -- owner@example.com CENTER_UUID",
    );
  }
  let password;
  if (process.stdin.isTTY) {
    const silent = new Writable({
      write(chunk, encoding, done) {
        done();
      },
    });
    const input = createInterface({
      input: process.stdin,
      output: silent,
      terminal: true,
    });
    try {
      process.stdout.write("New password (12–256 characters, hidden): ");
      password = await input.question("");
      process.stdout.write("\nConfirm password: ");
      if (password !== (await input.question("")))
        throw new Error("Passwords do not match.");
      process.stdout.write("\n");
    } finally {
      input.close();
    }
  } else {
    password = readFileSync(0, "utf8").replace(/\r?\n$/, "");
  }
  const hash = await hashPassword(password);
  await pool.query(
    `INSERT INTO app_users (email, password_hash, center_id, role) VALUES ($1, $2, $3, 'owner')`,
    [email, hash, centerId],
  );
  console.log(
    "Owner account created. Sign in with the email and password you entered.",
  );
}
main()
  .catch((error) => {
    console.error(
      error.code
        ? "Account creation failed. Check that the center exists and the email is not already registered."
        : error.message,
    );
    process.exitCode = 1;
  })
  .finally(() => pool.end());
