# Implementation Plan: Quick Tasks Reliability and Enhancements

## Overview

This implementation plan addresses five critical enhancement areas for the Faiora quick tasks system: robust ID generation, automated backup system, UI consistency across pages, loading state fix, and Google One Tap integration. The implementation follows an incremental approach with early validation through testing, ensuring each enhancement integrates seamlessly with the existing offline-first architecture and 3-way merge sync engine.

**Technology Stack**: JavaScript, React, Firebase (Firestore, Auth), Tailwind CSS

**Testing Approach**: Unit tests for specific behaviors, property-based tests (using fast-check) for universal correctness properties

---

## Tasks

### Phase 1: Robust Quick Task ID Generation

- [ ] 1. Implement collision-resistant ID generator
  - Create `generateQuickTaskId(index = 0)` function following pattern `qt_<timestamp>_<random>`
  - Use `Date.now() + index` for timestamp component to ensure uniqueness in batch operations
  - Use `Math.random().toString(36).slice(2, 7)` for 5-character random component
  - _Requirements: 1.1, 1.2, 1.3_

- [ ]* 1.1 Write property test for ID uniqueness in batch creation
  - **Property 1: ID Uniqueness in Batch Creation**
  - **Validates: Requirements 1.3, 1.4, 1.5**
  - Test that generating N tasks (1-100) produces N unique IDs
  - Use fast-check library with 100 test iterations
  - _Requirements: 1.5, 1.6_

- [ ] 2. Update task creation to use new ID generator
  - Modify `handleAddQuickTask()` function to call `generateQuickTaskId()`
  - For batch task creation (multiple tasks at once), pass array index to ensure uniqueness
  - Ensure existing tasks with old IDs remain unaffected (backward compatibility)
  - _Requirements: 1.4, 2.3_

- [ ]* 2.1 Write unit tests for ID format and structure
  - Test single task ID matches pattern `qt_<timestamp>_<random>`
  - Test random component is exactly 5 alphanumeric characters
  - Test multiple tasks created at same millisecond have different IDs
  - _Requirements: 1.1, 1.2_

- [ ] 3. Verify sync engine compatibility with new ID format
  - Review `smartMergeById()` function to ensure it correctly handles new ID format
  - Ensure 3-way merge baseline tracking uses ID field for task matching
  - Test that merge operations correctly identify and merge tasks by new ID structure
  - _Requirements: 2.4, 10.2, 10.7_

- [ ]* 3.1 Write property test for sync engine ID-based task matching
  - **Property 11: Sync Engine ID-Based Task Matching**
  - **Validates: Requirements 2.4, 10.2, 10.7**
  - Test that merge operations correctly match tasks by ID field
  - Generate random local and server task arrays with new ID format
  - _Requirements: 10.7_

### Phase 2: Automated Daily Backup System

- [ ] 4. Implement backup creation infrastructure
  - [ ] 4.1 Create `createDailyBackup()` function
    - Check user authentication and online connectivity
    - Read tasks from LocalStorage (`faiora_quick_tasks_${user.uid}`)
    - Create backup object with timestamp, date, tasks, count, and size fields
    - Write backup to Firestore path: `/tasks/{userId}/quickTaskBackups/backup_<YYYY-MM-DD>`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 8.1, 8.2_

  - [ ] 4.2 Implement backup cleanup logic
    - Create `cleanupOldBackups()` function
    - Fetch all backups ordered by timestamp descending
    - Delete backups beyond the 30 most recent
    - Preserve at least 7 most recent backups regardless of age (30-day threshold)
    - Use Firestore batch operations for deletion
    - _Requirements: 3.5, 3.6, 9.4, 9.5, 9.6_

  - [ ]* 4.3 Write property test for backup retention limit
    - **Property 4: Backup Retention Limit**
    - **Validates: Requirements 3.5, 3.6, 9.6**
    - Test with random number of backups (0-100) that cleanup never exceeds 30 backups
    - _Requirements: 9.6_

  - [ ]* 4.4 Write property test for backup age retention with minimum guarantee
    - **Property 10: Backup Age Retention with Minimum Guarantee**
    - **Validates: Requirements 9.4, 9.5**
    - Test that old backups (>30 days) are removed but at least 7 most recent are preserved
    - _Requirements: 9.5_

