USE `waterline_db`;

ALTER TABLE `meter_assets`
  MODIFY COLUMN `status` ENUM('Active', 'Calibration Due', 'Under Repair', 'Disconnected', 'Decommissioned') NOT NULL DEFAULT 'Active';