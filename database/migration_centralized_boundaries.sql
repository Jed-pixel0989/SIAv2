USE `waterline_db`;

ALTER TABLE `consumers`
  MODIFY COLUMN `zone` VARCHAR(100) NOT NULL;

ALTER TABLE `meter_assets`
  MODIFY COLUMN `zone` VARCHAR(100) NOT NULL;

ALTER TABLE `geo_connections`
  MODIFY COLUMN `zone` VARCHAR(100) NOT NULL;

ALTER TABLE `maintenance_tickets`
  MODIFY COLUMN `zone` VARCHAR(100) NOT NULL;

CREATE TABLE IF NOT EXISTS `system_boundaries` (
  `boundary_key` VARCHAR(50) PRIMARY KEY,
  `boundary_data` JSON NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `billing_runs` (
  `run_key` VARCHAR(20) PRIMARY KEY,
  `billing_period` VARCHAR(60) NOT NULL,
  `run_date` DATE NOT NULL,
  `inserted_count` INT NOT NULL DEFAULT 0,
  `notification_count` INT NOT NULL DEFAULT 0,
  `status` ENUM('Running', 'Completed', 'Failed') NOT NULL DEFAULT 'Running',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `completed_at` DATETIME DEFAULT NULL
) ENGINE=InnoDB;