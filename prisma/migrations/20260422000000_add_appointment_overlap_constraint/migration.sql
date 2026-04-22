-- Enable btree_gist extension for exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Prevent overlapping appointments for the same staff member.
-- Only active appointments (not cancelled/no-show) are checked.
ALTER TABLE "Appointment"
ADD CONSTRAINT appointment_no_overlap_per_staff
EXCLUDE USING gist (
  "staffId" WITH =,
  tsrange("startTime", "endTime", '[)') WITH &&
) WHERE (status NOT IN ('cancelled', 'no-show'));
