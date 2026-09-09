-- Bring either legacy schema forward without dropping records or guessing a DOB.
ALTER TABLE children ADD COLUMN IF NOT EXISTS age_display VARCHAR(50);
ALTER TABLE children ADD COLUMN IF NOT EXISTS parent_name VARCHAR(255);
ALTER TABLE children ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(50);
ALTER TABLE children ADD COLUMN IF NOT EXISTS enrollment_status VARCHAR(50) DEFAULT 'Active';
ALTER TABLE children ALTER COLUMN date_of_birth DROP NOT NULL;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema()
      AND table_name = 'children' AND column_name = 'allergies' AND data_type = 'ARRAY') THEN
    ALTER TABLE children ALTER COLUMN allergies TYPE TEXT USING array_to_string(allergies, ', ');
  END IF;
END $$;

-- Preserve legacy rows for review; constraints still apply to all new/updated rows.
ALTER TABLE children ADD CONSTRAINT children_status_valid
  CHECK (enrollment_status IS NOT NULL AND enrollment_status IN ('Active', 'Waitlist', 'Inactive')) NOT VALID;
ALTER TABLE classrooms ADD CONSTRAINT classrooms_center_id_id_unique UNIQUE (center_id, id);
ALTER TABLE children ADD CONSTRAINT children_room_in_center FOREIGN KEY (center_id, classroom_id)
  REFERENCES classrooms (center_id, id) NOT VALID;
ALTER TABLE children ADD CONSTRAINT children_center_required CHECK (center_id IS NOT NULL) NOT VALID;
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_child_id_fkey;
ALTER TABLE attendance ADD CONSTRAINT attendance_child_id_fkey FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS children_center_status_idx ON children (center_id, enrollment_status);
CREATE INDEX IF NOT EXISTS classrooms_center_idx ON classrooms (center_id);