- [ ] 5. Implement daily backup scheduler
  - Create `scheduleDailyBackup()` function
  - Calculate milliseconds until next midnight using Date objects
  - Use `setTimeout` to trigger first backup at midnight
  - Use `setInterval` for subsequent daily backups (24-hour interval)
  - Handle offline scenarios: defer backup until connectivity restored using 'online' event listener
  - _Requirements: 3.1, 3.7, 3.8_

- [ ]* 5.1 Write unit tests for backup scheduler
  - Test calculation of time until midnight is correct
  - Test offline backup defers until connectivity restored
  - Test large backup (>1MB) logs warning but still creates
  - _Requirements: 3.7, 3.8, 9.2_

- [ ] 6. Implement backup data integrity validation
  - [ ] 6.1 Add field validation in `createDailyBackup()`
    - Ensure all task fields are included: text, completed, progress, dueDate, dueTime, categories, reminders, pinned, progressHistory
    - Serialize tasks to JSON format before Firestore write
    - Calculate and store backup size in bytes
    - _Requirements: 8.1, 8.2, 9.1_

  - [ ]* 6.2 Write property test for backup completeness
    - **Property 3: Backup Completeness**
    - **Validates: Requirements 3.4, 8.1**
    - Generate random tasks (0-100) with all fields and verify backup contains all tasks with all fields preserved
    - _Requirements: 8.1, 8.4_

  - [ ] 6.3 Add JSON structure validation
    - Create validation function to check backup data structure before restoration
    - Filter out invalid tasks (missing id or text fields)
    - Display error message if backup contains no valid tasks
    - _Requirements: 8.5, 8.6_

- [ ]* 6.4 Write unit tests for backup data validation
  - Test invalid backup structure shows error message
  - Test backup with corrupted JSON aborts restoration
  - Test invalid tasks are filtered out during restoration
  - _Requirements: 8.5, 8.6_

### Phase 3: Backup Management User Interface

- [ ] 7. Create backup management section in Settings page
  - [ ] 7.1 Build backup list display component
    - Add "Quick Task Backups" section to Settings page
    - Fetch backups from Firestore: `/tasks/{userId}/quickTaskBackups`
    - Display loading skeletons during fetch
    - Show empty state message when no backups exist
    - Display backups in reverse chronological order (newest first)
    - Show backup date, task count, and size for each backup
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 9.3_

  - [ ]* 7.2 Write unit tests for backup UI display
    - Test "Quick Task Backups" section renders in Settings page
    - Test empty state shows message when no backups exist
    - Test backup list displays date, count, and size
    - Test backups are ordered reverse chronologically (newest first)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 7.3 Write property test for backup UI display ordering
    - **Property 6: Backup UI Display Ordering**
    - **Validates: Requirements 4.5**
    - Generate random backup arrays and verify display is always newest-first
    - _Requirements: 4.5_

- [ ] 8. Implement backup preview functionality
  - Add "Preview" button for each backup in the list
  - Create preview modal component that displays tasks from selected backup
  - Show backup metadata (date, task count) in modal header
  - Display first 50 tasks with indication if more exist
  - Add close button to dismiss preview modal
  - _Requirements: 4.6_

- [ ]* 8.1 Write unit tests for backup preview
  - Test clicking "Preview" opens modal with task list
  - Test modal displays correct backup metadata
  - Test modal shows indication for backups with >50 tasks
  - _Requirements: 4.6_

