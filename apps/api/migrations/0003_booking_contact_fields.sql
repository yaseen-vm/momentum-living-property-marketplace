-- Capture customer contact details submitted at booking time
ALTER TABLE bookings ADD COLUMN customer_name       TEXT;
ALTER TABLE bookings ADD COLUMN customer_email      TEXT;
ALTER TABLE bookings ADD COLUMN customer_alt_mobile TEXT;
