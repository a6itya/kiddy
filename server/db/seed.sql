-- Sample development data only. These ratios are not verified licensing rules.
BEGIN;
SELECT pg_advisory_xact_lock(73148013);
INSERT INTO centers (id, name, license_number, capacity)
VALUES ('00000000-0000-0000-0000-000000000001', 'BrightStart Learning Center', 'DEMO', 50)
ON CONFLICT (id) DO NOTHING;
INSERT INTO classrooms (center_id, name, min_age_months, max_age_months, target_ratio_children)
SELECT '00000000-0000-0000-0000-000000000001'::uuid, room.name, room.min_age, room.max_age, room.ratio
FROM (VALUES ('Toddler Room',12,24,4), ('Preschool Explorers',24,36,12), ('Pre-K Readiness',36,60,12)) AS room(name,min_age,max_age,ratio)
WHERE NOT EXISTS (SELECT 1 FROM classrooms existing WHERE existing.center_id = '00000000-0000-0000-0000-000000000001' AND existing.name = room.name);
COMMIT;
