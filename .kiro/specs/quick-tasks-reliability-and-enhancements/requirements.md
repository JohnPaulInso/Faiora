# Requirements Document

## Introduction

This document specifies requirements for enhancing the reliability and functionality of the Faiora quick tasks system. The primary goal is to eliminate critical data loss bugs, implement automatic backup mechanisms, fix UI inconsistencies, and improve user authentication experience. This feature addresses five key areas: quick task ID structure reliability, daily backup system, calendar page design consistency, homepage loading flicker, and Google One Tap sign-in for desktop users.

## Glossary

- **Quick_Task_System**: The subsystem managing quick tasks including creation, modification, deletion, and synchronization
- **ID_Generator**: The component responsible for generating unique identifiers for quick tasks
- **Backup_Manager**: The component responsible for creating, storing, and restoring daily backups of quick tasks
- **Sync_Engine**: The 3-way merge synchronization system that resolves conflicts between local and server state
- **Calendar_Page**: The page displaying quick tasks in a calendar view
- **Homepage**: The main landing page displaying quick tasks with skeleton loaders
- **Settings_Page**: The page where users manage application settings and backups
- **Auth_System**: The Firebase authentication system managing user sign-in
- **Firestore_Database**: The cloud database storing user data including tasks, notes, and backups
- **LocalStorage**: The browser's local storage mechanism for offline-first data persistence
- **Skeleton_Loader**: A UI placeholder component displayed while content is loading
- **Google_One_Tap**: Google's streamlined sign-in experience for web applications
- **Desktop_View**: The application view rendered on desktop browsers (non-mobile devices)

## Requirements

### Requirement 1: Robust Quick Task ID Generation

**User Story:** As a user, I want quick task IDs to be as reliable as note IDs, so that I never lose tasks due to ID collisions or system updates.

#### Acceptance Criteria

1. THE ID_Generator SHALL create quick task IDs using the pattern 'qt_' + timestamp + '_' + random_string
2. THE random_string component SHALL be generated using Math.random().toString(36).slice(2, 7) to provide 5 alphanumeric characters
3. WHEN multiple quick tasks are created in rapid succession, THE ID_Generator SHALL increment the timestamp component by the array index to ensure uniqueness
4. THE ID_Generator SHALL produce IDs that are unique across all quick tasks in a user's account
5. FOR ALL pairs of distinct quick tasks, the quick task IDs SHALL be different (uniqueness property)
6. THE ID_Generator SHALL produce IDs that are collision-resistant with probability greater than 99.999%

### Requirement 2: Prevent Mass Deletion Bug

**User Story:** As a user, I want to be protected from accidentally deleting all my quick tasks when clicking on one task, so that I don't lose important data.

#### Acceptance Criteria

1. WHEN a user clicks to delete a single quick task, THE Quick_Task_System SHALL delete only that specific task
2. THE Quick_Task_System SHALL NOT delete multiple tasks when a single task deletion is requested
3. WHEN code updates are deployed, THE Quick_Task_System SHALL preserve all existing quick task IDs
4. THE Sync_Engine SHALL use the task ID field for identifying tasks during merge operations
5. FOR ALL delete operations on a single task, the number of tasks deleted SHALL equal exactly 1 (single deletion property)
6. WHEN a task with ID 'X' is deleted, THE Quick_Task_System SHALL NOT delete any task with ID 'Y' where X ≠ Y (isolation property)

### Requirement 3: Daily Backup System

**User Story:** As a user, I want automatic daily backups of my quick tasks, so that I can recover my data if something goes wrong.

#### Acceptance Criteria

