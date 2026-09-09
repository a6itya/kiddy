const { test } = require("node:test");
const assert = require("node:assert/strict");
const { hashPassword, verifyPassword } = require("../lib/passwords");
const { createApp } = require("../app");

test("passwords are salted and incorrect credentials fail", async () => {
  const password = "test-only-password-123";
  const hash = await hashPassword(password);
  assert.notEqual(hash, await hashPassword(password));
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword("incorrect", hash), false);
  assert.equal(await verifyPassword(password, "corrupt"), false);
  await assert.rejects(hashPassword("short"));
});
test("production rejects insecure or ambiguous origins", () => {
  assert.throws(() =>
    createApp({ pool: {}, production: true, origin: "http://example.com" }),
  );
  assert.throws(() =>
    createApp({ pool: {}, origin: "http://localhost:5173/" }),
  );
});
