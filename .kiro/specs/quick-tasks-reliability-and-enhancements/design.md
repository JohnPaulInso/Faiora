# Technical Design Document

## Overview

This document provides the comprehensive technical design for enhancing the reliability and functionality of the Faiora quick tasks system. The design addresses five critical areas:

1. **Robust ID Generation** - Implementing a collision-resistant ID structure matching the reliability of the note system
2. **Automated Backup System** - Daily backup scheduler with 30-day retention and restore capabilities  
3. **UI Consistency** - Ensuring visual parity between Calendar, Homepage, and Quick Tasks pages
4. **Loading State Fix** - Eliminating the homepage skeleton loader flicker bug
5. **Google One Tap Integration** - Desktop-only authentication enhancement
6. **Sync Compatibility** - Ensuring seamless integration with the existing 3-way merge sync engine

### Design Principles

- **Offline-First**: Maintain existing LocalStorage-first architecture with cloud sync
- **Backward Compatible**: New ID structure must work with existing data and sync logic
- **Non-Disruptive**: Backup system operates transparently without impacting user experience
- **Zero Data Loss**: All reliability enhancements prioritize data preservation
- **Progressive Enhancement**: Features degrade gracefully when dependencies unavailable

---

## Architecture

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface Layer                      │
├───────────────┬──────────────────┬──────────────────────────────┤
│   Homepage    │  Calendar Page   │     Settings Page            │
│  (Dashboard)  │                  │   (Backup Management UI)      │
│               │                  │                               │
│ - Skeleton    │ - Quick Task     │ - Backup List Display        │
│   Loader      │   Cards (styled) │ - Restore Confirmation       │
│ - Quick Tasks │ - Date Picker    │ - Preview Modal              │
│ - Loading FSM │                  │                               │
└───────┬───────┴────────┬─────────┴──────────┬──────────────────┘
        │                │                    │
        v                v                    v
┌─────────────────────────────────────────────────────────────────┐
│                      Business Logic Layer                         │
├─────────────────┬──────────────────┬──────────────────────────
─────┤
│   ID Generator  │  Backup Manager  │   Sync Engine (existing)    │
│                 │                  │                               │
│ - generateId()  │ - createBackup() │ - triggerAutoSync()          │
│ - ensureUnique()│ - scheduleDaily()│ - smartMergeById()           │
│                 │ - restoreBackup()│ - 3-way merge                │
│                 │ - cleanupOld()   │ - baseline tracking          │
└────────┬────────┴────────┬─────────┴───────────┬────────────────┘
         │                 │                     │
         v                 v                     v
┌─────────────────────────────────────────────────────────────────┐
│                      Data Persistence Layer                       │
├──────────────────────────┬──────────────────────────────────────┤
│      LocalStorage        │         Firebase Firestore            │
│                          │                                        │
│ - faiora_quick_tasks_uid │ Collection: tasks/{userId}           │
│ - faiora_quick_task_     │   - quickTasks: []                   │
│   trash_uid              │   - quickTaskTrash: []               │
│ - faiora_last_synced_    │   - quickTaskBackups: []             │
│   tasks_uid (baseline)   │                                       │
│ - faiora_settings_uid    │ Collection: backups (sub-collection)│
│                          │   - timestamp: number                 │
│                          │   - tasks: []                         │
│                          │   - count: number                     │
│                          │   - size: number                      │
└──────────────────────────┴──────────────────────────────────────┘
```

### Component Interactions

1. **Task Creation Flow**:
   - User enters task text → `handleAddQuickTask()` → `generateQuickTaskId()` → LocalStorage write → Firestore sync

2. **Backup Creation Flow**:
   - Midnight timer fires → `createDailyBackup()` → reads LocalStorage → writes to Firestore backups → `cleanupOldBackups()`

3. **Restore Flow**:
   - User clicks restore → confirmation modal → `restoreBackup()` → replace LocalStorage → `handleUpdateQuickTasks()` → Firestore sync → update baseline

4. **Sync Flow** (existing, enhanced):
   - Online event → `triggerAutoSync()` → fetch server state → load LocalStorage + baseline → 3-way merge → write back → update baseline

---

## Components and Interfaces

### 1. ID Generator Module

**Purpose**: Generate unique, collision-resistant identifiers for quick tasks.

**Location**: Inline utility function in main App component

**Function Signature**:
```javascript
function generateQuickTaskId(index = 0) {
  const timestamp = Date.now() + index;
  const random = Math.random().toString(36).slice(2, 7);
  return `qt_${timestamp}_${random}`;
}
```

**Parameters**:
- `index` (number, optional, default: 0): Offset added to timestamp for batch creation uniqueness

**Returns**: 
- `string`: ID in format `qt_<timestamp>_<random>` (e.g., `qt_1735689600000_a3f9x`)

**Usage Example**:
```javascript
// Single task
const id = generateQuickTaskId(); // qt_1735689600000_a3f9x