1. WHEN a calendar day changes at midnight local time, THE Backup_Manager SHALL automatically create a backup of all quick tasks
2. THE Backup_Manager SHALL store backups in Firestore under the user's document in a 'quickTaskBackups' collection
3. THE Backup_Manager SHALL include a timestamp field in each backup document indicating when the backup was created
4. THE Backup_Manager SHALL include a complete snapshot of all active quick tasks at backup time
5. THE Backup_Manager SHALL retain the most recent 30 daily backups
6. WHEN more than 30 backups exist for a user, THE Backup_Manager SHALL delete the oldest backups to maintain the 30-backup limit
7. THE Backup_Manager SHALL create backups only when the user has an active internet connection
8. WHEN the user is offline at midnight, THE Backup_Manager SHALL create the backup when connectivity is restored
9. FOR ALL backups created on different calendar days, the backup timestamps SHALL represent distinct calendar days (uniqueness property)

### Requirement 4: Backup Management Interface

**User Story:** As a user, I want to view and restore previous backups from the Settings page, so that I can recover lost or corrupted data.

#### Acceptance Criteria

1. THE Settings_Page SHALL display a "Quick Task Backups" section
2. THE Settings_Page SHALL fetch and display the list of available backups from Firestore when the backup section is viewed
3. WHEN no backups exist, THE Settings_Page SHALL display a message indicating no backups are available
4. FOR ALL backups in the list, THE Settings_Page SHALL display the backup date and number of tasks in that backup
5. THE Settings_Page SHALL display backups in reverse chronological order with the most recent backup first
6. WHEN a user clicks on a backup entry, THE Settings_Page SHALL show a preview of the tasks in that backup
7. THE Settings_Page SHALL provide a "Restore" button for each backup
8. WHEN a user clicks "Restore" on a backup, THE Settings_Page SHALL display a confirmation dialog warning that current tasks will be replaced
9. WHEN a user confirms restoration, THE Backup_Manager SHALL replace current quick tasks with the selected backup's tasks
10. WHEN restoration is complete, THE Backup_Manager SHALL sync the restored tasks to Firestore
11. WHEN restoration is complete, THE Settings_Page SHALL display a success notification
12. FOR ALL restore operations, IF the user confirms THEN the current task count SHALL equal the backup task count after restoration (restoration correctness property)

### Requirement 5: Calendar Page Design Consistency

**User Story:** As a user, I want quick tasks on the Calendar page to look the same as on the Homepage and Quick Tasks page, so that the interface feels cohesive.

#### Acceptance Criteria

1. THE Calendar_Page SHALL render quick task cards using the same CSS classes as the Homepage
2. THE Calendar_Page SHALL apply the same font family, font size, and line height to quick task text as the Homepage
3. THE Calendar_Page SHALL use the same color scheme for quick task cards, borders, and backgrounds as the Homepage
4. THE Calendar_Page SHALL display quick task checkboxes with the same styling as the Homepage
5. THE Calendar_Page SHALL apply the same hover effects to quick task cards as the Homepage
6. THE Calendar_Page SHALL use the same icon set and icon sizes for quick task actions as the Homepage
7. FOR ALL CSS properties applied to quick tasks on the Homepage, THE Calendar_Page SHALL apply identical CSS property values (visual parity property)

### Requirement 6: Homepage Loading Flicker Fix

**User Story:** As a user, I want the homepage to load smoothly without flickering, so that the experience feels polished and professional.

#### Acceptance Criteria

1. WHEN the Homepage loads, THE Homepage SHALL display a skeleton loader while content is being fetched
2. WHEN content is ready, THE Homepage SHALL transition directly from skeleton loader to content without intermediate states
3. THE Homepage SHALL NOT display content, then hide it, then show it again during the loading sequence
4. THE Homepage SHALL NOT have a visible delay between skeleton loader disappearing and content appearing
5. THE transition from skeleton loader to content SHALL complete within 100ms
6. FOR ALL homepage loads, THE skeleton loader SHALL be visible exactly once per load cycle (single display property)
7. FOR ALL homepage loads, THE number of content visibility state changes SHALL equal exactly 1 (from hidden to visible) after the skeleton loader is removed (flicker-free property)