- [ ] 9. Implement backup restoration flow
  - [ ] 9.1 Add restore button and confirmation dialog
    - Add "Restore" button for each backup in the list
    - Create confirmation modal warning that current tasks will be replaced
    - Display current task count vs backup task count in confirmation
    - Show warning message that action cannot be undone
    - Add Cancel and Restore buttons to confirmation modal
    - _Requirements: 4.7, 4.8_

  - [ ] 9.2 Implement `restoreBackup(backupId)` function
    - Fetch backup document from Firestore
    - Validate backup exists and has valid structure
    - Replace LocalStorage tasks with backup tasks
    - Update React state (`setQuickTasks`)
    - Sync restored tasks to Firestore
    - Update sync baseline in LocalStorage (`faiora_last_synced_tasks_${user.uid}`)
    - Display success notification with task count
    - _Requirements: 4.9, 4.10, 4.11, 10.5, 10.6_

  - [ ]* 9.3 Write property test for backup restoration round-trip
    - **Property 7: Backup Restoration Round-Trip**
    - **Validates: Requirements 4.9, 4.12, 8.4**
    - Generate random task arrays, create backup, restore, and verify restored tasks are identical to originals
    - _Requirements: 8.4, 4.12_

  - [ ]* 9.4 Write unit tests for restoration error handling
    - Test backup not found shows error toast
    - Test invalid backup structure shows error toast and aborts
    - Test restoration updates baseline for sync compatibility
    - Test successful restore displays success notification
    - _Requirements: 4.11, 8.6, 10.5_

### Phase 4: Calendar Page Quick Task Styling Consistency

- [ ] 10. Extract shared Quick Task Card component
  - [ ] 10.1 Create reusable `QuickTaskCard` component
    - Extract shared CSS classes from Homepage quick task rendering
    - Define base styling classes: background, border, padding, border-radius, transitions
    - Implement checkbox styling matching Homepage appearance
    - Add hover effects matching Homepage behavior
    - Include action icons (edit, delete) with consistent styling
    - Support due date, categories, and progress display
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ] 10.2 Define CSS variables for theming
    - Create CSS variables for card colors, borders, text colors
    - Use variables: `--qt-card-bg`, `--qt-card-border`, `--qt-text-color`, etc.
    - Ensure variables reference existing Tailwind theme colors
    - _Requirements: 5.3_

- [ ] 11. Apply shared component to Calendar page
  - Replace inline quick task rendering in Calendar page with `QuickTaskCard` component
  - Pass task data, event handlers (onToggle, onEdit, onDelete) as props
  - Verify calendar page tasks now match Homepage appearance
  - Test responsive behavior on mobile and desktop viewports
  - _Requirements: 5.1, 5.7_

- [ ]* 11.1 Write unit tests for visual consistency
  - Test Calendar page uses same CSS classes as Homepage
  - Test font family, size, and line-height match Homepage
  - Test color values match Homepage theme variables
  - Test checkbox styling matches Homepage
  - Test hover effects match Homepage
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ]* 11.2 Write property test for visual parity
  - **Property 7 (implied): Visual Parity Property**
  - **Validates: Requirements 5.7**
  - Test that all CSS properties applied to Homepage tasks are applied identically to Calendar page tasks
  - _Requirements: 5.7_

### Phase 5: Homepage Loading State Flicker Fix

- [ ] 12. Implement explicit loading state machine
  - [ ] 12.1 Refactor DashboardPage loading state
    - Replace implicit `isLoading` boolean with explicit `loadingState` state variable
    - Define states: 'INITIAL', 'LOADING', 'READY', 'ERROR'
    - Add `hasInitializedRef` using `useRef` to prevent re-initialization on prop changes
    - Initialize state to 'INITIAL' on component mount
    - Transition 'INITIAL' → 'LOADING' when user exists (only once)
    - Transition 'LOADING' → 'READY' after data fetch completes
    - _Requirements: 6.1, 6.2, 6.4_

  - [ ] 12.2 Update skeleton loader display logic
    - Show skeleton loader only when `loadingState === 'INITIAL' || loadingState === 'LOADING'`
    - Show content only when `loadingState === 'READY'`
    - Remove intermediate states that cause content visibility toggling
    - Add CSS fade-in transition (200ms) when content appears
    - _Requirements: 6.1, 6.2, 6.5_

  - [ ]* 12.3 Write property test for loading state transitions
    - **Property 8: Homepage Loading State Transition**
    - **Validates: Requirements 6.3, 6.6, 6.7**
    - Simulate homepage loads with various data configurations
    - Verify skeleton loader is visible exactly once per load cycle
    - Verify content visibility changes from hidden to visible exactly once (no flicker)
    - _Requirements: 6.6, 6.7_

