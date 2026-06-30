const express = require('express');
const router = express.Router();
const pool = require('../db');

const CENTER_ID = '00000000-0000-0000-0000-000000000001';

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, min_age_months AS "minAgeMonths",
              max_age_months AS "maxAgeMonths",
              target_ratio_children AS "targetRatio"
       FROM classrooms
       WHERE center_id = $1
       ORDER BY min_age_months ASC`,
      [CENTER_ID]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch classrooms' });
  }
});

module.exports = router;
