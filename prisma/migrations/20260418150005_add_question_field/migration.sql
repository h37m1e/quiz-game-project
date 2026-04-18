/*
  Warnings:

  - Added the required column `question` to the `Questions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Questions` ADD COLUMN `question` VARCHAR(255) NOT NULL;
