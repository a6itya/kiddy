-- Core Centers Table (Supports home daycares up to multi-site centers)
CREATE TABLE centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    license_number VARCHAR(100),
    capacity INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Classrooms (Handles 12mo - 4yo age groups)
CREATE TABLE classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID REFERENCES centers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g., "Toddler Room A"
    min_age_months INT,
    max_age_months INT,
    target_ratio_children INT NOT NULL -- e.g., 4 for toddlers, 12 for preschoolers
);

-- Profiles (Users can be Parents, Teachers, or System Admins)
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) CHECK (role IN ('admin', 'teacher', 'parent')),
    phone VARCHAR(20),
    email VARCHAR(255) UNIQUE NOT NULL
);

-- Children
CREATE TABLE children (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID REFERENCES centers(id),
    classroom_id UUID REFERENCES classrooms(id),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    allergies TEXT[],
    medications TEXT
);

-- Check-In/Out Ledger (Real-time syncing source)
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    classroom_id UUID REFERENCES classrooms(id),
    check_in_time TIMESTAMP NOT NULL,
    check_out_time TIMESTAMP,
    checked_in_by UUID REFERENCES profiles(id),
    checked_out_by UUID REFERENCES profiles(id)
);