### Requirement 7: Google One Tap Sign-in for Desktop

**User Story:** As a desktop user, I want to see Google One Tap sign-in prompts, so that I can sign in quickly without manually entering credentials.

#### Acceptance Criteria

1. WHEN a user visits the application on a desktop browser, THE Auth_System SHALL initialize Google One Tap sign-in
2. THE Auth_System SHALL display the Google One Tap prompt only on desktop browsers with viewport width greater than 768 pixels
3. THE Auth_System SHALL NOT display the Google One Tap prompt on mobile devices with viewport width less than or equal to 768 pixels
4. WHEN a user is already authenticated, THE Auth_System SHALL NOT display the Google One Tap prompt
5. WHEN a user dismisses the Google One Tap prompt, THE Auth_System SHALL NOT show the prompt again during the same session
6. WHEN a user successfully signs in via Google One Tap, THE Auth_System SHALL authenticate the user and redirect to the homepage
7. THE Auth_System SHALL use the Google Identity Services library for One Tap functionality
8. THE Auth_System SHALL configure One Tap with the correct Google OAuth client ID from Firebase configuration
9. FOR ALL desktop page loads where the user is not authenticated, THE Google One Tap prompt SHALL appear within 2 seconds (responsiveness property)

### Requirement 8: Backup Data Integrity

**User Story:** As a user, I want backups to accurately preserve all task data, so that restored tasks are identical to the originals.

#### Acceptance Criteria

1. FOR ALL quick task fields (text, completed, progress, dueDate, dueTime, categories, reminders, pinned, progressHistory), THE Backup_Manager SHALL include these fields in backup snapshots
2. THE Backup_Manager SHALL serialize quick tasks to JSON format before storing in Firestore
3. THE Backup_Manager SHALL deserialize JSON data when loading backups for preview or restoration
4. FOR ALL quick tasks in a backup, WHEN the backup is created THEN restored, THE restored task data SHALL be identical to the original task data (round-trip property)
5. THE Backup_Manager SHALL validate JSON structure before attempting restoration
6. IF backup data is corrupted or invalid JSON, THEN THE Backup_Manager SHALL display an error message and abort restoration

### Requirement 9: Backup Storage Limits

**User Story:** As a user, I want the backup system to manage storage efficiently, so that I don't encounter storage quota issues.

#### Acceptance Criteria

1. THE Backup_Manager SHALL calculate the size of each backup before storing in Firestore
2. WHEN a backup would exceed 1MB in size, THE Backup_Manager SHALL log a warning but still create the backup
3. THE Backup_Manager SHALL include backup size information in the Settings_Page backup list
4. THE Backup_Manager SHALL implement cleanup logic to delete backups older than 30 days
5. WHEN cleanup runs, THE Backup_Manager SHALL preserve at least the 7 most recent backups regardless of age
6. FOR ALL users, THE total number of backups stored SHALL NOT exceed 30 (storage limit property)

### Requirement 10: Sync Engine Compatibility

**User Story:** As a user, I want the new ID structure and backup system to work seamlessly with the existing 3-way merge sync, so that multi-device usage remains reliable.

#### Acceptance Criteria

1. THE Sync_Engine SHALL continue to use the 3-way merge algorithm with baseline tracking for quick tasks
2. THE Sync_Engine SHALL identify tasks by their ID field during conflict resolution
3. THE Sync_Engine SHALL apply field-level merge strategies (OR logic for completion, maximum for progress, union for categories)
4. THE Backup_Manager SHALL NOT interfere with the Sync_Engine's baseline tracking mechanism
5. WHEN a backup is restored, THE Sync_Engine SHALL update the baseline to match the restored state
6. THE Sync_Engine SHALL save the baseline to LocalStorage after restoration completes
7. FOR ALL merge operations involving quick tasks with the new ID structure, THE Sync_Engine SHALL successfully identify and merge tasks by ID (compatibility property)

