const express = require('express');
const router = express.Router();
const pool = require('../db');

const CENTER_ID = '00000000-0000-0000-0000-000000000001';

// Fields the client must supply for a child record to be valid.
const REQUIRED_FIELDS = ['firstName', 'lastName', 'age', 'room', 'parent', 'contact'];

// Column projection shared by create/update so the client always gets the same shape.
const CHILD_RETURNING = `id,
          first_name        AS "firstName",
          last_name         AS "lastName",
          age_display       AS age,
          parent_name       AS parent,
          emergency_contact AS contact,
          allergies,
          enrollment_status AS status`;

// Returns an error message if a required field is missing/blank, otherwise null.
function validateChildBody(body) {
  const missing = REQUIRED_FIELDS.filter(
    (field) => body[field] === undefined || body[field] === null || String(body[field]).trim() === ''
  );
  return missing.length > 0 ? `Missing required fields: ${missing.join(', ')}` : null;
}

// Resolves a classroom name to its id within this center, or null if it doesn't exist.
async function resolveClassroomId(room) {
  const result = await pool.query(
    'SELECT id FROM classrooms WHERE name = $1 AND center_id = $2',
    [room, CENTER_ID]
  );
  return result.rows[0]?.id ?? null;
}

// GET /api/children — list all children with their classroom name
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id,
              c.first_name        AS "firstName",
              c.last_name         AS "lastName",
              c.age_display       AS age,
              cl.name             AS room,
              c.parent_name       AS parent,
              c.emergency_contact AS contact,
              c.allergies,
              c.enrollment_status AS status
       FROM children c
       LEFT JOIN classrooms cl ON cl.id = c.classroom_id
       WHERE c.center_id = $1
       ORDER BY c.last_name, c.first_name`,
      [CENTER_ID]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch children' });
  }
});

// POST /api/children — create a new child
router.post('/', async (req, res) => {
  const validationError = validateChildBody(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  const { firstName, lastName, age, room, parent, contact, allergies, status } = req.body;
  try {
    const classroomId = await resolveClassroomId(room);
    if (classroomId === null) {
      return res.status(400).json({ error: `Unknown classroom: ${room}` });
    }

    const result = await pool.query(
      `INSERT INTO children
         (center_id, classroom_id, first_name, last_name, age_display,
          parent_name, emergency_contact, allergies, enrollment_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING ${CHILD_RETURNING}`,
      [CENTER_ID, classroomId, firstName, lastName, age, parent, contact, allergies || '', status || 'Active']
    );

    res.status(201).json({ ...result.rows[0], room });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create child' });
  }
});

// PUT /api/children/:id — update a child
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const validationError = validateChildBody(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  const { firstName, lastName, age, room, parent, contact, allergies, status } = req.body;
  try {
    const classroomId = await resolveClassroomId(room);
    if (classroomId === null) {
      return res.status(400).json({ error: `Unknown classroom: ${room}` });
    }

    const result = await pool.query(
      `UPDATE children SET
         first_name = $1, last_name = $2, age_display = $3,
         classroom_id = $4, parent_name = $5, emergency_contact = $6,
         allergies = $7, enrollment_status = $8
       WHERE id = $9 AND center_id = $10
       RETURNING ${CHILD_RETURNING}`,
      [firstName, lastName, age, classroomId, parent, contact, allergies || '', status || 'Active', id, CENTER_ID]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Child not found' });
    }

    res.json({ ...result.rows[0], room });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update child' });
  }
});

// DELETE /api/children/:id — idempotent; 204 whether or not the row existed
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM children WHERE id = $1 AND center_id = $2', [id, CENTER_ID]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete child' });
  }
});

module.exports = router;
