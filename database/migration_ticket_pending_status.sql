USE `waterline_db`;

ALTER TABLE `maintenance_tickets`
  MODIFY COLUMN `status` ENUM('Reported', 'Pending', 'Dispatched', 'In Progress', 'Resolved') NOT NULL DEFAULT 'Reported';