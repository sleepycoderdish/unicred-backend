-- AddForeignKey
ALTER TABLE `departments` ADD CONSTRAINT `departments_hodUserId_fkey` FOREIGN KEY (`hodUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
