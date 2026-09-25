-- ============================================================
-- Migration: Add resolution_image support
-- Adds resolution_image to maintenance_tickets so field staff
-- photos are stored in the database and served to consumers.
-- Also adds consumer_id, ticket_id, and resolution_image to
-- notifications so the consumer portal can display the photo.
-- Run once against waterline_db.
-- ============================================================

-- 1. Field staff repair photo stored directly on the ticket
ALTER TABLE `maintenance_tickets`
  ADD COLUMN IF NOT EXISTS `resolution_image` MEDIUMTEXT DEFAULT NULL
    COMMENT 'Base64-encoded JPEG repair photo uploaded by field staff';

-- 2. Link notifications back to the originating ticket and consumer,
--    and carry the repair photo so it is returned in the bulk fetch.
ALTER TABLE `notifications`
  ADD COLUMN IF NOT EXISTS `consumer_id`      VARCHAR(30)  DEFAULT NULL
    COMMENT 'Consumer code (C-XXXX) who owns this notification',
  ADD COLUMN IF NOT EXISTS `ticket_id`        VARCHAR(30)  DEFAULT NULL
    COMMENT 'Ticket number (SR-XXXX) that triggered this notification',
  ADD COLUMN IF NOT EXISTS `resolution_image` MEDIUMTEXT   DEFAULT NULL
    COMMENT 'Base64 repair photo copied from the resolved ticket';

-- Indexes for consumer portal lookup
ALTER TABLE `notifications`
  ADD INDEX IF NOT EXISTS `idx_notifications_consumer_id` (`consumer_id`),
  ADD INDEX IF NOT EXISTS `idx_notifications_ticket_id`   (`ticket_id`);

-- Also allow 'Ongoing' status on tickets (matches frontend)
ALTER TABLE `maintenance_tickets`
  MODIFY COLUMN `status`
    ENUM('Reported','Pending','Ongoing','Dispatched','In Progress','Resolved')
    NOT NULL DEFAULT 'Reported';
