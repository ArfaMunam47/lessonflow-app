# LessonFlow 

### School Lesson Planning & Workflow Automation Platform

> **Status: 🟢 Active Development**

LessonFlow is a full-stack productivity and workflow automation platform built for **school teaching staff** to simplify and streamline the weekly lesson-planning and data-entry process.

The project is designed around a simple objective:

**Prepare lesson-plan information once, organize it properly, and eliminate repetitive manual data entry.**

---

## 🎯 Why LessonFlow?

Teachers often spend several hours every week entering lesson plans into an existing school website.

A typical workflow requires teachers to repeatedly:

* Select a class
* Select a section
* Select a day
* Enter the weekly target
* Enter activities
* Create multiple lesson blocks
* Fill several fields inside every block
* Repeat the same process for multiple classes
* Repeat the entire process across multiple school days

The **block creation and data-entry process** is particularly repetitive.

A lesson may contain 3–6 or more blocks, with each block containing multiple fields. Teachers must manually create and populate every block through the school's existing system.

There is also a significant copy-and-paste problem.

Lesson content is often prepared in separate documents, requiring teachers to repeatedly switch between the source document and the school website. Rich-text formatting and HTML can also be copied unintentionally, forcing teachers to manually clean and select text before pasting.

### LessonFlow is designed to solve these problems.

---

## 🚀 Core Concept

LessonFlow separates **lesson preparation** from **lesson submission**.

Instead of repeatedly entering information directly into the school's website, teachers can first prepare their weekly lesson plans inside LessonFlow.

```text
Lesson Content
      ↓
LessonFlow
      ↓
Structured Weekly Lesson Plans
      ↓
Classes / Days / Lessons
      ↓
Blocks & Block Fields
      ↓
Teacher Review
      ↓
Future Chrome Extension
      ↓
Existing School Website
      ↓
Automated Data Entry
      ↓
Teacher Final Review & Submission
```

The web application acts as the **planning and data layer**, while a future Chrome extension will act as the **execution layer**.

---

# ✨ Key Features

## 📅 Weekly Lesson Workspace

Teachers can create and manage complete weekly lesson plans.

Each week can contain multiple lesson records organized by:

* Week
* Day
* Class
* Section
* Lesson
* Target
* Activities
* Blocks

Teachers can easily navigate between records and monitor their weekly progress.

---

## 🧱 Dynamic Block Builder

The Block Builder is one of the core features of LessonFlow.

Instead of repeatedly clicking:

```text
Add Block
Add Block
Add Block
Add Block
```

teachers can specify the required number of blocks and create them at once.

For example:

```text
Create 5 Blocks
```

LessonFlow creates:

```text
Block 1
Block 2
Block 3
Block 4
Block 5
```

Each block can then be independently edited, reordered, duplicated, or removed.

### Supported operations

* Create multiple blocks
* Add individual blocks
* Delete blocks
* Duplicate blocks
* Reorder blocks
* Clear block content
* Edit block fields
* Apply block templates
* Preserve independent block data

---

## 🧩 Configurable Block Fields

The exact fields used by the school's lesson-planning system may vary.

LessonFlow therefore uses a configurable block-field architecture rather than hard-coding a fixed structure.

A block can contain fields such as:

```text
Objective
Teacher Activity
Student Activity
Resources
Assessment
```

These are examples only.

Block templates can define:

* Field name
* Field label
* Field type
* Field order
* Required/optional state
* Placeholder text

This allows LessonFlow to adapt to the actual structure of the school's existing system.

---

# 📋 Plain-Text Clipboard

LessonFlow includes a persistent clipboard system designed specifically for lesson-plan workflows.

Teachers can copy multiple pieces of lesson content without immediately switching to the school website to paste each item.

For example:

```text
Target
Activities
Block 1 Objective
Block 1 Activity
Block 1 Assessment
Block 2 Objective
Block 2 Activity
Block 2 Assessment
```

Each copied item can be stored in the LessonFlow clipboard gallery.

---

## 🧹 Clean Text Copying

Copied content is converted into clean plain text.

LessonFlow is designed to prevent unwanted formatting such as:

* HTML
* Rich-text styles
* Fonts
* Background colors
* Embedded formatting
* Unwanted document structure

For example:

```html
<p><strong>Students will learn fractions.</strong></p>
```

becomes:

```text
Students will learn fractions.
```

This allows teachers to copy only the actual content they need.

---

# 🗂️ Clipboard Gallery

Clipboard items can be organized around the teacher's lesson-plan structure.

Example:

```text
Week 8
└── Monday
    └── Class 6A
        ├── Target
        ├── Activities
        ├── Block 1
        │   ├── Objective
        │   ├── Activity
        │   └── Assessment
        └── Block 2
            ├── Objective
            ├── Activity
            └── Assessment
```