- [ ]* 12.4 Write unit tests for loading state machine
  - Test initial state is 'INITIAL'
  - Test transitions to 'LOADING' on mount with user
  - Test transitions to 'READY' after data fetch
  - Test skeleton loader visible only during 'INITIAL' and 'LOADING'
  - Test content never visible until 'READY' state
  - Test timeout fallback after 5 seconds forces 'READY' state
  - _Requirements: 6.1, 6.2, 6.3_

### Phase 6: Google One Tap Sign-in Integration

- [ ] 13. Implement Google One Tap initialization
  - [ ] 13.1 Add Google Identity Services script loader
    - Check if user is already authenticated (skip if authenticated)
    - Check viewport width (only initialize if > 768px)
    - Check sessionStorage for dismissal flag
    - Dynamically load Google Identity Services script from `https://accounts.google.com/gsi/client`
    - Call initialization function after script loads
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.8_

  - [ ] 13.2 Configure Google One Tap prompt
    - Get Google OAuth client ID from Firebase config
    - Initialize with `window.google.accounts.id.initialize()`
    - Set configuration: client_id, callback, cancel_on_tap_outside: false, auto_select: false
    - Call `window.google.accounts.id.prompt()` to display One Tap UI
    - Handle prompt notifications: not displayed, skipped, dismissed
    - Store dismissal in sessionStorage to prevent re-display in same session
    - _Requirements: 7.5, 7.8_

  - [ ] 13.3 Implement One Tap sign-in handler
    - Create `handleOneTapSignIn(response)` callback function
    - Exchange Google credential for Firebase auth credential
    - Call `firebase.auth().signInWithCredential(credential)`
    - Navigate to homepage on successful authentication
    - Display error toast on sign-in failure (fallback to standard auth)
    - _Requirements: 7.6_

  - [ ]* 13.4 Write property test for One Tap desktop-only display
    - **Property 9: Google One Tap Desktop-Only Display**
    - **Validates: Requirements 7.2, 7.3, 7.9**
    - Test with random viewport widths (320-2560) and authentication states
    - Verify One Tap appears if and only if viewport > 768px and user not authenticated
    - _Requirements: 7.2, 7.3, 7.9_

- [ ] 14. Add responsive behavior and error handling
  - [ ] 14.1 Implement viewport resize handler
    - Add resize event listener to window
    - Cancel One Tap prompt if viewport resized to ≤768px
    - Call `window.google.accounts.id.cancel()` when mobile viewport detected
    - _Requirements: 7.2_

  - [ ]* 14.2 Write unit tests for One Tap behavior
    - Test One Tap initializes on desktop viewport (>768px)
    - Test One Tap does not initialize on mobile viewport (≤768px)
    - Test One Tap does not show if user already authenticated
    - Test dismissing One Tap sets sessionStorage flag
    - Test successful sign-in redirects to homepage
    - Test One Tap load failure is silent (fallback to standard auth)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

### Phase 7: Error Handling and Edge Cases

