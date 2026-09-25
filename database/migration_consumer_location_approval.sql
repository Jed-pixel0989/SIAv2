USE `waterline_db`;

ALTER TABLE `consumers`
  ADD COLUMN `location_approval_status` ENUM('None', 'Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'None'
  AFTER `approval_status`,
  ADD COLUMN `requested_latitude` DECIMAL(10, 6) DEFAULT NULL
  AFTER `location_approval_status`,
  ADD COLUMN `requested_longitude` DECIMAL(10, 6) DEFAULT NULL
  AFTER `requested_latitude`;