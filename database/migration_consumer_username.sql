-- Store self-service household usernames with their consumer profiles.
USE `waterline_db`;

ALTER TABLE `consumers`
  ADD COLUMN `username` VARCHAR(50) DEFAULT NULL UNIQUE AFTER `account_no`;