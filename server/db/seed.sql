-- Insert default center
INSERT INTO centers (id, name, license_number, capacity)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'BrightStart Learning Center',
    'DC-2024-001',
    50
);

-- Insert classrooms matching the frontend room names exactly
INSERT INTO classrooms (center_id, name, min_age_months, max_age_months, target_ratio_children)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'Toddler Room',          12, 24, 4),
    ('00000000-0000-0000-0000-000000000001', 'Preschool Explorers',   24, 36, 12),
    ('00000000-0000-0000-0000-000000000001', 'Pre-K Readiness',       36, 60, 12);
