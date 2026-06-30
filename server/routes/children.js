const express = require('express');
const router = express.Router();
const pool = require('../db');

const CENTER_ID = '00000000-0000-0000-0000-000000000001';

// GET /api/children — list all children with their classroom name
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id,
              c.first_name       AS "firstName",
              c.last_name        AS "lastName",
              c.age_display      AS age,
              cl.name            AS room,
              c.parent_name      AS parent,
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
  const { firstName, lastName, age, room, parent, contact, allergies, status } = req.body;
  try {
    const classroomResult = await pool.query(
      'SELECT id FROM classrooms WHERE name = $1 AND center_id = $2',
      [room, CENTER_ID]
    );
    const classroomId = classroomResult.rows[0]?.id ?? null;

    const result = await pool.query(
      `INSERT INTO children
         (center_id, classroom_id, first_name, last_name, age_display,
          parent_name, emergency_contact, allergies, enrollment_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, first_name AS "firstName", last_name AS "lastName",
                 age_display AS age, parent_name AS parent,
                 emergency_contact AS contact, allergies,
                 enrollment_status AS status`,
      [CENTER_ID, classroomId, firstName, lastName, age, parent, contact, allergies || '', status || 'Active']
    );

    const child = { ...result.rows[0], room };
    res.status(201).json(child);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create child' });
  }
});

// PUT /api/children/:id — update a child
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, age, room, parent, contact, allergies, status } = req.body;
  try {
    const classroomResult = await pool.query(
      'SELECT id FROM classrooms WHERE name = $1 AND center_id = $2',
      [room, CENTER_ID]
    );
    const classroomId = classroomResult.rows[0]?.id ?? null;

    await pool.query(
      `UPDATE children SET
         first_name = $1, last_name = $2, age_display = $3,
         classroom_id = $4, parent_name = $5, emergency_contact = $6,
         allergies = $7, enrollment_status = $8
       WHERE id = $9 AND center_id = $10`,
      [firstName, lastName, age, classroomId, parent, contact, allergies || '', status, id, CENTER_ID]
    );

    res.json({ id, firstName, lastName, age, room, parent, contact, allergies, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update child' });
  }
});

// DELETE /api/children/:id
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