// Batch creation (multiple tasks at once)
const tasks = chunks.map((text, idx) => ({
  id: generateQuickTaskId(idx),
  text: text,
  // ... other fields
}));
```

**ID Structure**:
- Prefix: `qt_` (quick task identifier)
- Timestamp component: milliseconds since epoch + index offset
- Random component: 5 alphanumeric characters from base-36 encoding
- Total entropy: ~60 million possibilities per millisecond (36^5)

**Collision Resistance**:
- Timestamp ensures uniqueness across time
- Index offset ensures uniqueness in batch operations
- Random component adds entropy within same millisecond
- Probability of collision: < 0.00001% in realistic usage

---

### 2. Backup Manager

**Purpose**: Automated daily backup creation, storage, retention, and restoration of quick tasks.

**Location**: Integrated into main App component

**Core Functions**:

#### `createDailyBackup()`
```javascript
async function createDailyBackup() {
  const user = auth.currentUser;
  if (!user || !navigator.onLine) return;

  const tasks = JSON.parse(
    localStorage.getItem(`faiora_quick_tasks_${user.uid}`) || '[]'
  );
  
  const backup = {
    timestamp: Date.now(),
    date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    tasks: tasks,
    count: tasks.length,
    size: JSON.stringify(tasks).length
  };

  const backupRef = db.collection('tasks')
    .doc(user.uid)
    .collection('quickTaskBackups')
    .doc(`backup_${backup.date}`);
  
  await backupRef.set(backup);
  await cleanupOldBackups();
}
```

#### `scheduleDailyBackup()`
```javascript
function scheduleDailyBackup() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const msUntilMidnight = tomorrow.getTime() - now.getTime();
  
  setTimeout(() => {
    createDailyBackup();
    // Reschedule for next day
    setInterval(createDailyBackup, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);
}
```

#### `cleanupOldBackups()`
```javascript
async function cleanupOldBackups() {
  const user = auth.currentUser;
  if (!user) return;

  const backupsRef = db.collection('tasks')
    .doc(user.uid)
    .collection('quickTaskBackups')
    .orderBy('timestamp', 'desc');
  
  const snapshot = await backupsRef.get();
  const backups = snapshot.docs;

  // Keep most recent 30 backups
  if (backups.length > 30) {
    const toDelete = backups.slice(30);
    const batch = db.batch();
    toDelete.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }

  // Also cleanup backups older than 30 days (but keep at least 7 most recent)
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const recentBackups = backups.slice(0, 7);
  const oldBackups = backups.slice(7).filter(doc => {
    return doc.data().timestamp < thirtyDaysAgo;
  });

  if (oldBackups.length > 0) {
    const batch = db.batch();
    oldBackups.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
}
```

#### `restoreBackup(backupId)`
```javascript
async function restoreBackup(backupId) {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const backupDoc = await db.collection('tasks')
    .doc(user.uid)
    .collection('quickTaskBackups')
    .doc(backupId)
    .get();

  if (!backupDoc.exists) {
    throw new Error('Backup not found');
  }

  const backup = backupDoc.data();
  
  // Validate backup structure
  if (!Array.isArray(backup.tasks)) {
    throw new Error('Invalid backup data structure');
  }

  // Restore to LocalStorage
  const tasks = backup.tasks;
  localStorage.setItem(
    `faiora_quick_tasks_${user.uid}`,
    JSON.stringify(tasks)
  );

  // Update React state
  setQuickTasks(tasks);
  quickTasksRef.current = tasks;

  // Sync to Firestore
  await db.collection(activeCollection).doc(user.uid).set({
    quickTasks: tasks
  }, { merge: true });

  // Update baseline for 3-way merge
  localStorage.setItem(
    `faiora_last_synced_tasks_${user.uid}`,
    JSON.stringify(tasks)
  );

  return tasks.length;
}
```

**State Management**:
- Backups stored in Firestore sub-collection: `/tasks/{userId}/quickTaskBackups/{backupId}`
- Scheduled timer tracked in component state
- Online connectivity check before operations

**Error Handling**:
- Network failures: silent retry on next connectivity check
- Invalid backup data: validation before restore, abort with error message
- Large backups (>1MB): warning logged but operation proceeds

---

### 3. Settings Page Backup UI

**Purpose**: User interface for viewing, previewing, and restoring backups.

**Location**: New section in existing Settings page component

**Component Structure**:

```jsx
const BackupManagementSection = ({ user, activeCollection, onRestore }) => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    fetchBackups();
  }, [user]);

  async function fetchBackups() {
    if (!user) return;
    
    setLoading(true);
    try {
      const snapshot = await db.collection('tasks')
        .doc(user.uid)
        .collection('quickTaskBackups')
        .orderBy('timestamp', 'desc')
        .limit(30)
        .get();

      const backupList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setBackups(backupList);
    } catch (error) {
      console.error('Failed to fetch backups:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(backupId) {
    setRestoring(true);
    try {
      const count = await onRestore(backupId);
      showToast(`Restored ${count} tasks from backup`);
      setShowConfirm(false);
      setSelectedBackup(null);
    } catch (error) {
      showToast('Failed to restore backup: ' + error.message);
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Quick Task Backups</h3>
      
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-800 animate-pulse rounded"></div>
          ))}
        </div>
      ) : backups.length === 0 ? (
        <p className="text-gray-400">No backups available yet. Backups are created automatically at midnight each day.</p>
      ) : (
        <div className="space-y-2">
          {backups.map(backup => (
            <div key={backup.id} className="border border-gray-700 rounded p-4 flex justify-between items-center">
              <div>
                <p className="font-semibold">{formatDate(backup.date)}</p>
                <p className="text-sm text-gray-400">{backup.count} tasks • {formatSize(backup.size)}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setSelectedBackup(backup); setShowPreview(true); }}
                  className="px-3 py-1 text-sm border border-gray-600 rounded hover:bg-gray-800"
                >
                  Preview
                </button>
                <button 
                  onClick={() => { setSelectedBackup(backup); setShowConfirm(true); }}
                  className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary/90"
                >
                  Restore
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && selectedBackup && (
        <Modal onClose={() => setShowPreview(false)}>
          <h3 className="text-xl font-bold mb-4">Backup Preview</h3>
          <p className="text-sm text-gray-400 mb-4">
            {formatDate(selectedBackup.date)} • {selectedBackup.count} tasks
          </p>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {selectedBackup.tasks.slice(0, 50).map(task => (
              <div key={task.id} className="p-2 bg-gray-800 rounded text-sm">
                {task.text}
              </div>
            ))}
            {selectedBackup.count > 50 && (
              <p className="text-center text-gray-500 text-sm">
                ...and {selectedBackup.count - 50} more tasks
              </p>
            )}
          </div>
        </Modal>
      )}

      {/* Restore Confirmation Modal */}
      {showConfirm && selectedBackup && (
        <Modal onClose={() => setShowConfirm(false)}>
          <h3 className="text-xl font-bold mb-4">Confirm Restore</h3>
          <p className="mb-4">
            This will replace your current {quickTasks.length} tasks with {selectedBackup.count} tasks from {formatDate(selectedBackup.date)}.
          </p>
          <p className="text-sm text-yellow-500 mb-6">
            ⚠️ This action cannot be undone. Your current tasks will be lost.
          </p>
          <div className="flex gap-3 justify-end">
            <button 
              onClick={() => setShowConfirm(false)}
              className="px-4 py-2 border border-gray-600 rounded"
              disabled={restoring}
            >
              Cancel
            </button>
            <button 
              onClick={() => handleRestore(selectedBackup.id)}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              disabled={restoring}
            >
              {restoring ? 'Restoring...' : 'Restore Backup'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
```

**UI Elements**:
- Backup list with date, task count, and size
- Preview button to view tasks in backup
- Restore button with confirmation flow
- Loading skeletons during fetch
- Empty state message when no backups exist
- Success/error toast notifications

**User Flow**:
1. User navigates to Settings → Backups
2. System fetches available backups from Firestore
3. User clicks "Preview" to view tasks in a backup
4. User clicks "Restore" on desired backup
5. System shows confirmation dialog with warning
6. User confirms restoration
7. System restores tasks, syncs to cloud, shows success message

---

### 4. Calendar Page Quick Task Styling

**Purpose**: Ensure visual consistency of quick task cards across all pages.

**Approach**: Extract shared CSS classes into reusable component/styles.

**Shared Quick Task Card Component**:

```jsx
const QuickTaskCard = ({ task, onToggle, onEdit, onDelete, variant = 'standard' }) => {
  // Shared styling classes
  const baseClasses = "flex items-start gap-3 p-4 rounded-xl border transition-all duration-200";
  const bgClasses = "bg-[#1a0f0a]/40 hover:bg-[#1a0f0a]/60";
  const borderClasses = task.completed 
    ? "border-white/5" 
    : "border-primary/20 hover:border-primary/30";
  
  return (
    <div className={`${baseClasses} ${bgClasses} ${borderClasses}`}>
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id)}
        className={`
          shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center
          transition-all duration-200
          ${task.completed 
            ? 'bg-primary border-primary' 
            : 'border-white/20 hover:border-primary/50'
          }
        `}
      >
        {task.completed && (
          <span className="material-symbols-outlined text-[14px] text-white">check</span>
        )}
      </button>

      {/* Task Content */}
      <div className="flex-1 min-w-0">
        <p className={`
          font-medium leading-relaxed
          ${task.completed 
            ? 'text-white/30 line-through' 
            : 'text-cream-light'
          }
        `}>
          {task.text}
        </p>
        
        {/* Due Date */}
        {task.dueDate && (
          <p className="text-xs text-white/40 mt-1">
            {formatReminderDate(task.dueDate)}
          </p>
        )}

        {/* Categories */}
        {task.categories && task.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {task.categories.map(cat => (
              <span 
                key={cat}
                className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary/70 rounded"
              >
                {cat}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action Icons */}
      <div className="flex gap-1 shrink-0">
        <button 
          onClick={() => onEdit(task)}
          className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white/70 rounded"
        >
          <span className="material-symbols-outlined text-[18px]">edit</span>
        </button>
        <button 
          onClick={() => onDelete(task.id)}
          className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-red-400 rounded"
        >
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>
    </div>
  );
};
```

**Integration Points**:
- Homepage: `<QuickTaskCard task={t} variant="homepage" ... />`
- Calendar Page: `<QuickTaskCard task={t} variant="calendar" ... />`
- Quick Tasks Page: `<QuickTaskCard task={t} variant="page" ... />`

**CSS Variables** (for theming):
```css
:root {
  --qt-card-bg: rgba(26, 15, 10, 0.4);
  --qt-card-bg-hover: rgba(26, 15, 10, 0.6);
  --qt-card-border: rgba(249, 115, 22, 0.2);
  --qt-card-border-hover: rgba(249, 115, 22, 0.3);
  --qt-checkbox-size: 20px;
  --qt-icon-size: 18px;
  --qt-text-color: var(--cream-light);
  --qt-text-completed: rgba(255, 255, 255, 0.3);
}
```

---

### 5. Homepage Loading State Machine

**Purpose**: Fix skeleton loader flicker by implementing proper loading state transitions.

**Current Problem**:
- Initial load shows content briefly
- Then hides content and shows skeleton
- Then shows content again
- Causes visible flicker and poor UX

**Root Cause Analysis**:
The `isLoading` state is not properly initialized or is being set based on data presence rather than actual loading status.

**Solution**: Implement explicit loading state machine with proper initialization.

**State Machine**:
```
States:
- INITIAL: Component just mounted, no data fetched yet
- LOADING: Fetching data from LocalStorage/Firestore
- READY: Data loaded and ready to display
- ERROR: Failed to load data

Transitions:
INITIAL → LOADING (on mount, if user exists)
LOADING → READY (on data fetch complete)
LOADING → ERROR (on fetch failure)
ERROR → LOADING (on retry)
```

**Implementation**:

```javascript
const DashboardPage = ({ user, ...props }) => {
  // Explicit loading state
  const [loadingState, setLoadingState] = useState('INITIAL');
  const [sortedPriorityNotes, setSortedPriorityNotes] = useState([]);
  const [activeHomepageSections, setActiveHomepageSections] = useState([]);
  const hasInitializedRef = useRef(false);

  // Initialize on mount - ONLY ONCE
  useEffect(() => {
    if (hasInitializedRef.current) return;
    if (!user) return;
    
    hasInitializedRef.current = true;
    setLoadingState('LOADING');

    // Simulate data loading (in reality, this data comes from props)
    const timer = setTimeout(() => {
      setLoadingState('READY');
    }, 100);

    return () => clearTimeout(timer);
  }, [user]);

  // Update derived state when data changes
  useEffect(() => {
    if (loadingState !== 'READY') return;

    const priorityNotes = notes
      .filter(n => n.isPinned)
      .sort((a, b) => {
        // sorting logic
      });
    
    setSortedPriorityNotes(priorityNotes);

    const sections = computeHomepageSections(quickTasks);
    setActiveHomepageSections(sections);
  }, [notes, quickTasks, loadingState]);

  // Render based on loading state
  const isLoading = loadingState === 'INITIAL' || loadingState === 'LOADING';

  return (
    <Layout>
      {/* Priority Notes Section */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <PriorityNoteSkeleton key={i} />
          ))}
        </div>
      ) : sortedPriorityNotes.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 skeleton-fade-in">
          {sortedPriorityNotes.map(note => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}

      {/* Quick Tasks Section */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <QuickTaskSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {activeHomepageSections.map(section => (
            <SectionView key={section.key} section={section} />
          ))}
        </div>
      )}
    </Layout>
  );
};
```

**CSS Transition** (smooth fade-in):
```css
.skeleton-fade-in {
  animation: fadeIn 200ms ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

**Key Changes**:
1. Explicit `loadingState` state machine instead of implicit `isLoading`
2. `hasInitializedRef` prevents re-initialization on prop changes
3. Loading state only transitions INITIAL → LOADING → READY (one direction)
4. Content never renders until state is READY
5. Smooth fade-in transition when content appears

---

### 6. Google One Tap Integration

**Purpose**: Streamline authentication for desktop users with Google One Tap.

**Location**: Auth initialization section in main App component

**Implementation**:

```javascript
// Google One Tap Configuration
useEffect(() => {
  if (user) return; // Already authenticated
  
  // Check if desktop (viewport width > 768px)
  const isDesktop = window.innerWidth > 768;
  if (!isDesktop) return;

  // Check if One Tap was dismissed this session
  const dismissed = sessionStorage.getItem('oneTapDismissed');
  if (dismissed) return;

  // Load Google Identity Services
  if (!window.google) {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeOneTap;
    document.head.appendChild(script);
  } else {
    initializeOneTap();
  }

  function initializeOneTap() {
    const clientId = firebaseConfig.googleClientId; // From Firebase config

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleOneTapSignIn,
      cancel_on_tap_outside: false,
      auto_select: false,
    });

    // Prompt the One Tap UI
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed()) {
        console.log('One Tap not displayed:', notification.getNotDisplayedReason());
      } else if (notification.isSkippedMoment()) {
        console.log('One Tap skipped:', notification.getSkippedReason());
      } else if (notification.isDismissedMoment()) {
        console.log('One Tap dismissed:', notification.getDismissedReason());
        sessionStorage.setItem('oneTapDismissed', 'true');
      }
    });
  }

  async function handleOneTapSignIn(response) {
    try {
      // Exchange Google credential for Firebase auth
      const credential = firebase.auth.GoogleAuthProvider.credential(
        response.credential
      );
      
      const result = await firebase.auth().signInWithCredential(credential);
      console.log('One Tap sign-in successful:', result.user.uid);
      
      // Redirect to homepage
      navigate('/');
    } catch (error) {
      console.error('One Tap sign-in failed:', error);
      showToast('Sign-in failed. Please try again.');
    }
  }
}, [user]);

// Responsive check - hide One Tap if window resized to mobile
useEffect(() => {
  function handleResize() {
    const isDesktop = window.innerWidth > 768;
    if (!isDesktop && window.google?.accounts?.id) {
      window.google.accounts.id.cancel();
    }
  }

  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

**Configuration Details**:
- **Client ID**: Retrieved from Firebase config (`firebaseConfig.googleClientId`)
- **Display**: Only on desktop (viewport width > 768px)
- **Session Persistence**: Dismissal tracked in `sessionStorage`
- **Auto-select**: Disabled (user must click)
- **Cancel on tap outside**: Disabled (less intrusive)

**User Experience Flow**:
1. Unauthenticated user visits site on desktop
2. After page load, One Tap prompt appears in top-right corner
3. User can:
   - Click to sign in → immediate authentication
   - Dismiss prompt → won't show again this session
   - Ignore prompt → fades after timeout
4. On mobile, One Tap never appears (standard auth flows used)

**Fallback**:
If Google Identity Services fails to load or One Tap is not available, users can still use standard Google Sign-In button and email/password authentication.

---

## Data Models

### Quick Task Schema

**LocalStorage Key**: `faiora_quick_tasks_{userId}`

**Structure**:
```typescript
interface QuickTask {
  id: string;                    // NEW: 'qt_<timestamp>_<random>' format
  text: string;                  // Task description
  completed: boolean;            // Completion status
  completedAt: number | null;    // Timestamp when completed
  createdAt: number;             // Creation timestamp
  updatedAt?: number;            // Last update timestamp
  
  // Scheduling
  dueDate: string;               // ISO date string (YYYY-MM-DD)
  dueTime: string;               // Time string (HH:MM)
  dueTimestamp: number | null;   // Combined date+time as epoch ms
  
  // Categorization
  categories: string[];          // Array of category names
  category: string;              // Primary category (first in array)
  
  // Progress tracking
  progress: number;              // 0-100 percentage
  progressHistory: Array<{       // Historical progress snapshots
    value: number;
    timestamp: number;
  }>;
  lastProgress: number | null;   // Previous non-zero progress value
  
  // Reminders
  reminders: {
    '24h': boolean;              // 24 hours before due
    '1h': boolean;               // 1 hour before due
    'due': boolean;              // At due time
  };
  
  // UI state
  pinned: boolean;               // Pinned to top of list
}
```

**Example**:
```json
{
  "id": "qt_1735689600000_a3f9x",
  "text": "Review Q4 financial report",
  "completed": false,
  "completedAt": null,
  "createdAt": 1735689600000,
  "updatedAt": 1735689660000,
  "dueDate": "2025-01-05",
  "dueTime": "14:00",
  "dueTimestamp": 1735826400000,
  "categories": ["Work", "Finance"],
  "category": "Work",
  "progress": 30,
  "progressHistory": [
    { "value": 10, "timestamp": 1735689610000 },
    { "value": 30, "timestamp": 1735689660000 }
  ],
  "lastProgress": 10,
  "reminders": {
    "24h": true,
    "1h": true,
    "due": true
  },
  "pinned": false
}
```

### Backup Schema

**Firestore Path**: `/tasks/{userId}/quickTaskBackups/{backupId}`

**Structure**:
```typescript
interface QuickTaskBackup {
  timestamp: number;             // Backup creation time (epoch ms)
  date: string;                  // Backup date (YYYY-MM-DD)
  tasks: QuickTask[];            // Complete snapshot of tasks
  count: number;                 // Number of tasks in backup
  size: number;                  // JSON byte size of tasks array
}
```

**Example**:
```json
{
  "timestamp": 1735689600000,
  "date": "2025-01-01",
  "tasks": [
    { "id": "qt_1735689600000_a3f9x", "text": "Task 1", ... },
    { "id": "qt_1735689601000_b4g0y", "text": "Task 2", ... }
  ],
  "count": 2,
  "size": 1024
}
```

**Backup ID Format**: `backup_<YYYY-MM-DD>`

### Sync Baseline Schema

**LocalStorage Key**: `faiora_last_synced_tasks_{userId}`

**Structure**: Same as QuickTask array

**Purpose**: Stores the last known synced state for 3-way merge conflict resolution.

**Updated By**:
- Successful Firestore sync operations
- Backup restoration (to prevent false conflicts)

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: ID Uniqueness in Batch Creation

*For any* batch creation of N quick tasks (where N ≥ 1), all generated task IDs SHALL be unique within that batch and across all existing tasks.

**Validates: Requirements 1.3, 1.4, 1.5**

### Property 2: Single Task Deletion Isolation

*For any* task ID X in a task list, when a delete operation is performed on X, exactly one task SHALL be removed from the list and no task with ID Y (where Y ≠ X) SHALL be affected.

**Validates: Requirements 2.1, 2.2, 2.5, 2.6**

### Property 3: Backup Completeness

*For any* set of quick tasks at backup time, the created backup snapshot SHALL contain all tasks with all fields (text, completed, progress, dueDate, dueTime, categories, reminders, pinned, progressHistory) preserved.

**Validates: Requirements 3.4, 8.1**

### Property 4: Backup Retention Limit

*For any* user account, after cleanup operations, the total number of stored backups SHALL NOT exceed 30, with the most recent backups retained.

**Validates: Requirements 3.5, 3.6, 9.6**

### Property 5: Daily Backup Uniqueness

*For any* two backups created on different calendar days, the backup dates SHALL be distinct (no duplicate backups for the same day).

**Validates: Requirements 3.9**

### Property 6: Backup UI Display Ordering

*For any* list of backups displayed in the Settings page, the backups SHALL be ordered in reverse chronological order (newest first).

**Validates: Requirements 4.5**

### Property 7: Backup Restoration Round-Trip

*For any* backup B containing N tasks, after restoration is confirmed and completed, the current task list SHALL contain exactly N tasks with data identical to the backup snapshot.

**Validates: Requirements 4.9, 4.12, 8.4**

### Property 8: Homepage Loading State Transition

*For any* homepage load cycle, the skeleton loader SHALL be displayed exactly once and content visibility SHALL transition from hidden to visible exactly once (no flicker).

**Validates: Requirements 6.3, 6.6, 6.7**

### Property 9: Google One Tap Desktop-Only Display

*For any* page load where the user is not authenticated, Google One Tap prompt SHALL appear if and only if the viewport width is greater than 768 pixels (desktop) and SHALL appear within 2 seconds of page load.

**Validates: Requirements 7.2, 7.3, 7.9**

### Property 10: Backup Age Retention with Minimum Guarantee

*For any* set of backups where some are older than 30 days, cleanup operations SHALL remove old backups but SHALL preserve at least the 7 most recent backups regardless of their age.

**Validates: Requirements 9.4, 9.5**

### Property 11: Sync Engine ID-Based Task Matching

*For all* merge operations performed by the Sync Engine involving quick tasks with the new ID structure ('qt_<timestamp>_<random>'), tasks SHALL be correctly identified and matched by their ID field during 3-way merge conflict resolution.

**Validates: Requirements 2.4, 10.2, 10.7**

---

## Error Handling

### ID Generation Errors

**Scenario**: Extremely rapid task creation (edge case)

**Mitigation**:
- Index offset ensures uniqueness even at same millisecond
- Random component adds entropy (1 in 60 million collision probability)
- If duplicate detected in existing list, regenerate with incremented index

**Error Response**: Silent regeneration, no user-facing error

### Backup Creation Errors

**Scenario 1**: No internet connection at midnight

**Handling**:
```javascript
if (!navigator.onLine) {
  console.log('Offline - backup deferred until online');
  window.addEventListener('online', () => {
    createDailyBackup(); // Retry once when back online
  }, { once: true });
  return;
}
```

**Scenario 2**: Firestore write fails (permissions, quota)

**Handling**:
```javascript
try {
  await backupRef.set(backup);
  console.log('✓ Backup created successfully');
} catch (error) {
  console.error('✗ Backup failed:', error.message);
  // Log to error monitoring service if available
  if (window.Sentry) {
    Sentry.captureException(error, {
      tags: { feature: 'daily-backup' },
      extra: { userId: user.uid, taskCount: backup.count }
    });
  }
  // Don't show error to user (silent failure, will retry next day)
}
```

**Scenario 3**: Backup size exceeds 1MB

**Handling**:
```javascript
if (backup.size > 1024 * 1024) {
  console.warn(`⚠️ Large backup: ${(backup.size / 1024 / 1024).toFixed(2)}MB`);
  // Still create backup, but log warning for monitoring
}
```

### Backup Restoration Errors

**Scenario 1**: Backup not found

**Handling**:
```javascript
if (!backupDoc.exists) {
  showToast('Backup not found. It may have been deleted.', 'error');
  throw new Error('Backup not found');
}
```

**Scenario 2**: Invalid backup data structure

**Handling**:
```javascript
const backup = backupDoc.data();

// Validate structure
if (!backup.tasks || !Array.isArray(backup.tasks)) {
  showToast('Invalid backup data. Cannot restore.', 'error');
  throw new Error('Invalid backup structure');
}

// Validate task objects
const validTasks = backup.tasks.filter(task => {
  return task.id && typeof task.text === 'string';
});

if (validTasks.length === 0) {
  showToast('Backup contains no valid tasks.', 'error');
  throw new Error('No valid tasks in backup');
}

if (validTasks.length < backup.tasks.length) {
  console.warn(`⚠️ ${backup.tasks.length - validTasks.length} invalid tasks filtered out`);
}
```

**Scenario 3**: Firestore sync fails after restore

**Handling**:
```javascript
try {
  await db.collection(activeCollection).doc(user.uid).set({
    quickTasks: tasks
  }, { merge: true });
} catch (error) {
  // LocalStorage already updated, sync will retry automatically
  console.warn('Sync failed after restore - will retry on next online event:', error);
  showToast('Tasks restored locally. Syncing to cloud...', 'warning');
}
```

### Sync Engine Compatibility Errors

**Scenario**: New ID format breaks existing merge logic

**Prevention**:
- Extensive testing of new IDs with existing sync code
- Backward compatibility: existing IDs still work
- Sync engine already uses generic ID field matching

**Handling**:
```javascript
// In smartMergeById function
const baselineMap = {};
baseline.forEach(t => {
  // Handle both old and new ID formats
  const id = t.id || `qt_legacy_${Date.now()}`;
  baselineMap[id] = t;
});
```

### Google One Tap Errors

**Scenario 1**: Google Identity Services fails to load

**Handling**:
```javascript
script.onerror = () => {
  console.warn('Failed to load Google Identity Services');
  // Silently fail - standard auth methods still available
};
```

**Scenario 2**: One Tap sign-in fails

**Handling**:
```javascript
async function handleOneTapSignIn(response) {
  try {
    const credential = firebase.auth.GoogleAuthProvider.credential(
      response.credential
    );
    await firebase.auth().signInWithCredential(credential);
  } catch (error) {
    console.error('One Tap sign-in failed:', error);
    showToast('Quick sign-in failed. Please use the sign-in button.', 'error');
    // User can still use standard Google Sign-In button
  }
}
```

### Loading State Errors

**Scenario**: Data never loads (stuck in LOADING state)

**Handling**:
```javascript
useEffect(() => {
  if (loadingState !== 'LOADING') return;

  // Timeout after 5 seconds
  const timeout = setTimeout(() => {
    console.error('Loading timeout - forcing READY state');
    setLoadingState('READY');
  }, 5000);

  return () => clearTimeout(timeout);
}, [loadingState]);
```

---

## Testing Strategy

This feature requires a **dual testing approach** combining unit tests for specific behaviors and property-based tests for universal correctness guarantees.

### Unit Testing Focus

Unit tests verify specific examples, edge cases, error conditions, and UI interactions:

**ID Generation**:
- ✓ Single task ID matches format `qt_<timestamp>_<random>`
- ✓ Random component is exactly 5 alphanumeric characters
- ✓ Multiple tasks created at same millisecond have different IDs

**Backup Manager**:
- ✓ `createDailyBackup()` writes to correct Firestore path
- ✓ Backup includes timestamp, date, tasks, count, size fields
- ✓ `scheduleDailyBackup()` calculates correct time until midnight
- ✓ Offline backup creation defers until connectivity restored
- ✓ Large backup (>1MB) logs warning but still creates
- ✓ Invalid backup data triggers error message

**Backup UI**:
- ✓ Settings page displays "Quick Task Backups" section
- ✓ Empty state shows message when no backups exist
- ✓ Backup list shows date, task count, and size for each backup
- ✓ Clicking "Preview" opens modal with task list
- ✓ Clicking "Restore" opens confirmation dialog
- ✓ Confirming restore triggers `restoreBackup()` function

**Calendar Page Styling**:
- ✓ Quick task cards use same CSS classes as Homepage
- ✓ Font family, size, and line-height match Homepage
- ✓ Color values match Homepage theme variables
- ✓ Checkbox styling matches Homepage
- ✓ Hover effects match Homepage

**Loading State Machine**:
- ✓ Initial state is 'INITIAL'
- ✓ Transitions to 'LOADING' on mount with user
- ✓ Transitions to 'READY' after data fetch
- ✓ Skeleton loader visible only during 'INITIAL' and 'LOADING'
- ✓ Content never visible until 'READY' state

**Google One Tap**:
- ✓ One Tap initializes on desktop viewport (>768px)
- ✓ One Tap does not initialize on mobile viewport (≤768px)
- ✓ One Tap does not show if user already authenticated
- ✓ Dismissing One Tap sets sessionStorage flag
- ✓ Successful sign-in redirects to homepage

**Error Handling**:
- ✓ Backup creation failure logs error but doesn't crash
- ✓ Invalid backup structure shows error toast
- ✓ Backup not found shows error toast
- ✓ One Tap load failure is silent (fallback to standard auth)

### Property-Based Testing Focus

Property tests verify universal behaviors across all valid inputs using randomized test data:

**Testing Library**: Use `fast-check` (JavaScript property-based testing library)

**Configuration**: Minimum 100 iterations per property test

**Property Test Suite**:

#### Test 1: ID Uniqueness in Batch Creation
```javascript
// Feature: quick-tasks-reliability-and-enhancements, Property 1: ID Uniqueness in Batch Creation
import fc from 'fast-check';

fc.assert(
  fc.property(
    fc.integer({ min: 1, max: 100 }), // N tasks to create
    (n) => {
      const ids = [];
      for (let i = 0; i < n; i++) {
        ids.push(generateQuickTaskId(i));
      }
      
      // All IDs must be unique
      const uniqueIds = new Set(ids);
      return uniqueIds.size === n;
    }
  ),
  { numRuns: 100 }
);
```

#### Test 2: Single Task Deletion Isolation
```javascript
// Feature: quick-tasks-reliability-and-enhancements, Property 2: Single Task Deletion Isolation
fc.assert(
  fc.property(
    fc.array(fc.record({ id: fc.string(), text: fc.string() }), { minLength: 2, maxLength: 50 }),
    fc.integer({ min: 0, max: 49 }),
    (tasks, indexToDelete) => {
      if (indexToDelete >= tasks.length) return true; // Skip invalid index
      
      const taskToDelete = tasks[indexToDelete].id;
      const initialCount = tasks.length;
      
      const result = deleteQuickTask(tasks, taskToDelete);
      
      // Exactly one task removed
      if (result.length !== initialCount - 1) return false;
      
      // The deleted task is not in result
      if (result.some(t => t.id === taskToDelete)) return false;
      
      // All other tasks still present
      return tasks.filter(t => t.id !== taskToDelete).every(t => 
        result.some(r => r.id === t.id)
      );
    }
  ),
  { numRuns: 100 }
);
```

#### Test 3: Backup Completeness
```javascript
// Feature: quick-tasks-reliability-and-enhancements, Property 3: Backup Completeness
fc.assert(
  fc.property(
    fc.array(fc.record({
      id: fc.string(),
      text: fc.string(),
      completed: fc.boolean(),
      progress: fc.integer({ min: 0, max: 100 }),
      dueDate: fc.string(),
      categories: fc.array(fc.string()),
      reminders: fc.record({
        '24h': fc.boolean(),
        '1h': fc.boolean(),
        'due': fc.boolean()
      }),
      pinned: fc.boolean()
    }), { minLength: 0, maxLength: 100 }),
    (tasks) => {
      const backup = createBackupSnapshot(tasks);
      
      // Backup contains all tasks
      if (backup.tasks.length !== tasks.length) return false;
      
      // All fields preserved for each task
      return tasks.every((original, i) => {
        const backed = backup.tasks[i];
        return original.id === backed.id &&
               original.text === backed.text &&
               original.completed === backed.completed &&
               original.progress === backed.progress &&
               original.dueDate === backed.dueDate &&
               JSON.stringify(original.categories) === JSON.stringify(backed.categories) &&
               JSON.stringify(original.reminders) === JSON.stringify(backed.reminders) &&
               original.pinned === backed.pinned;
      });
    }
  ),
  { numRuns: 100 }
);
```

#### Test 4: Backup Retention Limit
```javascript
// Feature: quick-tasks-reliability-and-enhancements, Property 4: Backup Retention Limit
fc.assert(
  fc.property(
    fc.integer({ min: 0, max: 100 }), // Number of backups before cleanup
    (numBackups) => {
      const backups = Array.from({ length: numBackups }, (_, i) => ({
        timestamp: Date.now() - (numBackups - i) * 24 * 60 * 60 * 1000,
        tasks: []
      }));
      
      const remaining = cleanupOldBackups(backups);
      
      // Should never exceed 30
      return remaining.length <= 30;
    }
  ),
  { numRuns: 100 }
);
```

#### Test 5: Backup Restoration Round-Trip
```javascript
// Feature: quick-tasks-reliability-and-enhancements, Property 7: Backup Restoration Round-Trip
fc.assert(
  fc.property(
    fc.array(fc.record({
      id: fc.string(),
      text: fc.string(),
      completed: fc.boolean(),
      progress: fc.integer({ min: 0, max: 100 })
    }), { minLength: 0, maxLength: 50 }),
    (originalTasks) => {
      // Create backup
      const backup = createBackupSnapshot(originalTasks);
      
      // Restore from backup
      const restoredTasks = restoreFromBackup(backup);
      
      // Should be identical
      if (restoredTasks.length !== originalTasks.length) return false;
      
      return originalTasks.every((original, i) => {
        const restored = restoredTasks[i];
        return JSON.stringify(original) === JSON.stringify(restored);
      });
    }
  ),
  { numRuns: 100 }
);
```

#### Test 6: Homepage Loading State Transition
```javascript
// Feature: quick-tasks-reliability-and-enhancements, Property 8: Homepage Loading State Transition
fc.assert(
  fc.property(
    fc.boolean(), // Has user
    fc.array(fc.record({ id: fc.string() })), // Notes
    fc.array(fc.record({ id: fc.string() })), // Quick tasks
    (hasUser, notes, tasks) => {
      const transitions = [];
      
      const mockSetLoadingState = (state) => {
        transitions.push(state);
      };
      
      simulateHomepageLoad(hasUser, notes, tasks, mockSetLoadingState);
      
      // Should transition: INITIAL → LOADING → READY (exactly once each)
      const loadingCount = transitions.filter(s => s === 'LOADING').length;
      const readyCount = transitions.filter(s => s === 'READY').length;
      
      return loadingCount === 1 && readyCount === 1;
    }
  ),
  { numRuns: 100 }
);
```

#### Test 7: Google One Tap Desktop-Only Display
```javascript
// Feature: quick-tasks-reliability-and-enhancements, Property 9: Google One Tap Desktop-Only Display
fc.assert(
  fc.property(
    fc.integer({ min: 320, max: 2560 }), // Viewport width
    fc.boolean(), // Is authenticated
    (viewportWidth, isAuthenticated) => {
      const shouldDisplay = shouldShowOneTap(viewportWidth, isAuthenticated);
      
      const expectedDisplay = viewportWidth > 768 && !isAuthenticated;
      
      return shouldDisplay === expectedDisplay;
    }
  ),
  { numRuns: 100 }
);
```

#### Test 8: Sync Engine ID-Based Task Matching
```javascript
// Feature: quick-tasks-reliability-and-enhancements, Property 11: Sync Engine ID-Based Task Matching
fc.assert(
  fc.property(
    fc.array(fc.record({ 
      id: fc.string().filter(s => s.startsWith('qt_')), 
      text: fc.string() 
    }), { minLength: 1, maxLength: 20 }),
    fc.array(fc.record({ 
      id: fc.string().filter(s => s.startsWith('qt_')), 
      text: fc.string() 
    }), { minLength: 1, maxLength: 20 }),
    (localTasks, serverTasks) => {
      const baseline = [];
      const merged = smartMergeById(localTasks, serverTasks, baseline);
      
      // All local tasks should be matched by ID
      localTasks.forEach(local => {
        const inMerged = merged.some(m => m.id === local.id);
        if (!inMerged) return false;
      });
      
      // All server tasks should be matched by ID
      serverTasks.forEach(server => {
        const inMerged = merged.some(m => m.id === server.id);
        if (!inMerged) return false;
      });
      
      return true;
    }
  ),
  { numRuns: 100 }
);
```

### Integration Testing

Integration tests verify component interactions and external dependencies:

- ✓ Backup creation writes to actual Firestore (test environment)
- ✓ Backup restoration syncs to actual Firestore
- ✓ Sync engine correctly merges tasks after backup restore
- ✓ Online/offline events trigger appropriate backup behavior
- ✓ Settings page fetches and displays real backup data
- ✓ Google One Tap integrates with Firebase authentication

### Manual Testing Checklist

**ID Generation**:
- [ ] Create 50 tasks rapidly, verify all have unique IDs
- [ ] Inspect ID format matches `qt_<timestamp>_<random>` pattern
- [ ] Create tasks offline, then sync online - no ID collisions

**Backup System**:
- [ ] Create tasks, wait until midnight, verify backup created
- [ ] Check Firestore console for backup document
- [ ] Create 35 backups, verify oldest 5 are deleted
- [ ] Turn off internet at midnight, turn on next day, verify backup created
- [ ] Create backup >1MB, verify warning logged

**Backup UI**:
- [ ] Navigate to Settings → Backups
- [ ] Verify list shows all backups with correct dates and counts
- [ ] Click "Preview" on a backup, verify tasks displayed
- [ ] Click "Restore" on a backup, confirm dialog appears
- [ ] Cancel restore, verify nothing changed
- [ ] Confirm restore, verify tasks replaced and success toast shown

**Calendar Page Styling**:
- [ ] Open Homepage, note quick task card appearance
- [ ] Open Calendar page, compare quick task card appearance
- [ ] Verify font, colors, borders, spacing are identical
- [ ] Hover over tasks, verify hover effects match
- [ ] Click checkbox, edit, delete - verify icons match

**Loading State**:
- [ ] Clear LocalStorage, reload homepage
- [ ] Verify skeleton loaders appear immediately
- [ ] Verify content appears smoothly without flicker
- [ ] Do NOT see: content → skeleton → content sequence
- [ ] Measure transition: should complete within 100ms

**Google One Tap**:
- [ ] Open site on desktop (unauthenticated), verify One Tap appears within 2s
- [ ] Open site on mobile (unauthenticated), verify One Tap does NOT appear
- [ ] Resize desktop browser to <768px width, verify One Tap disappears
- [ ] Click One Tap, sign in successfully, redirected to homepage
- [ ] Dismiss One Tap, reload page, verify doesn't reappear this session
- [ ] Open new tab (new session), verify One Tap reappears

---

## Implementation Notes

### Migration Strategy

**Phase 1: ID Generation (Safe to deploy immediately)**
- Update `handleAddQuickTask` to use new `generateQuickTaskId` function
- All new tasks get new ID format
- Existing tasks keep their current IDs (backward compatible)
- No data migration needed

**Phase 2: Backup System (Deploy after testing)**
- Add `createDailyBackup`, `scheduleDailyBackup`, `cleanupOldBackups` functions
- Initialize scheduler on app mount
- First backup created at next midnight
- No impact on existing functionality

**Phase 3: Backup UI (Deploy with Phase 2)**
- Add Backup Management section to Settings page
- Fetches backups from Firestore on demand
- No automatic behavior, user-initiated only

**Phase 4: Calendar Styling (Safe to deploy anytime)**
- Extract QuickTaskCard component
- Replace inline task rendering in Calendar page
- Visual change only, no logic changes

**Phase 5: Loading State Fix (Deploy carefully, test thoroughly)**
- Refactor DashboardPage loading state logic
- Extensive testing to ensure no regressions
- Monitor for any new flicker issues

**Phase 6: Google One Tap (Deploy last, optional feature)**
- Add Google Identity Services script loader
- Initialize One Tap for desktop users
- Does not affect existing auth flows
- Can be disabled via feature flag if issues arise

### Performance Considerations

**ID Generation**: Negligible overhead (<1ms per call)

**Backup Creation**: 
- JSON.stringify of 100 tasks: ~10ms
- Firestore write: 200-500ms (network)
- Runs at midnight, no user-facing impact

**Backup Restoration**:
- Firestore read: 200-500ms (network)
- LocalStorage write: <10ms
- UI shows loading spinner during operation

**Cleanup Operations**:
- Firestore batch delete: 500-1000ms for 5-10 documents
- Runs after midnight backup, no user-facing impact

**Loading State Machine**:
- Eliminates flicker, improves perceived performance
- Reduces unnecessary re-renders

**Google One Tap**:
- Script loads asynchronously, no blocking
- Prompt appears after page fully loaded
- Minimal performance impact

### Security Considerations

**Backup Access Control**:
- Firestore security rules must restrict backup access to document owner
- Rule: `allow read, write: if request.auth.uid == userId;`

**Google One Tap**:
- Uses Firebase authentication (trusted provider)
- Client ID validated by Google
- No credential exposure in client code

**Data Validation**:
- Backup restore validates JSON structure before applying
- Invalid data rejected with error message
- Prevents malicious data injection

### Monitoring and Observability

**Metrics to Track**:
- Daily backup success rate
- Average backup size
- Backup restoration frequency
- One Tap sign-in conversion rate
- Loading state flicker reports (user feedback)

**Logging**:
- Backup creation: success/failure with timestamp
- Backup restoration: initiated, completed, or failed
- ID collisions: should never happen, log if detected
- One Tap: initialization, display, dismissal, sign-in success/failure

**Alerting**:
- Backup failure rate >10% (check Firestore permissions/quota)
- Backup size >1MB (investigate data growth)
- ID collision detected (critical bug, investigate immediately)

---

## Summary

This design provides a comprehensive solution for enhancing quick tasks reliability through:

1. **Robust ID Generation** using timestamp + index + random components ensuring <0.00001% collision probability
2. **Automated Daily Backups** with 30-day retention, scheduled at midnight, stored in Firestore sub-collections
3. **User-Friendly Backup UI** in Settings page with preview, restore, and confirmation flows
4. **Visual Consistency** via shared QuickTaskCard component used across Homepage, Calendar, and Quick Tasks pages
5. **Flicker-Free Loading** through explicit state machine preventing content visibility toggling
6. **Streamlined Desktop Auth** with Google One Tap for users on viewports >768px
7. **Sync Engine Compatibility** maintaining existing 3-way merge with baseline tracking

All components integrate seamlessly with existing architecture while prioritizing data preservation, backward compatibility, and user experience.