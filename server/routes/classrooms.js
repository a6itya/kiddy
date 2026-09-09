const express = require("express");
const { asyncRoute } = require("../lib/http");
module.exports = (pool) => {
  const router = express.Router();
  router.get(
    "/",
    asyncRoute(async (req, res) => {
      const result = await pool.query(
        `SELECT id, name, min_age_months AS "minAgeMonths", max_age_months AS "maxAgeMonths",
              target_ratio_children AS "targetRatio"
       FROM classrooms WHERE center_id = $1 ORDER BY min_age_months ASC`,
        [req.user.centerId],
      );
      res.json(result.rows);
    }),
  );
  return router;
};
