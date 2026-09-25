-- ====================================================================
-- WATERLINE UTILITY MANAGEMENT SYSTEM - NEON POSTGRES SCHEMA
-- Converted from MySQL schema for Vercel + Neon serverless deployment
-- Run this once in your Neon SQL editor to provision the database.
-- ====================================================================

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(100) NOT NULL UNIQUE,
  contact_no    VARCHAR(20)  DEFAULT NULL,
  role          VARCHAR(50)  NOT NULL DEFAULT 'Cashier'
                  CHECK (role IN ('Administrator','Cashier','Technician','Billing Officer','President','Office Staffs','Field Staffs')),
  status        VARCHAR(20)  NOT NULL DEFAULT 'Active'
                  CHECK (status IN ('Active','Inactive','Suspended')),
  last_login    TIMESTAMPTZ  DEFAULT NULL,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- 2. CONSUMERS
CREATE TABLE IF NOT EXISTS consumers (
  id                      SERIAL PRIMARY KEY,
  consumer_code           VARCHAR(20)  NOT NULL UNIQUE,
  account_no              VARCHAR(30)  NOT NULL UNIQUE,
  username                VARCHAR(50)  DEFAULT NULL UNIQUE,
  full_name               VARCHAR(120) NOT NULL,
  contact_no              VARCHAR(25)  NOT NULL,
  service_address         VARCHAR(255) NOT NULL,
  zone                    VARCHAR(100) NOT NULL,
  classification          VARCHAR(20)  NOT NULL DEFAULT 'Residential'
                            CHECK (classification IN ('Residential','Commercial','Institutional')),
  meter_serial            VARCHAR(50)  DEFAULT NULL,
  status                  VARCHAR(30)  NOT NULL DEFAULT 'Active'
                            CHECK (status IN ('Active','Overdue','Disconnected','Pending')),
  approval_status         VARCHAR(20)  NOT NULL DEFAULT 'Approved'
                            CHECK (approval_status IN ('Pending','Approved','Rejected')),
  location_approval_status VARCHAR(20) NOT NULL DEFAULT 'None'
                            CHECK (location_approval_status IN ('None','Pending','Approved','Rejected')),
  requested_latitude      NUMERIC(10,6) DEFAULT NULL,
  requested_longitude     NUMERIC(10,6) DEFAULT NULL,
  connection_date         DATE         NOT NULL,
  last_reading            NUMERIC(10,2) DEFAULT 0.00,
  created_at              TIMESTAMPTZ  DEFAULT NOW(),
  updated_at              TIMESTAMPTZ  DEFAULT NOW()
);

-- 3. METER ASSETS
CREATE TABLE IF NOT EXISTS meter_assets (
  id               SERIAL PRIMARY KEY,
  serial_no        VARCHAR(50)  NOT NULL UNIQUE,
  brand            VARCHAR(60)  NOT NULL,
  model            VARCHAR(60)  NOT NULL,
  pipe_size        VARCHAR(20)  NOT NULL DEFAULT '1/2 inch',
  install_date     DATE         NOT NULL,
  consumer_id      INT          DEFAULT NULL REFERENCES consumers(id) ON DELETE SET NULL ON UPDATE CASCADE,
  zone             VARCHAR(100) NOT NULL,
  last_calibration DATE         DEFAULT NULL,
  next_calibration DATE         DEFAULT NULL,
  status           VARCHAR(30)  NOT NULL DEFAULT 'Active'
                     CHECK (status IN ('Active','Calibration Due','Under Repair','Disconnected','Decommissioned')),
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW()
);

-- 4. METER CALIBRATIONS
CREATE TABLE IF NOT EXISTS meter_calibrations (
  id               SERIAL PRIMARY KEY,
  meter_id         INT          NOT NULL REFERENCES meter_assets(id) ON DELETE CASCADE ON UPDATE CASCADE,
  calibration_date DATE         NOT NULL,
  event_type       VARCHAR(80)  NOT NULL,
  technician_name  VARCHAR(100) NOT NULL,
  accuracy_margin  VARCHAR(30)  DEFAULT '+/- 0.5%',
  test_result      VARCHAR(20)  NOT NULL DEFAULT 'Passed'
                     CHECK (test_result IN ('Passed','Failed','Needs Overhaul')),
  notes            TEXT         DEFAULT NULL,
  created_at       TIMESTAMPTZ  DEFAULT NOW()
);