- [ ] 15. Implement comprehensive error handling
  - [ ] 15.1 Add ID generation error handling
    - Add duplicate detection check in task list before adding new task
    - Regenerate ID with incremented index if duplicate detected (extremely rare edge case)
    - Silent regeneration with no user-facing error
    - _Requirements: 1.6_

  - [ ] 15.2 Add backup creation error handling
    - Handle offline scenario: defer backup until connectivity restored
    - Catch Firestore write failures (permissions, quota) and log error
    - Log warning for large backups (>1MB) but proceed with creation
    - Integrate with error monitoring service (Sentry) if available
    - _Requirements: 3.7, 9.2_

  - [ ] 15.3 Add backup restoration error handling
    - Display error toast if backup not found in Firestore
    - Validate JSON structure and display error if corrupted
    - Filter out invalid tasks (missing id or text) with warning log
    - Handle Firestore sync failure after restoration (defer to auto-sync)
    - _Requirements: 8.5, 8.6_

  - [ ] 15.4 Add loading state timeout protection
    - Add 5-second timeout in loading state
    - Force transition to 'READY' state if data never loads
    - Log error for monitoring but display content to prevent blank screen
    - _Requirements: 6.4_

  - [ ]* 15.5 Write unit tests for error handling
    - Test backup creation failure logs error but doesn't crash app
    - Test invalid backup structure shows error toast
    - Test backup not found shows error toast
    - Test One Tap load failure is silent
    - Test loading state timeout forces READY state after 5 seconds
    - _Requirements: 3.7, 8.5, 8.6_

### Phase 8: Integration and Final Verification

- [ ] 16. Integration testing and verification
  - Test ID generation with sync engine (create, sync, merge tasks across devices)
  - Test backup creation at midnight with real Firestore connection
  - Test backup restoration syncs correctly to Firestore and updates baseline
  - Test Calendar page quick tasks match Homepage appearance pixel-perfect
  - Test homepage loads without flicker on slow network connections
  - Test Google One Tap appears on desktop and hides on mobile resize
  - _Requirements: All_

- [ ] 17. Initialize daily backup scheduler on app mount
  - Add `scheduleDailyBackup()` call to App component initialization (useEffect with user dependency)
  - Verify scheduler starts only when user is authenticated
  - Test first backup triggers at next midnight
  - Verify subsequent backups occur every 24 hours
  - _Requirements: 3.1_

- [ ] 18. Final checkpoint - Comprehensive verification
  - Run all unit tests and property-based tests
  - Verify no console errors or warnings
  - Test all five enhancement areas end-to-end:
    1. Create 50 tasks rapidly - verify all have unique IDs
    2. Trigger backup creation - verify appears in Firestore
    3. Restore backup - verify tasks replaced correctly
    4. Compare Calendar and Homepage quick tasks - verify identical appearance
    5. Reload homepage - verify no flicker during loading
    6. Test Google One Tap on desktop and mobile - verify correct behavior
  - Ensure all tests pass, ask the user if questions arise
  - _Requirements: All_

---

## Notes

- **Tasks marked with `*` are optional** and can be skipped for faster MVP deployment (test-related sub-tasks)
- **Each task references specific requirements** for full traceability back to requirements document
- **Property tests validate universal correctness properties** using fast-check library (100 iterations minimum)
- **Unit tests validate specific behaviors and edge cases** using standard JavaScript testing frameworks
- **Checkpoints ensure incremental validation** at reasonable breaks in implementation
- **Backward compatibility is maintained** - new ID format works alongside existing IDs, no data migration required
- **All enhancements integrate with existing 3-way merge sync engine** without disrupting baseline tracking
- **Implementation is incremental** - each phase can be deployed independently with minimal risk
- **Testing is comprehensive** - combination of property-based tests (universal guarantees) and unit tests (specific scenarios)

---

## Property-Based Testing Library

**Library**: `fast-check` (JavaScript property-based testing)

**Installation**: `npm install --save-dev fast-check`

**Configuration**: Minimum 100 iterations per property test (set via `{ numRuns: 100 }` option)

**Integration**: Property tests should be placed in dedicated test files alongside unit tests, following project testing conventions
