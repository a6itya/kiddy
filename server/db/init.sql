-- Drop in reverse dependency order for clean re-runs
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS children CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS classrooms CASCADE;
DROP TABLE IF EXISTS centers CASCADE;

CREATE TABLE centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    license_number VARCHAR(100),
    capacity INT NOT NULL DEFAULT 50,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID REFERENCES centers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    min_age_months INT,
    max_age_months INT,
    target_ratio_children INT NOT NULL DEFAULT 10
);

CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) CHECK (role IN ('admin', 'teacher', 'parent')),
    phone VARCHAR(20),
    email VARCHAR(255) UNIQUE NOT NULL
);

-- MVP: extends original schema with fields the frontend UI requires
CREATE TABLE children (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID REFERENCES centers(id),
    classroom_id UUID REFERENCES classrooms(id),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    age_display VARCHAR(50),
    allergies TEXT,
    medications TEXT,
    parent_name VARCHAR(255),
    emergency_contact VARCHAR(50),
    enrollment_status VARCHAR(50) DEFAULT 'Active'
);

CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    classroom_id UUID REFERENCES classrooms(id),
    check_in_time TIMESTAMP NOT NULL,
    check_out_time TIMESTAMP,
    checked_in_by UUID REFERENCES profiles(id),
    checked_out_by UUID REFERENCES profiles(id)
);
