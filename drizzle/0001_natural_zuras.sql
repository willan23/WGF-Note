CREATE TABLE `cloudFileCollaborators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('viewer','editor') NOT NULL DEFAULT 'editor',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cloudFileCollaborators_id` PRIMARY KEY(`id`),
	CONSTRAINT `cloudFileCollaborators_file_user_unique` UNIQUE(`fileId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `cloudFiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`relativePath` varchar(512) NOT NULL,
	`name` varchar(255) NOT NULL,
	`language` enum('python','javascript','typescript','html','css','json','markdown','sql','java','c','cpp','csharp','plaintext') NOT NULL,
	`content` text NOT NULL,
	`revision` int NOT NULL DEFAULT 1,
	`deletedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cloudFiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `cloudFiles_owner_path_unique` UNIQUE(`ownerId`,`relativePath`)
);