Clipboard items can be:

* Viewed
* Searched
* Filtered
* Edited
* Deleted
* Renamed
* Copied again
* Associated with lesson records
* Ordered into a copy queue

---

# 📑 Block Templates

Teachers can save frequently used block structures as reusable templates.

Example:

### Standard Lesson Block

```text
Objective
Teacher Activity
Student Activity
Resources
Assessment
```

Once created, the template can be applied to multiple blocks or lesson records.

This eliminates repetitive block setup.

---

# 🔁 Duplicate Previous Week

Teachers frequently use similar lesson structures from one week to another.

LessonFlow supports weekly duplication.

Example:

```text
Week 8
   ↓
Duplicate
   ↓
Week 9
```

The new week can preserve:

* Classes
* Sections
* Days
* Lesson records
* Block structures
* Block counts
* Templates
* Existing lesson content

The duplicated week receives new database records so that editing Week 9 does not modify Week 8.

---

# 📄 Duplicate Lesson Records

Individual lessons can also be duplicated.

For example:

```text
Monday — Class 6A
        ↓
Duplicate
        ↓
Tuesday — Class 6A
```

The teacher can then modify only the information that changed.

---

# 📊 Progress Tracking

LessonFlow provides weekly progress tracking.

Example:

```text
Week 8

Completed: 27 / 40

Progress: 67.5%
```

Lesson records can have statuses such as:

* Draft
* Ready
* In Progress
* Completed

This allows teachers to quickly understand how much of their weekly lesson planning has been completed.

---

# 🤖 AI-Assisted Lesson Import

AI is an optional productivity layer rather than the core of the application.

Teachers may have lesson-plan information in:

* Word documents
* PDFs
* Spreadsheets
* Copied text
* Unstructured notes
* Other formatted documents

LessonFlow can use Gemini to help convert unstructured content into structured lesson-plan data.

For example:

```text
Class: 6A
Monday

Target:
Introduction to fractions

Activity:
Group exercise

Block 1:
Objective: ...
Teacher Activity: ...
Student Activity: ...

Block 2:
Objective: ...
Teacher Activity: ...
Student Activity: ...
```

can be transformed into structured data:

```json
{
  "class": "6A",
  "day": "Monday",
  "target": "Introduction to fractions",
  "activities": "Group exercise",
  "blocks": [
    {
      "objective": "...",
      "teacherActivity": "...",
      "studentActivity": "..."
    },
    {
      "objective": "...",
      "teacherActivity": "...",
      "studentActivity": "..."
    }
  ]
}
```

### Important

AI-generated information must always be reviewable before being imported.

LessonFlow must not silently overwrite existing lesson data or invent missing information.

---

# 🔌 Future Chrome Extension

The web application is intentionally designed as the foundation for a future Chrome extension.

The extension will eventually integrate with the school's existing lesson-planning website.

The expected workflow is:

```text
Teacher opens school website
        ↓
Chrome Extension
        ↓
Selects the correct LessonFlow record
        ↓
Retrieves structured lesson data
        ↓
Fills class
        ↓
Fills section
        ↓
Fills day
        ↓
Fills target
        ↓
Fills activities
        ↓
Creates required blocks
        ↓
Fills block fields
        ↓
Teacher reviews
        ↓
Teacher manually submits
```

The Chrome extension will be developed as a **separate project**.

LessonFlow provides the backend and structured data required by that extension.

---

# 🏗️ Architecture

LessonFlow is designed as a full-stack application.

```text
┌──────────────────────────────┐
│       LessonFlow Web App     │
│                              │
│  Weekly Workspace            │
│  Lesson Records              │
│  Block Builder               │
│  Templates                   │
│  Clipboard Gallery           │
│  Progress Tracking           │
│  AI Import                   │
└──────────────┬───────────────┘
               │
               │ API
               ▼
┌──────────────────────────────┐
│        Backend / API         │
│                              │
│  Authentication             │
│  Business Logic              │
│  Lesson Data                 │
│  Block Data                  │
│  Clipboard Data              │
│  AI Services                 │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│          Database            │
│                              │
│  Users                       │
│  Weeks                       │
│  Lessons                     │
│  Blocks                      │
│  Block Fields                │
│  Templates                   │
│  Clipboard Items             │
└──────────────┬───────────────┘
               │
               │ Future API Client
               ▼
┌──────────────────────────────┐
│    Chrome Extension          │
│                              │
│  School Website Integration  │
│  Field Automation            │
│  Block Creation              │
│  Progress Synchronization    │
└──────────────────────────────┘
```

---

# 🗃️ Core Data Model

The application is built around structured lesson data.

### User

```text
User
 └── Teacher Profile
```

### Week

