const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve()
    .then(() => handler(req, res, next))
    .catch(next);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function transaction(pool, work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function audit(client, user, action, entityId) {
  await client.query(
    "INSERT INTO audit_events (actor_id, center_id, action, entity_id) VALUES ($1, $2, $3, $4)",
    [user.id, user.centerId, action, entityId],
  );
}
module.exports = { asyncRoute, UUID, transaction, audit };
