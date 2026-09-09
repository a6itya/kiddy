const express = require("express");
const { asyncRoute } = require("../lib/http");
module.exports = (pool) => {
  const router = express.Router();
  router.get(
    "/summary",
    asyncRoute(async (req, res) => {
      const centerId = req.user.centerId;
      const [center, rooms, total] = await Promise.all([
        pool.query("SELECT capacity FROM centers WHERE id = $1", [centerId]),
        pool.query(
          `SELECT cl.id, cl.name, COUNT(c.id)::int AS enrolled
        FROM classrooms cl LEFT JOIN children c ON c.classroom_id = cl.id
          AND c.center_id = cl.center_id AND c.enrollment_status = 'Active'
        WHERE cl.center_id = $1 GROUP BY cl.id ORDER BY cl.min_age_months ASC`,
          [centerId],
        ),
        pool.query(
          `SELECT COUNT(*)::int AS enrolled FROM children
        WHERE center_id = $1 AND enrollment_status = 'Active'`,
          [centerId],
        ),
      ]);
      if (!center.rows[0])
        return res.status(404).json({ error: "Center not found." });
      res.json({
        enrollment: {
          enrolled: total.rows[0].enrolled,
          totalCapacity: center.rows[0].capacity,
        },
        classrooms: rooms.rows,
      });
    }),
  );
  return router;
};
