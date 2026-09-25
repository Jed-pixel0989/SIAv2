USE `waterline_db`;

ALTER TABLE `consumers`
  ADD COLUMN `approval_status` ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Approved'
  AFTER `status`;