```text
Week
 └── Lesson Records
       ├── Class
       ├── Section
       ├── Day
       ├── Target
       ├── Activities
       └── Blocks
             ├── Block 1
             │     └── Fields
             ├── Block 2
             │     └── Fields
             └── Block N
                   └── Fields
```

This structure allows lessons to contain a variable number of blocks and fields.

---

# 🔐 Security & Data Isolation

LessonFlow is designed as a multi-user application.

Each teacher's lesson-plan data must remain isolated.

The system includes plans for:

* Authentication
* User-specific data access
* Server-side authorization
* API validation
* Secure API routes
* Server-side AI credentials
* Input sanitization
* Protection against unauthorized record access

---

# 🧪 Testing

Core business logic is tested independently of the UI.

Important test cases include:

* Creating weeks
* Duplicating weeks
* Creating lesson records
* Duplicating lessons
* Creating multiple blocks
* Creating blocks from templates
* Editing block fields
* Reordering blocks
* Duplicating blocks
* Cleaning clipboard content
* Copying plain text
* Calculating weekly progress
* Validating AI-generated structures
* User data isolation

---

# 🛠️ Technology

The project is being developed as a modern full-stack web application.

### Frontend

* React
* TypeScript
* Modern component-based architecture

### Backend

* Node.js
* Server-side API architecture

### Database

* Persistent relational/structured data storage

### AI

* Google Gemini API
* AI-assisted lesson-plan parsing and structuring

### Future Integration

* Chrome Extension
* Chrome Manifest V3
* School website DOM integration
* LessonFlow API

---

# 📌 Current Development Status

**🟢 Active Development**

The project is currently focused on building and validating the core functionality.

### Current priorities

* [x] Product architecture defined
* [x] Core workflow defined
* [x] Lesson data model defined
* [x] Dynamic block concept defined
* [x] Clipboard workflow defined
* [x] Future Chrome extension architecture defined
* [ ] Core application implementation
* [ ] Database integration
* [ ] Authentication
* [ ] Weekly workspace
* [ ] Lesson record management
* [ ] Dynamic Block Builder
* [ ] Block templates
* [ ] Plain-text Clipboard Gallery
* [ ] Week duplication
* [ ] Progress tracking
* [ ] AI lesson-plan import
* [ ] Backend API
* [ ] Automated testing
* [ ] Chrome extension
* [ ] School website integration
* [ ] Final UI/UX refinement

---

# 🗺️ Roadmap

## Phase 1 — Core Web Application

* User authentication
* Teacher profile
* Weekly workspace
* Lesson records
* Dynamic blocks
* Block fields
* Templates
* Persistent data

## Phase 2 — Productivity Features

* Clipboard Gallery
* Plain-text copying
* Copy Queue
* Duplicate lesson
* Duplicate week
* Progress tracking
* Search and filtering
* Keyboard-first workflow

## Phase 3 — AI Assistance

* Lesson-plan import
* Unstructured content parsing
* Structured JSON generation
* Review-before-import workflow
* Validation of AI-generated data

## Phase 4 — Chrome Extension

* Chrome Manifest V3 extension
* LessonFlow authentication
* Side panel
* Current lesson detection
* Data retrieval
* School website field mapping
* Automatic block creation
* Block field population
* Progress synchronization

## Phase 5 — UI/UX Refinement

Once the underlying workflow is stable:

* Improved visual design
* Better navigation
* Improved responsive layouts
* Accessibility improvements
* Keyboard workflow improvements
* Performance optimization
* Teacher usability testing

---

# 🎯 Project Goal

The ultimate goal of LessonFlow is not to create another lesson-planning application.

It is to **remove repetitive administrative work from teachers' weekly lesson-planning workflow**.

Instead of spending hours repeatedly:

```text
Copy → Switch → Paste
Copy → Switch → Paste
Add Block → Fill
Add Block → Fill
Add Block → Fill
Repeat...
```

the intended workflow becomes:

```text
Prepare Once
     ↓
Organize
     ↓
Review
     ↓
Automate Repetitive Entry
     ↓
Teacher Final Review
     ↓
Submit
```

LessonFlow is designed to give teachers back the time currently spent on repetitive data entry.

---

## 📍 Project Information

**Project:** LessonFlow
**Type:** School Productivity & Workflow Automation
**Status:** 🟢 Active Development
**Primary Users:** School Teaching Staff
**Current Focus:** Core functionality and workflow automation
**Future Integration:** Chrome Extension + Existing School Lesson-Planning System

---

## ⚠️ Development Note

LessonFlow is being developed incrementally.

The initial development priority is **functionality, reliability, data integrity, and workflow efficiency**.

Visual design and advanced UI polish will be refined after the core workflow has been validated with real lesson-planning use cases.

---

## 📄 License

License and distribution terms will be defined as the project progresses.
