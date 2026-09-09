const express = require("express");
const { asyncRoute, UUID, transaction, audit } = require("../lib/http");
const projection = `id, first_name AS "firstName", last_name AS "lastName", age_display AS age,
  classroom_id AS "classroomId", parent_name AS parent, emergency_contact AS contact,
  allergies, enrollment_status AS status`;

function validate(body) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    return "Send a student record.";
  for (const [field, max] of Object.entries({
    firstName: 100,
    lastName: 100,
    age: 50,
    parent: 255,
    contact: 50,
  })) {
    if (
      typeof body[field] !== "string" ||
      !body[field].trim() ||
      body[field].length > max
    ) {
      return `${field} must be text between 1 and ${max} characters.`;
    }
  }
  if (
    !UUID.test(body.classroomId || "") ||
    typeof body.classroomId !== "string"
  )
    return "Choose a valid classroom.";
  if (
    body.allergies !== undefined &&
    (typeof body.allergies !== "string" || body.allergies.length > 4000)
  )
    return "Medical notes must be text up to 4000 characters.";
  if (
    body.status !== undefined &&
    !["Active", "Waitlist", "Inactive"].includes(body.status)
  )
    return "Choose Active, Waitlist, or Inactive.";
  return null;
}

module.exports = (pool) => {
  const router = express.Router();
  router.param("id", (req, res, next, id) => {
    if (!UUID.test(id))
      return res.status(400).json({ error: "Invalid student ID." });
    next();
  });
  router.get(
    "/",
    asyncRoute(async (req, res) => {
      const result = await pool.query(
        `SELECT c.id, c.first_name AS "firstName", c.last_name AS "lastName",
      c.age_display AS age, c.classroom_id AS "classroomId", cl.name AS room, c.parent_name AS parent,
      c.emergency_contact AS contact, c.allergies, c.enrollment_status AS status
      FROM children c LEFT JOIN classrooms cl ON cl.id = c.classroom_id AND cl.center_id = c.center_id
      WHERE c.center_id = $1 ORDER BY c.last_name, c.first_name`,
        [req.user.centerId],
      );
      res.json(result.rows);
    }),
  );

  const save = (editing) =>
    asyncRoute(async (req, res) => {
      const error = validate(req.body);
      if (error) return res.status(400).json({ error });
      const b = req.body;
      const saved = await transaction(pool, async (client) => {
        const room = await client.query(
          "SELECT name FROM classrooms WHERE id = $1 AND center_id = $2 FOR SHARE",
          [b.classroomId, req.user.centerId],
        );
        if (!room.rows[0])
          return { status: 400, error: "Choose a classroom in your center." };
        const values = [
          b.firstName.trim(),
          b.lastName.trim(),
          b.age.trim(),
          b.classroomId,
          b.parent.trim(),
          b.contact.trim(),
          (b.allergies || "").trim(),
          b.status || "Active",
        ];
        const result = editing
          ? await client.query(
              `UPDATE children SET first_name=$1, last_name=$2, age_display=$3,
            classroom_id=$4, parent_name=$5, emergency_contact=$6, allergies=$7, enrollment_status=$8
            WHERE id=$9 AND center_id=$10 RETURNING ${projection}`,
              [...values, req.params.id, req.user.centerId],
            )
          : await client.query(
              `INSERT INTO children (first_name, last_name, age_display, classroom_id,
            parent_name, emergency_contact, allergies, enrollment_status, center_id)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING ${projection}`,
              [...values, req.user.centerId],
            );
        if (!result.rows[0])
          return { status: 404, error: "Student not found." };
        await audit(
          client,
          req.user,
          editing ? "child.updated" : "child.created",
          result.rows[0].id,
        );
        return { child: { ...result.rows[0], room: room.rows[0].name } };
      });
      if (saved.error)
        return res.status(saved.status).json({ error: saved.error });
      res.status(editing ? 200 : 201).json(saved.child);
    });
  router.post("/", save(false));
  router.put("/:id", save(true));
  router.post(
    "/:id/withdraw",
    asyncRoute(async (req, res) => {
      const updated = await transaction(pool, async (client) => {
        const result = await client.query(
          `UPDATE children SET enrollment_status = 'Inactive'
        WHERE id = $1 AND center_id = $2 RETURNING id`,
          [req.params.id, req.user.centerId],
        );
        if (!result.rows[0]) return false;
        await audit(client, req.user, "child.withdrawn", req.params.id);
        return true;
      });
      if (!updated)
        return res.status(404).json({ error: "Student not found." });
      res.status(204).end();
    }),
  );
  router.delete("/:id", (req, res) =>
    res
      .status(405)
      .set("Allow", "PUT, POST")
      .json({
        error:
          "Permanent deletion is disabled. Mark the student inactive to preserve attendance history.",
      }),
  );
  return router;
};