-- 5. GEO CONNECTIONS
CREATE TABLE IF NOT EXISTS geo_connections (
  id          SERIAL PRIMARY KEY,
  consumer_id INT          NOT NULL REFERENCES consumers(id) ON DELETE CASCADE ON UPDATE CASCADE,
  zone        VARCHAR(100) NOT NULL,
  latitude    NUMERIC(10,6) NOT NULL,
  longitude   NUMERIC(10,6) NOT NULL,
  status      VARCHAR(20)  NOT NULL DEFAULT 'Normal'
                CHECK (status IN ('Normal','Overdue','Maintenance')),
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- 6. TARIFF RATES
CREATE TABLE IF NOT EXISTS tariff_rates (
  id                      SERIAL PRIMARY KEY,
  classification          VARCHAR(20) NOT NULL UNIQUE
                            CHECK (classification IN ('Residential','Commercial','Institutional')),
  min_charge              NUMERIC(10,2) NOT NULL,
  min_cum                 INT           NOT NULL DEFAULT 10,
  bracket_1_rate          NUMERIC(10,2) NOT NULL,
  bracket_2_rate          NUMERIC(10,2) NOT NULL,
  bracket_3_rate          NUMERIC(10,2) NOT NULL,
  environmental_fee_rate  NUMERIC(4,2)  NOT NULL DEFAULT 0.10,
  meter_maintenance_fee   NUMERIC(10,2) NOT NULL DEFAULT 25.00,
  overdue_penalty_rate    NUMERIC(4,2)  NOT NULL DEFAULT 0.10,
  is_active               BOOLEAN       NOT NULL DEFAULT TRUE,
  updated_at              TIMESTAMPTZ   DEFAULT NOW()
);

-- 7. BILLS
CREATE TABLE IF NOT EXISTS bills (
  id              SERIAL PRIMARY KEY,
  bill_no         VARCHAR(30)   NOT NULL UNIQUE,
  consumer_id     INT           NOT NULL REFERENCES consumers(id) ON DELETE CASCADE ON UPDATE CASCADE,
  billing_period  VARCHAR(60)   NOT NULL,
  prev_reading    NUMERIC(10,2) NOT NULL,
  pres_reading    NUMERIC(10,2) NOT NULL,
  consumption_cum NUMERIC(10,2) NOT NULL,
  base_amount     NUMERIC(10,2) NOT NULL,
  env_fee         NUMERIC(10,2) NOT NULL,
  maint_fee       NUMERIC(10,2) NOT NULL,
  arrears         NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  penalty         NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_amount    NUMERIC(10,2) NOT NULL,
  status          VARCHAR(20)   NOT NULL DEFAULT 'Ready'
                    CHECK (status IN ('Ready','Overdue','Paid','Disputed')),
  due_date        DATE          NOT NULL,
  paid_date       DATE          DEFAULT NULL,
  days_overdue    INT           DEFAULT 0,
  created_at      TIMESTAMPTZ   DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   DEFAULT NOW()
);

-- 8. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id              SERIAL PRIMARY KEY,
  or_number       VARCHAR(30)   NOT NULL UNIQUE,
  bill_id         INT           NOT NULL REFERENCES bills(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  consumer_id     INT           NOT NULL REFERENCES consumers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  cashier_id      INT           DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  amount_paid     NUMERIC(10,2) NOT NULL,
  tendered_amount NUMERIC(10,2) NOT NULL,
  change_amount   NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  payment_method  VARCHAR(20)   NOT NULL DEFAULT 'Cash'
                    CHECK (payment_method IN ('Cash','GCash','Maya','Bank Transfer')),
  payment_date    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  notes           VARCHAR(255)  DEFAULT NULL
);

-- 9. MAINTENANCE TICKETS
CREATE TABLE IF NOT EXISTS maintenance_tickets (
  id                    SERIAL PRIMARY KEY,
  ticket_no             VARCHAR(30)  NOT NULL UNIQUE,
  consumer_id           INT          NOT NULL REFERENCES consumers(id) ON DELETE CASCADE ON UPDATE CASCADE,
  zone                  VARCHAR(100) NOT NULL,
  issue_type            VARCHAR(100) NOT NULL,
  priority              VARCHAR(20)  NOT NULL DEFAULT 'Medium'
                          CHECK (priority IN ('Urgent','High','Medium','Low')),
  status                VARCHAR(20)  NOT NULL DEFAULT 'Reported'
                          CHECK (status IN ('Reported','Pending','Dispatched','In Progress','Resolved')),
  assigned_technician_id INT         DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  technician_name       VARCHAR(100) DEFAULT NULL,
  reported_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  resolved_at           TIMESTAMPTZ  DEFAULT NULL,
  description           TEXT         NOT NULL,
  resolution_notes      TEXT         DEFAULT NULL,
  resolution_image      TEXT         DEFAULT NULL
);

-- 10. AUDIT TRAIL
CREATE TABLE IF NOT EXISTS audit_trail (
  id            SERIAL PRIMARY KEY,
  log_code      VARCHAR(30)  NOT NULL UNIQUE,
  user_id       INT          DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  user_name     VARCHAR(100) NOT NULL,
  user_role     VARCHAR(50)  NOT NULL,
  category      VARCHAR(20)  NOT NULL
                  CHECK (category IN ('Billing','Payment','Consumer','Meter','Service','Arrears','Security')),
  action        VARCHAR(120) NOT NULL,
  target_entity VARCHAR(120) NOT NULL,
  details       TEXT         NOT NULL,
  ip_address    VARCHAR(45)  NOT NULL DEFAULT '127.0.0.1',
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- 11. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id                  SERIAL PRIMARY KEY,
  notification_code   VARCHAR(50)  NOT NULL UNIQUE,
  type                VARCHAR(30)  NOT NULL
                        CHECK (type IN ('Billing Notice','Payment Reminder','Overdue Notice','Service Alert')),
  recipient_name      VARCHAR(120) NOT NULL,
  account_no          VARCHAR(30)  NOT NULL,
  consumer_id         VARCHAR(20)  DEFAULT NULL,
  ticket_id           VARCHAR(30)  DEFAULT NULL,
  resolution_image    TEXT         DEFAULT NULL,
  message             TEXT         NOT NULL,
  channel             VARCHAR(20)  NOT NULL DEFAULT 'SMS'
                        CHECK (channel IN ('SMS','Email','System Push')),
  status              VARCHAR(20)  NOT NULL DEFAULT 'Sent'
                        CHECK (status IN ('Sent','Failed','Pending')),
  sent_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 12. SYSTEM BOUNDARIES
CREATE TABLE IF NOT EXISTS system_boundaries (
  boundary_key  VARCHAR(50)  PRIMARY KEY,
  boundary_data JSONB        NOT NULL,
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- 13. BILLING RUNS
CREATE TABLE IF NOT EXISTS billing_runs (
  run_key            VARCHAR(20)  PRIMARY KEY,
  billing_period     VARCHAR(60)  NOT NULL,
  run_date           DATE         NOT NULL,
  inserted_count     INT          NOT NULL DEFAULT 0,
  notification_count INT          NOT NULL DEFAULT 0,
  status             VARCHAR(20)  NOT NULL DEFAULT 'Running'
                       CHECK (status IN ('Running','Completed','Failed')),
  created_at         TIMESTAMPTZ  DEFAULT NOW(),
  completed_at       TIMESTAMPTZ  DEFAULT NULL
);

-- 14. BILLING ADJUSTMENTS
CREATE TABLE IF NOT EXISTS billing_adjustments (
  id                SERIAL PRIMARY KEY,
  adjustment_code   VARCHAR(30)   NOT NULL UNIQUE,
  bill_id           INT           NOT NULL REFERENCES bills(id) ON DELETE CASCADE ON UPDATE CASCADE,
  account_no        VARCHAR(30)   NOT NULL,
  consumer_name     VARCHAR(120)  NOT NULL,
  reason            VARCHAR(255)  NOT NULL,
  adjustment_amount NUMERIC(10,2) NOT NULL,
  requested_by      VARCHAR(100)  NOT NULL,
  approved_by       VARCHAR(100)  DEFAULT NULL,
  status            VARCHAR(20)   NOT NULL DEFAULT 'Pending'
                      CHECK (status IN ('Pending','Approved','Rejected')),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   DEFAULT NOW()
);

-- 15. SERVICE RATINGS
CREATE TABLE IF NOT EXISTS service_ratings (
  id            SERIAL PRIMARY KEY,
  ticket_no     VARCHAR(30)  NOT NULL,
  consumer_id   INT          NOT NULL,
  consumer_name VARCHAR(120) NOT NULL,
  rating        INT          NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback      TEXT         DEFAULT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- SEED DATA (matches seed.sql values)
-- ====================================================================

INSERT INTO users (id, username, password_hash, full_name, email, contact_no, role, status) VALUES
(1, 'jamie.dizon',   'hashed', 'Jamie Dizon',            'jamie.dizon@waterline.gov.ph',   '+63 917 111 2233', 'Administrator', 'Active'),
(2, 'roberto.ramos', 'hashed', 'Roberto Ramos',          'roberto.ramos@waterline.gov.ph', '+63 918 222 3344', 'Technician',    'Active'),
(3, 'tomas.cruz',    'hashed', 'Tomas Cruz',             'tomas.cruz@waterline.gov.ph',    '+63 919 333 4455', 'Technician',    'Active'),
(4, 'gil.santos',    'hashed', 'Gil Santos',             'gil.santos@waterline.gov.ph',    '+63 920 444 5566', 'Technician',    'Active'),
(5, 'cashier1',      'hashed', 'Counter Cashier Alpha',  'cashier1@waterline.gov.ph',      '+63 921 555 6677', 'Cashier',       'Active')
ON CONFLICT (username) DO NOTHING;

INSERT INTO tariff_rates (classification, min_charge, min_cum, bracket_1_rate, bracket_2_rate, bracket_3_rate, environmental_fee_rate, meter_maintenance_fee, overdue_penalty_rate) VALUES
('Residential',  180.00, 10, 22.50, 28.00, 35.00, 0.10, 25.00, 0.10),
('Commercial',   360.00, 10, 42.00, 52.00, 65.00, 0.10, 40.00, 0.10),
('Institutional',250.00, 10, 30.00, 38.00, 48.00, 0.10, 30.00, 0.10)
ON CONFLICT (classification) DO NOTHING;

INSERT INTO consumers (id, consumer_code, account_no, username, full_name, contact_no, service_address, zone, classification, meter_serial, status, approval_status, connection_date, last_reading) VALUES
(1, 'C-1001', 'ACC-88201', 'amina.okafor',  'Amina Okafor',      '+63 917 234 5678', 'Block 4 Lot 12, Riverdale Heights',  'Mabuhay',    'Residential', 'MTR-77291', 'Active',  'Approved', '2024-03-15', 148.00),
(2, 'C-1002', 'ACC-88202', 'caleb.mensah',  'Caleb Mensah',      '+63 928 345 6789', '15 Magsaysay St., Barangay Riverside','Riverside',  'Residential', 'MTR-77292', 'Overdue', 'Approved', '2023-11-20', 215.00),
(3, 'C-1003', 'ACC-88203', 'lina.santos',   'Lina Santos',       '+63 919 456 7890', '74 Hillcrest Drive, Hillview',        'Hillview',   'Commercial',  'MTR-77293', 'Active',  'Approved', '2024-01-10', 342.00),
(4, 'C-1004', 'ACC-88204', NULL,            'Marco Dela Cruz',   '+63 905 567 8901', '89 Commercial Hub, East Market',      'East Market','Commercial',  'MTR-77294', 'Active',  'Approved', '2023-08-04', 198.00),
(5, 'C-1005', 'ACC-88205', NULL,            'Elena Rostova',     '+63 945 678 9012', '22 Palm Grove Avenue',                'Mabuhay',    'Residential', 'MTR-77295', 'Active',  'Approved', '2024-05-18',  89.00),
(6, 'C-1006', 'ACC-88206', 'danilo.aquino', 'Danilo Aquino',     '+63 918 789 0123', '44 Fisherman Wharf',                  'Riverside',  'Residential', 'MTR-77296', 'Overdue', 'Approved', '2022-09-12', 412.00),
(7, 'C-1007', 'ACC-88207', NULL,            'Sophia Villanueva', '+63 920 890 1234', '101 Summit Ridge, Hillview',          'Hillview',   'Residential', 'MTR-77297', 'Active',  'Approved', '2024-02-28', 165.00),
(8, 'C-1008', 'ACC-88208', NULL,            'Victor Tan Bakery', '+63 917 901 2345', '12 Central Plaza, East Market',       'East Market','Commercial',  'MTR-77298', 'Active',  'Approved', '2023-04-14', 512.00)
ON CONFLICT (consumer_code) DO NOTHING;

INSERT INTO meter_assets (id, serial_no, brand, model, pipe_size, install_date, consumer_id, zone, last_calibration, next_calibration, status) VALUES
(1, 'MTR-77291', 'Aquaflow Pro',     'AF-20-Brass', '1/2 inch',  '2024-03-15', 1, 'Mabuhay',    '2025-03-10', '2027-03-10', 'Active'),
(2, 'MTR-77292', 'HydroMaster',      'HM-15D',      '1/2 inch',  '2023-11-20', 2, 'Riverside',  '2024-11-15', '2026-11-15', 'Active'),
(3, 'MTR-77293', 'Zenner Commercial','ZN-25-Ind',   '1 inch',    '2024-01-10', 3, 'Hillview',   '2025-01-08', '2026-07-08', 'Calibration Due'),
(4, 'MTR-77294', 'Zenner Commercial','ZN-25-Ind',   '1 inch',    '2023-08-04', 4, 'East Market','2024-08-01', '2026-08-01', 'Active'),
(5, 'MTR-77295', 'Aquaflow Pro',     'AF-20-Brass', '1/2 inch',  '2024-05-18', 5, 'Mabuhay',   '2024-05-18', '2026-05-18', 'Active'),
(6, 'MTR-77296', 'HydroMaster',      'HM-15D',      '1/2 inch',  '2022-09-12', 6, 'Riverside',  '2024-09-10', '2025-09-10', 'Under Repair'),
(7, 'MTR-77297', 'Aquaflow Pro',     'AF-20-Brass', '1/2 inch',  '2024-02-28', 7, 'Hillview',   '2024-02-28', '2026-02-28', 'Active'),
(8, 'MTR-77298', 'Zenner Commercial','ZN-40-Bulk',  '1.5 inch',  '2023-04-14', 8, 'East Market','2025-04-10', '2026-10-10', 'Active')
ON CONFLICT (serial_no) DO NOTHING;

INSERT INTO meter_calibrations (meter_id, calibration_date, event_type, technician_name, accuracy_margin, test_result, notes) VALUES
(1, '2024-03-15', 'Installation',        'Roberto Ramos', '+/- 0.3%', 'Passed',        'Initial installation inspection completed without issue.'),
(1, '2025-03-10', 'Routine Calibration', 'Tomas Cruz',    '+/- 0.4%', 'Passed',        'Calibrated on mobile test bench; certified margin compliant.'),
(2, '2023-11-20', 'Installation',        'Gil Santos',    '+/- 0.5%', 'Passed',        'Installed with dual-check backflow preventer.'),
(3, '2025-01-08', 'Annual Calibration',  'Tomas Cruz',    '+/- 0.8%', 'Needs Overhaul','Passed with minor dial adjustment; scheduled for replacement next cycle.'),
(6, '2026-08-28', 'Repair Scheduled',    'Roberto Ramos', '+/- 1.4%', 'Failed',        'Consumer reported glass fogging and condensation.');

INSERT INTO geo_connections (consumer_id, zone, latitude, longitude, status) VALUES
(1, 'Mabuhay',    14.618500, 121.032000, 'Normal'),
(2, 'Riverside',  14.595000, 121.054000, 'Overdue'),
(3, 'Hillview',   14.582000, 121.062000, 'Normal'),
(4, 'East Market',14.575000, 121.038000, 'Normal'),
(5, 'Mabuhay',    14.624000, 121.026000, 'Normal'),
(6, 'Riverside',  14.602000, 121.061000, 'Maintenance'),
(7, 'Hillview',   14.579000, 121.071000, 'Normal'),
(8, 'East Market',14.571000, 121.045000, 'Normal');

INSERT INTO bills (id, bill_no, consumer_id, billing_period, prev_reading, pres_reading, consumption_cum, base_amount, env_fee, maint_fee, arrears, penalty, total_amount, status, due_date, days_overdue) VALUES
(1, 'WS-240981', 1, 'Aug 01 – Aug 31, 2026', 124.00, 148.00, 24.00, 1317.00, 131.70, 25.00, 0.00,    0.00,  1473.70, 'Ready',  '2026-09-20', 0),
(2, 'WS-240977', 2, 'Jul 01 – Jul 31, 2026', 198.00, 215.00, 17.00,  828.50,  82.85, 25.00, 0.00,   82.85,  1019.20, 'Overdue','2026-08-20', 14),
(3, 'WS-240973', 3, 'Aug 01 – Aug 31, 2026', 312.00, 342.00, 30.00, 1880.00, 188.00, 40.00, 0.00,    0.00,  2108.00, 'Ready',  '2026-09-22', 0),
(4, 'WS-240966', 4, 'Aug 01 – Aug 31, 2026', 185.00, 198.00, 13.00,  654.00,  65.40, 25.00, 0.00,    0.00,   744.40, 'Paid',   '2026-09-18', 0),
(5, 'WS-240955', 6, 'Jun 01 – Jun 30, 2026', 370.00, 412.00, 42.00, 1680.00, 168.00, 25.00, 1250.00,293.00, 3416.00, 'Overdue','2026-07-20', 45)
ON CONFLICT (bill_no) DO NOTHING;

INSERT INTO payments (id, or_number, bill_id, consumer_id, cashier_id, amount_paid, tendered_amount, change_amount, payment_method, notes) VALUES
(1, 'OR-2026-9041', 4, 4, 1, 744.40, 1000.00, 255.60, 'Cash',  'Over-the-counter bill settlement.'),
(2, 'OR-2026-9040', 1, 5, 1, 580.00,  580.00,   0.00, 'GCash', 'Digital wallet instant settlement.')
ON CONFLICT (or_number) DO NOTHING;

INSERT INTO maintenance_tickets (id, ticket_no, consumer_id, zone, issue_type, priority, status, technician_name, reported_at, description, resolution_notes) VALUES
(1, 'SR-2026-0182', 6, 'Riverside',   'Low Water Pressure',       'Urgent', 'In Progress', 'Roberto Ramos', '2026-09-03 08:42:00', 'Mainline pressure drop observed in Sector 4 branch line.',      'Technician dispatched to inspect pressure valve regulator #3.'),
(2, 'SR-2026-0181', 3, 'Hillview',    'Meter Calibration Request', 'Medium', 'Dispatched',  'Tomas Cruz',    '2026-09-03 06:15:00', 'Consumer requested annual checkup before peak season.',          'Work order printed and queued for field calibration van.'),
(3, 'SR-2026-0180', 1, 'Mabuhay',    'Pipe Leak Near Curb Stop',  'High',   'Resolved',    'Gil Santos',    '2026-09-02 13:20:00', 'Minor moisture leak near water meter shutoff valve.',           'Replaced Teflon seal and tightened union connector. Tested leak-free.'),
(4, 'SR-2026-0179', 8, 'East Market','Water Discoloration Check',  'Low',    'Resolved',    'Roberto Ramos', '2026-09-01 11:00:00', 'Slight turbidity after municipal mainline maintenance.',         'Flushed fire hydrant for 5 minutes. Water cleared and turbidity tested 0.4 NTU.')
ON CONFLICT (ticket_no) DO NOTHING;

INSERT INTO audit_trail (log_code, user_id, user_name, user_role, category, action, target_entity, details, ip_address) VALUES
('AUD-901', 1, 'Jamie Dizon', 'Administrator',  'Billing', 'Verified Meter Reading Run',      'Zone Mabuhay (Cycle 26-08)',      'Verified 48 meter readings with 99.2% confidence score.',                         '192.168.1.104'),
('AUD-902', 1, 'Jamie Dizon', 'Administrator',  'Service', 'Assigned Work Order',              'SR-2026-0182 (Danilo Aquino)',    'Assigned Roberto Ramos to investigate low water pressure.',                       '192.168.1.104'),
('AUD-903', 1, 'Jamie Dizon', 'Cashier / POS',  'Payment', 'Processed Counter Payment',        'OR-2026-9041 / Marco Dela Cruz', 'Received ₱ 744.40 cash payment. Bill WS-240966 updated to PAID.',                'POS-TERMINAL-01'),
('AUD-904', NULL,'System Bot','Automated Job',  'Arrears', 'Overdue Penalty Computed',         '18 Overdue Accounts',            'Calculated 10% statutory overdue surcharge for accounts past due date.',           'SYSTEM_CRON'),
('AUD-905', 1, 'Jamie Dizon', 'Administrator',  'Meter',   'Updated Meter Calibration Status', 'MTR-77293 (Lina Santos)',        'Flagged meter calibration due date for Q3 audit.',                                '192.168.1.104')
ON CONFLICT (log_code) DO NOTHING;

-- Reset sequences so new inserts don't conflict with seeded IDs
SELECT setval('users_id_seq',      (SELECT MAX(id) FROM users));
SELECT setval('consumers_id_seq',  (SELECT MAX(id) FROM consumers));
SELECT setval('meter_assets_id_seq',(SELECT MAX(id) FROM meter_assets));
SELECT setval('bills_id_seq',      (SELECT MAX(id) FROM bills));
SELECT setval('payments_id_seq',   (SELECT MAX(id) FROM payments));
SELECT setval('maintenance_tickets_id_seq',(SELECT MAX(id) FROM maintenance_tickets));
