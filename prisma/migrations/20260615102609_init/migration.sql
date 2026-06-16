/*
  Warnings:

  - You are about to drop the column `subjectName` on the `subject_marks` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[schoolId,name]` on the table `departments` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `achievements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `announcements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `departments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `designation` to the `faculty` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `faculty` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `internships` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `projects` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `resumes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `schools` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `semesters` table without a default value. This is not possible if the table is not empty.
  - Added the required column `level` to the `skills` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currentSemester` to the `students` table without a default value. This is not possible if the table is not empty.
  - Added the required column `graduationYear` to the `students` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `students` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subjectId` to the `subject_marks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passwordHash` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `achievements` DROP FOREIGN KEY `achievements_studentId_fkey`;

-- DropForeignKey
ALTER TABLE `internships` DROP FOREIGN KEY `internships_studentId_fkey`;

-- DropForeignKey
ALTER TABLE `notifications` DROP FOREIGN KEY `notifications_userId_fkey`;

-- DropForeignKey
ALTER TABLE `projects` DROP FOREIGN KEY `projects_studentId_fkey`;

-- DropForeignKey
ALTER TABLE `resumes` DROP FOREIGN KEY `resumes_studentId_fkey`;

-- DropForeignKey
ALTER TABLE `skills` DROP FOREIGN KEY `skills_studentId_fkey`;

-- AlterTable
ALTER TABLE `achievements` ADD COLUMN `certificateUrl` VARCHAR(191) NULL,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `proofUrl` VARCHAR(191) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    ADD COLUMN `verificationComment` VARCHAR(191) NULL,
    ADD COLUMN `verifiedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `announcements` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `expiresAt` DATETIME(3) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `cgpa_records` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `departments` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `faculty` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `designation` VARCHAR(191) NOT NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `internships` ADD COLUMN `certificateUrl` VARCHAR(191) NULL,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `endDate` DATETIME(3) NULL,
    ADD COLUMN `offerLetterUrl` VARCHAR(191) NULL,
    ADD COLUMN `startDate` DATETIME(3) NULL,
    ADD COLUMN `stipend` DOUBLE NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `notifications` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `link` VARCHAR(191) NULL,
    ADD COLUMN `readAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `projects` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `endDate` DATETIME(3) NULL,
    ADD COLUMN `liveUrl` VARCHAR(191) NULL,
    ADD COLUMN `startDate` DATETIME(3) NULL,
    ADD COLUMN `techStack` JSON NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `resume_templates` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `resumes` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `isCurrent` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    ADD COLUMN `version` INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE `schools` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `semesters` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `skills` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `level` ENUM('beginner', 'intermediate', 'advanced', 'expert') NOT NULL;

-- AlterTable
ALTER TABLE `students` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `currentSemester` INTEGER NOT NULL,
    ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `graduationYear` INTEGER NOT NULL,
    ADD COLUMN `isPlaced` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `subject_marks` DROP COLUMN `subjectName`,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `subjectId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `bio` VARCHAR(191) NULL,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `githubUrl` VARCHAR(191) NULL,
    ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `lastLoginAt` DATETIME(3) NULL,
    ADD COLUMN `linkedinUrl` VARCHAR(191) NULL,
    ADD COLUMN `passwordHash` VARCHAR(191) NOT NULL,
    ADD COLUMN `phoneNumber` VARCHAR(191) NULL,
    ADD COLUMN `portfolioUrl` VARCHAR(191) NULL,
    ADD COLUMN `profilePhotoUrl` VARCHAR(191) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `deviceName` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `refresh_tokens_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` INTEGER NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subjects` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `schoolId` INTEGER NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `subjects_schoolId_code_key`(`schoolId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `placements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `studentId` INTEGER NOT NULL,
    `companyName` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `packageLpa` DOUBLE NOT NULL,
    `offerLetterUrl` VARCHAR(191) NULL,
    `joined` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `placements_studentId_idx`(`studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `cgpa_records_studentId_idx` ON `cgpa_records`(`studentId`);

-- CreateIndex
CREATE UNIQUE INDEX `departments_schoolId_name_key` ON `departments`(`schoolId`, `name`);

-- CreateIndex
CREATE INDEX `semesters_schoolId_idx` ON `semesters`(`schoolId`);

-- CreateIndex
CREATE INDEX `subject_marks_subjectId_idx` ON `subject_marks`(`subjectId`);

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subjects` ADD CONSTRAINT `subjects_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subject_marks` ADD CONSTRAINT `subject_marks_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `skills` ADD CONSTRAINT `skills_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `achievements` ADD CONSTRAINT `achievements_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `internships` ADD CONSTRAINT `internships_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `placements` ADD CONSTRAINT `placements_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resumes` ADD CONSTRAINT `resumes_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `achievements` RENAME INDEX `achievements_studentId_fkey` TO `achievements_studentId_idx`;

-- RenameIndex
ALTER TABLE `announcements` RENAME INDEX `announcements_departmentId_fkey` TO `announcements_departmentId_idx`;

-- RenameIndex
ALTER TABLE `cgpa_records` RENAME INDEX `cgpa_records_semesterId_fkey` TO `cgpa_records_semesterId_idx`;

-- RenameIndex
ALTER TABLE `departments` RENAME INDEX `departments_schoolId_fkey` TO `departments_schoolId_idx`;

-- RenameIndex
ALTER TABLE `faculty` RENAME INDEX `faculty_departmentId_fkey` TO `faculty_departmentId_idx`;

-- RenameIndex
ALTER TABLE `faculty` RENAME INDEX `faculty_schoolId_fkey` TO `faculty_schoolId_idx`;

-- RenameIndex
ALTER TABLE `internships` RENAME INDEX `internships_studentId_fkey` TO `internships_studentId_idx`;

-- RenameIndex
ALTER TABLE `notifications` RENAME INDEX `notifications_userId_fkey` TO `notifications_userId_idx`;

-- RenameIndex
ALTER TABLE `projects` RENAME INDEX `projects_studentId_fkey` TO `projects_studentId_idx`;

-- RenameIndex
ALTER TABLE `resumes` RENAME INDEX `resumes_studentId_fkey` TO `resumes_studentId_idx`;

-- RenameIndex
ALTER TABLE `skills` RENAME INDEX `skills_studentId_fkey` TO `skills_studentId_idx`;

-- RenameIndex
ALTER TABLE `students` RENAME INDEX `students_departmentId_fkey` TO `students_departmentId_idx`;

-- RenameIndex
ALTER TABLE `students` RENAME INDEX `students_schoolId_fkey` TO `students_schoolId_idx`;

-- RenameIndex
ALTER TABLE `subject_marks` RENAME INDEX `subject_marks_semesterId_fkey` TO `subject_marks_semesterId_idx`;

-- RenameIndex
ALTER TABLE `subject_marks` RENAME INDEX `subject_marks_studentId_fkey` TO `subject_marks_studentId_idx`;

-- RenameIndex
ALTER TABLE `users` RENAME INDEX `users_schoolId_fkey` TO `users_schoolId_idx`;
