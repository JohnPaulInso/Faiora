# Graph Report - faiora  (2026-10-30)

## Corpus Check
- 169 files · ~425,533 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 37 file(s) not represented in the graph (top: .xml 19, (none) 4, .bat 3)

## Summary
- 1019 nodes · 1313 edges · 144 communities (44 shown, 100 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Core App & Task Handlers
- Faiora Main Bundle
- Android Alarm & Task Receivers
- Main Entry Constants & UI
- Firebase Cloud Functions & Admin
- Android Alarm Alert Service
- Capacitor & Package Config
- Core React Pages & Modals
- Android MainActivity & Bridge
- Alarm Swipe Ring View
- Font & Vendor Downloaders
- Syntax & Brace Checkers
- App Esbuild Compiler
- Admin Dashboard Config
- Android Unit & UI Tests
- Web App Manifest
- Nav Icon Extractor
- APK Logo & Icon Generator
- Bug 1: Notepad/Category views - Can'
- 1. Increased Fire Sparks Particles
- 1.  Bottom Navigation Hover Effect
- Alternative: Manual Photoshop/GIMP M
- debug_braces.js
- 1. Google One Tap Widget (Desktop On
- 1.  Robust Quick Task ID Generation
- 1. Speech-to-Text "Google Microphone
- 1. Google One Tap (Desktop Authentic
- 1. ID Generator Module
- Requirements Document
- Implementation Plan: Quick Tasks Rel
- 1. Added Large Icon Support
- 1. Added Large Icon Support
- 1. Google One Tap Widget (Top-Right 
- Quick Start: Fix Notification Icon S
- generate_adaptive_icons.js
- update_branding_icons.js
- Code Changes
- 1. Test Locally
- Visual Guide: How the New Sync Works
- 1. Animation Particle Functions (Lin
- Copy the example file
- assets_vendor_babel_min
- optimize_icons.js
- repair.js
- 1. Speech-to-Text Google Microphone 
- 1. Bottom Navigation Tap Effect
- sw.js
- CLOUD_ADMIN_API
- Asset: Applogo
- Asset: Ic Notification Logo
- Asset: Ic Stat Faiora
- Asset: Splash
- Asset: Splash
- Asset: Splash
- Asset: Splash
- Asset: Splash
- Asset: Splash
- Asset: Splash
- Asset: Splash
- Asset: Splash
- Asset: Splash
- Asset: Splash
- Asset: Splash
- Asset: Splash
- Asset: Splash
- Asset: Splash
- Asset: Splash
- Asset: Splash
- Asset: Splash
- Asset: Splash
- Asset: Splash
- Asset: Splash
- Asset: Splash
- Asset: Splash
- Asset: Splash
- Asset: Splash
- Asset: Splash
- Asset: Splash Icon
- Asset: Ic Launcher
- Asset: Ic Launcher Background
- Asset: Ic Launcher Foreground
- Asset: Ic Launcher Round
- Asset: Ic Notification Logo
- Asset: Ic Stat Faiora
- Asset: Ic Launcher
- Asset: Ic Launcher Background
- Asset: Ic Launcher Foreground
- Asset: Ic Launcher Round
- Asset: Ic Notification Logo
- Asset: Ic Stat Faiora
- Asset: Ic Launcher
- Asset: Ic Launcher Background
- Asset: Ic Launcher Foreground
- Asset: Ic Launcher Round
- Asset: Ic Notification Logo
- Asset: Ic Stat Faiora
- Asset: Ic Launcher
- Asset: Ic Launcher Background
- Asset: Ic Launcher Foreground
- Asset: Ic Launcher Round
- Asset: Ic Notification Logo
- Asset: Ic Stat Faiora
- Asset: Ic Launcher
- Asset: Ic Launcher Background
- Asset: Ic Launcher Foreground
- Asset: Ic Launcher Round
- Asset: Ic Notification Logo
- Asset: Ic Stat Faiora
- Asset: Ic Launcher
- Asset: Ic Launcher Background
- Asset: Ic Launcher Foreground
- Asset: Ic Launcher Round
- Asset: Ic Notification Logo
- Asset: Ic Stat Faiora
- Asset: Applogo
- Asset: Applogo Without Bg
- Asset: Favicon 192
- Asset: Favicon
- Asset: Fire Wipe Spritesheet Desktop
- Asset: Fire Wipe Spritesheet Mobile
- googled6ec6ba0775bed83.html Applicat
- Asset: Logo
- modal example.html Application Entry
- privacy.html Application Entry
- quick-tasks.html Application Entry
- recovery_tool.html Application Entry
- sample css html.html Application Ent
- terms.html Application Entry
- test_sync_reliability.html Applicati
- ui example.html Application Entry

## God Nodes (most connected - your core abstractions)
1. `App` - 150 edges
2. `index.html Application Entry` - 68 edges
3. `NativeAlarmScheduler` - 29 edges
4. `backup.html Application Entry` - 26 edges
5. `App()` - 24 edges
6. `AlarmRecord` - 20 edges
7. `AlarmSwipeRingView` - 16 edges
8. `AlarmAlertPlayer` - 15 edges
9. `adminApi()` - 15 edges
10. `Layout()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `NativeAlarmScheduler` --references--> `AlarmAlertPlayer`  [EXTRACTED]
  android/app/src/main/java/com/faiora/app/NativeAlarmScheduler.java → android/app/src/main/java/com/faiora/app/AlarmAlertPlayer.java
- `AlarmOverlayService` --references--> `AlarmAlertPlayer`  [EXTRACTED]
  android/app/src/main/java/com/faiora/app/AlarmOverlayService.java → android/app/src/main/java/com/faiora/app/AlarmAlertPlayer.java
- `AlarmRingActivity` --references--> `AlarmAlertPlayer`  [EXTRACTED]
  android/app/src/main/java/com/faiora/app/AlarmRingActivity.java → android/app/src/main/java/com/faiora/app/AlarmAlertPlayer.java
- `NativeAlarmBridge` --references--> `MainActivity`  [EXTRACTED]
  android/app/src/main/java/com/faiora/app/NativeAlarmBridge.java → android/app/src/main/java/com/faiora/app/MainActivity.java

## Import Cycles
- None detected.

## Communities (144 total, 100 thin omitted)

### Community 0 - "Core App & Task Handlers"
Cohesion: 0.01
Nodes (150): App, consumeNativeBackgroundActions, ensureNativeChannels, ensureNativeListeners, ensureNativeNotificationsReady, getLaterTiming, handleAdd, handleAddAlarm (+142 more)

### Community 1 - "Faiora Main Bundle"
Cohesion: 0.07
Nodes (65): ALARM_AMPM, ALARM_HOURS, ALARM_MINUTES, AlarmDayCircle(), AlarmWheelColumn, App(), auth, buildQuickTaskStats() (+57 more)

### Community 2 - "Android Alarm & Task Receivers"
Cohesion: 0.08
Nodes (6): AlarmReceiver, AlarmStore, BootReceiver, AlarmRecord, NativeAlarmScheduler, TaskActionReceiver

### Community 3 - "Main Entry Constants & UI"
Cohesion: 0.03
Nodes (68): ALARM_AMPM, ALARM_CHANNEL_ID, ALARM_HOURS, ALARM_MINUTES, AlarmDayCircle, AlarmWheelColumn, AudioCtxClass, AUTO_TIMEOUT (+60 more)

### Community 4 - "Firebase Cloud Functions & Admin"
Cohesion: 0.06
Nodes (55): addFirestoreDirectoryUser(), admin, ADMIN_DATA_COLLECTIONS, ADMIN_DISCOVERY_COLLECTIONS, adminApi(), adminDeleteNote(), adminDeleteTask(), adminSaveNote() (+47 more)

### Community 5 - "Android Alarm Alert Service"
Cohesion: 0.06
Nodes (3): AlarmAlertPlayer, AlarmOverlayService, AlarmRingActivity

### Community 6 - "Capacitor & Package Config"
Cohesion: 0.06
Nodes (31): config, author, dependencies, @capacitor/android, @capacitor/app, @capacitor/assets, @capacitor/cli, @capacitor/core (+23 more)

### Community 7 - "Core React Pages & Modals"
Cohesion: 0.07
Nodes (27): App, CalendarPage, ClockPage, ConfirmationModal, DashboardPage, FaioraNotifications, Header, LabelFilterDropdown (+19 more)

### Community 10 - "Font & Vendor Downloaders"
Cohesion: 0.13
Nodes (14): download(), fonts, fs, http, https, path, run(), download() (+6 more)

### Community 11 - "Syntax & Brace Checkers"
Cohesion: 0.13
Nodes (10): content, fs, lines, scriptStart, content, fs, content, fs (+2 more)

### Community 12 - "App Esbuild Compiler"
Cohesion: 0.13
Nodes (14): bundlePath, endIndex, esbuild, fs, html, indexPath, jsxSource, path (+6 more)

### Community 13 - "Admin Dashboard Config"
Cohesion: 0.17
Nodes (12): ADMIN_APP_NAME, CHART_COLORS, CLIENT_FIRESTORE_ONLY, CLOUD_ADMIN_API, FALLBACK_COLLECTIONS, FALLBACK_DISCOVERY_COLLECTIONS, FIRESTORE_DIRECTORY_LABEL, LOCAL_ADMIN_APIS (+4 more)

### Community 15 - "Web App Manifest"
Cohesion: 0.20
Nodes (9): background_color, description, display, gcm_sender_id, icons, name, short_name, start_url (+1 more)

### Community 16 - "Nav Icon Extractor"
Cohesion: 0.22
Nodes (9): baseDir, fs, icons, path, rootDir, run(), sharp, templateDir (+1 more)

### Community 18 - "APK Logo & Icon Generator"
Cohesion: 0.25
Nodes (8): densities, fs, path, rootDir, run(), sharp, srcAppLogo, srcWithoutBg

### Community 19 - "Bug 1: Notepad/Category views - Can'"
Cohesion: 0.25
Nodes (8): Bug 1: Notepad/Category views - Can't complete tasks ❌, Bug 1 Root Cause:, Bug 2 Root Cause:, Bug 2: Standard/Daily views - Instant disappear ❌, Task Completion Animation Bugs - FIXED, Fixes Applied, Issues Reported, Root Causes

### Community 20 - "1. Increased Fire Sparks Particles"
Cohesion: 0.25
Nodes (8): 1. Increased Fire Sparks Particles, 2. Added Wide Mode to Fire Sparks, 3. Increased Ember Particles, 4. Changed Standard/Daily Views Animation, 5. Animation Settings by View Mode, Changes Made, Task Completion Animation Improvements, Technical Details

### Community 21 - "1.  Bottom Navigation Hover Effect"
Cohesion: 0.25
Nodes (8): 1. ✅ Bottom Navigation Hover Effect, 2. ✅ Firestore Rules for Backup Subcollection, 3. ✅ Added Pagination for Backups, 4. ✅ Improved Error Handling, Action Required: Deploy Firestore Rules, Backup System Fixes - Summary, Issues Fixed, Testing Checklist

### Community 22 - "Alternative: Manual Photoshop/GIMP M"
Cohesion: 0.25
Nodes (8): Alternative: Manual Photoshop/GIMP Method, 🎨 Design Considerations, Design Guidelines:, How to Create a Better Small Notification Icon, Pro Tips, Quick Win: Use Android Asset Studio (5 Minutes), Required Sizes:, Step-by-Step Instructions:

### Community 23 - "debug_braces.js"
Cohesion: 0.25
Nodes (6): content, fs, lines, path, results, scriptMatch

### Community 24 - "1. Google One Tap Widget (Desktop On"
Cohesion: 0.25
Nodes (8): 1. Google One Tap Widget (Desktop Only), 2. Enhanced Sign-In Popup (Like Claude's Design), Button Click Popup Flow, Date: 2026-09-30, 🔐 Google One Tap Implementation Guide, Google One Tap Flow, 🎯 How It Works, ✅ What Was Implemented

### Community 25 - "1.  Robust Quick Task ID Generation"
Cohesion: 0.25
Nodes (8): 1. ✅ Robust Quick Task ID Generation, 2. ✅ Daily Backup System, 3. ✅ Backup Management UI, 4. ✅ Calendar Page Design Consistency, 5. ✅ Homepage Loading Flicker Fix, Quick Tasks Reliability & Enhancements - Implementation Complete ✅, ✅ Implemented Features (5/5), Summary

### Community 26 - "1. Speech-to-Text "Google Microphone"
Cohesion: 0.25
Nodes (8): 1. Speech-to-Text "Google Microphone" for Quick Tasks, 2. Batch Deadline Modifier in Task Selection Mode, 3. Offline Mode & Auto-Sync on Reconnect, 4. Eliminate Push Notifications for Completed Tasks, 5. Interactive Pull-Down Notification Actions (Complete & +1 Hour), Architecture Decisions, Comprehensive Feature & Bug Fix Implementation Plan, Implemented Features & Technical Details

### Community 27 - "1. Google One Tap (Desktop Authentic"
Cohesion: 0.25
Nodes (8): 1. Google One Tap (Desktop Authentication), 2. Calendar Page Task Card Design ✅, 3. 3-Way Merge Sync System (Already Implemented), 4. Daily Backup System ❌, ✅ COMPLETED, Date: 2026-09-30, 🔥 Faiora Implementation Status, ⏳ IN PROGRESS / NOT YET IMPLEMENTED

### Community 28 - "1. ID Generator Module"
Cohesion: 0.25
Nodes (8): 1. ID Generator Module, Architecture, Component Interactions, Components and Interfaces, Design Principles, Technical Design Document, High-Level System Diagram, Overview

### Community 29 - "Requirements Document"
Cohesion: 0.25
Nodes (8): Requirements Document, Glossary, Introduction, Requirement 1: Robust Quick Task ID Generation, Requirement 2: Prevent Mass Deletion Bug, Requirement 3: Daily Backup System, Requirement 4: Backup Management Interface, Requirements

### Community 30 - "Implementation Plan: Quick Tasks Rel"
Cohesion: 0.25
Nodes (8): Implementation Plan: Quick Tasks Reliability and Enhancements, Overview, Phase 1: Robust Quick Task ID Generation, Phase 2: Automated Daily Backup System, Phase 3: Backup Management User Interface, Phase 4: Calendar Page Quick Task Styling Consistency, Phase 5: Homepage Loading State Flicker Fix, Tasks

### Community 31 - "1. Added Large Icon Support"
Cohesion: 0.25
Nodes (8): 1. Added Large Icon Support ✅, 2. Created Density-Specific Folders ✅, 3. Created Alternative Icon Resources ✅, Android Notification Icon Guide for Faiora, How to Make the Small Icon Bigger (Best Methods), Method 1: Use Android Asset Studio (RECOMMENDED - Easiest), The Problem, What I've Done

### Community 32 - "1. Added Large Icon Support"
Cohesion: 0.25
Nodes (8): 1. Added Large Icon Support 🎯, 2. Updated Files, 3. Created Resources for Future Use, ✅ Notification Icon Improvements Applied, How to Test:, Test the New APK, Understanding the Android Notification Layout, What I Fixed

### Community 33 - "1. Google One Tap Widget (Top-Right "
Cohesion: 0.25
Nodes (8): 1. Google One Tap Widget (Top-Right Corner), 2. Enhanced Sign-In Popup (Like Claude), 🔥 Google One Tap - Quick Reference, 🎯 How to Test Right Now, ⚠️ Important Note, Test 1: See the One Tap Widget, Test 2: See the Popup (Claude Style), ✅ What You Got

### Community 34 - "Quick Start: Fix Notification Icon S"
Cohesion: 0.25
Nodes (8): 🚀 Quick Start: Fix Notification Icon Size, Install the new APK, Make the Small Icon Bigger Too (5 Minutes), Method 1: Interactive Script (Easiest), Method 2: Manual Steps, Or manually: Copy APK to phone and tap to install, Test the Large Icon Fix (1 Minute), What I've Already Done For You ✅

### Community 35 - "generate_adaptive_icons.js"
Cohesion: 0.29
Nodes (7): densities, fs, generateAll(), path, rootDir, sharp, srcAppLogo

### Community 36 - "update_branding_icons.js"
Cohesion: 0.29
Nodes (7): fs, path, processIcons(), rootDir, sharp, srcApkNewLogo, srcNewLogo

### Community 37 - "Code Changes"
Cohesion: 0.25
Nodes (8): Code Changes, Date: 2026-09-30, 🔥 Faiora Sync Reliability Improvements, ✅ New System Features, ❌ Old System Problems, Problem Summary, Real-World Failure Scenarios, Solution Implemented

### Community 38 - "1. Test Locally"
Cohesion: 0.25
Nodes (8): 1. Test Locally, 2. Test Multi-Device Scenario, 3. Test Offline Sync, 4. Test Completion Merge, 5. Backup Data, After Deploying, Before Deploying, ✅ Sync Migration Checklist

### Community 39 - "Visual Guide: How the New Sync Works"
Cohesion: 0.25
Nodes (8): 🎯 Visual Guide: How the New Sync Works, Real-World Scenarios, Scenario 1: Adding Tasks While Offline, Scenario 2: Edit Same Task Different Fields, Scenario 3: Completion Status (OR Logic), Scenario 4: Progress (Maximum Logic), The Problem: Old System, The Solution: New System

### Community 40 - "1. Animation Particle Functions (Lin"
Cohesion: 0.25
Nodes (8): 1. Animation Particle Functions (Lines ~2337-2433), 2. CSS Animations (Lines ~291-420), 3. QuickTaskItem Component Updates (Line ~6600), 4. QuickTasksNotepadView Component Updates (Line ~7120), 5. View Mode Props Added to Task Rendering, Task Completion Animations - Implementation Summary, Features Implemented, Overview

### Community 41 - "Copy the example file"
Cohesion: 0.25
Nodes (8): Copy the example file, 📱 Telegram APK Auto-Upload, Edit .telegram_config with your credentials, 🚀 Quick Setup, Step 1: Create a Telegram Bot, Step 2: Get Your Channel ID, Step 3: Configure Credentials, 📦 Usage

### Community 42 - "assets_vendor_babel_min"
Cohesion: 0.29
Nodes (5): Babel, beforeMatch, fs, html, match

### Community 43 - "optimize_icons.js"
Cohesion: 0.33
Nodes (5): fs, optimizeIcons(), path, sharp, sizes

### Community 44 - "repair.js"
Cohesion: 0.29
Nodes (6): around560, fs, indexC, lines, path, shareC

### Community 45 - "1. Speech-to-Text Google Microphone "
Cohesion: 0.33
Nodes (6): 1. Speech-to-Text Google Microphone in Quick Tasks, 2. Multi-Select Batch Deadline Modifier, 3. Offline Mode & Auto-Sync on Reconnect, 4. Completed Tasks Notification Elimination, Step-by-Step Testing Guide for Implemented Features, Steps:

### Community 46 - "1. Bottom Navigation Tap Effect"
Cohesion: 0.33
Nodes (6): 1. Bottom Navigation Tap Effect, 2. Backup List with Pagination, 3. Error Messages (Improved), After, Before, Visual Changes Summary

### Community 49 - "CLOUD_ADMIN_API"
Cohesion: 0.50
Nodes (4): CLOUD_ADMIN_API, LOCAL_ADMIN_API, share_note.html Application Entry, ShareApp

## Knowledge Gaps
- **494 isolated node(s):** `@capacitor-firebase/authentication`, `@capacitor/android`, `@capacitor/app`, `@capacitor/assets`, `@capacitor/core` (+489 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 689 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **100 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `App` connect `Core App & Task Handlers` to `Main Entry Constants & UI`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **What connects `@capacitor-firebase/authentication`, `@capacitor/android`, `@capacitor/app` to the rest of the system?**
  _494 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Core App & Task Handlers` be split into smaller, more focused modules?**
  _Cohesion score 0.013333333333333334 - nodes in this community are weakly interconnected._
- **Why does `index.html Application Entry` connect `Main Entry Constants & UI` to `Core App & Task Handlers`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Should `Faiora Main Bundle` be split into smaller, more focused modules?**
  _Cohesion score 0.0684931506849315 - nodes in this community are weakly interconnected._
- **Why does `NativeAlarmScheduler` connect `Android Alarm & Task Receivers` to `Android MainActivity & Bridge`, `Android Alarm Alert Service`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Should `Android Alarm & Task Receivers` be split into smaller, more focused modules?**
  _Cohesion score 0.07577639751552795 - nodes in this community are weakly interconnected._