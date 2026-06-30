const express = require('express');
const router = express.Router();
const pool = require('../db');

const CENTER_ID = '00000000-0000-0000-0000-000000000001';

// Hardcoded teacher counts per room until staff management is built
const TEACHER_COUNTS = {
  'Toddler Room': 2,
  'Preschool Explorers': 1,
  'Pre-K Readiness': 1,
};

router.get('/summary', async (req, res) => {
  try {
    const [centerResult, classroomsResult, childCountResult] = await Promise.all([
      pool.query('SELECT capacity FROM centers WHERE id = $1', [CENTER_ID]),
      pool.query(
        `SELECT id, name, target_ratio_children AS "maxRatio"
         FROM classrooms WHERE center_id = $1 ORDER BY min_age_months ASC`,
        [CENTER_ID]
      ),
      pool.query(
        `SELECT classroom_id, COUNT(*) AS count
         FROM children
         WHERE center_id = $1 AND enrollment_status = 'Active'
         GROUP BY classroom_id`,
        [CENTER_ID]
      ),
    ]);

    const totalCapacity = centerResult.rows[0]?.capacity ?? 50;
    const countsByRoom = {};
    for (const row of childCountResult.rows) {
      countsByRoom[row.classroom_id] = parseInt(row.count, 10);
    }

    const classrooms = classroomsResult.rows.map((room) => ({
      id: room.id,
      name: room.name,
      current: countsByRoom[room.id] ?? 0,
      maxRatio: room.maxRatio,
      teachers: TEACHER_COUNTS[room.name] ?? 1,
    }));

    const checkedIn = classrooms.reduce((sum, r) => sum + r.current, 0);

    res.json({
      attendance: { checkedIn, totalCapacity },
      classrooms,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});

module.exports = router;
