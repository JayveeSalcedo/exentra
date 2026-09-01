 Folder Structure Documentation

## 1. Overview

The project is organized around the `src` directory, which contains the main application code.

The structure separates:

- Reusable components
- Application pages
- Learning content
- Core integrations
- Global state
- Custom hooks
- Type definitions
- Services
- Utilities

Database changes are stored separately in the `migrations` directory.

---

# 2. Core Folder Structure

```text
project-root/
│
├── src/
│   │
│   ├── components/
│   │   ├── layout/
│   │   ├── ui/
│   │   └── visualizers/
│   │
│   ├── hooks/
│   │   └── useIsMobile.ts
│   │
│   ├── lessons/
│   │   ├── module1/
│   │   ├── module2/
│   │   ├── module3/
│   │   ├── module4/
│   │   ├── module5/
│   │   ├── module6/
│   │   ├── module7/
│   │   ├── module8/
│   │   ├── index.ts
│   │   └── types.ts
│   │
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── groq.ts
│   │   ├── dailyChallenge.ts
│   │   ├── gameSessions.ts
│   │   ├── multiplayer.ts
│   │   ├── seededRandom.ts
│   │   └── sfx.ts
│   │
│   ├── pages/
│   │   ├── auth/
│   │   ├── student/
│   │   │   └── games/
│   │   └── teacher/
│   │
│   ├── services/
│   │
│   ├── store/
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   │
│   ├── types/
│   │   └── auth.ts
│   │
│   └── utils/
│
├── migrations/
│   ├── migration_002_progress_tracking.sql
│   └── migration_003_fix_lesson_ids.sql
│
├── package.json
│
└── configuration files
3. /src

The src directory contains the main source code of the application.

It includes:

User interface components
Application pages
Learning content
Database integrations
AI functionality
Global state
Type definitions
Shared utilities
4. /src/components

Contains reusable user interface components.

The components directory is divided into major groups.

/components/layout

Contains components responsible for the overall application layout.

Typical responsibilities include:

Sidebar navigation
Top navigation
Page layouts
Shared application containers

These components provide consistent navigation and structure across the application.

/components/ui

Contains reusable interface components.

Examples include:

ChatBot
CodeEditor
FormField
LogoutModal
ModalShell
PasswordInput
SelectInput
TextInput

These components are shared between multiple pages to avoid repeating interface logic.

/components/visualizers

Contains interactive educational visualizations.

These components visually demonstrate data structures and algorithms.

Examples include:

ArrayVisualizer
ConceptVisualizer
GraphVisualizer
HashVisualizer
LinkedListVisualizer
QueueVisualizer
SortVisualizer
StackVisualizer
TreeVisualizer

The visualizers support the lesson and learning systems by allowing concepts to be represented interactively.

5. /src/hooks

Contains custom React hooks.

useIsMobile.ts

Used to support responsive behavior by detecting or responding to mobile screen sizes.

Custom hooks allow reusable logic to be separated from page and component code.

6. /src/lessons

Contains structured learning content.

Lessons are organized by module.

lessons/
│
├── module1/
├── module2/
├── module3/
├── module4/
├── module5/
├── module6/
├── module7/
├── module8/
├── index.ts
└── types.ts

The modules correspond to major learning topics, including:

Module 1 ─ Arrays
Module 2 ─ Linked Lists
Module 3 ─ Stacks
Module 4 ─ Queues
Module 5 ─ Trees
Module 6 ─ Graphs
Module 7 ─ Sorting and Searching
Module 8 ─ Hashing
index.ts

Acts as a central export or entry point for lesson content.

types.ts

Contains TypeScript definitions related to lesson structures and lesson data.

7. /src/lib

Contains core integrations and shared application functionality.

supabase.ts

Handles the Supabase client and communication with the backend.

Used for functionality such as:

Authentication
Database operations
Queries
User-related operations
groq.ts

Handles AI-related integration.

This can support AI-powered functionality such as generated content, feedback, or other intelligent learning features.

dailyChallenge.ts

Contains logic related to daily challenges.

Possible responsibilities include:

Loading challenges
Checking challenge availability
Recording challenge attempts
Processing challenge rewards
gameSessions.ts

Contains functionality related to educational game sessions.

Used for handling:

Scores
Game results
XP rewards
Performance data
Session storage
multiplayer.ts

Contains multiplayer-related functionality.

This supports features where multiple users may interact within a shared game or learning experience.

seededRandom.ts

Provides deterministic randomization.

This can be useful when the application needs repeatable randomized content.

sfx.ts

Handles application sound effects.

Used primarily for interactive and gamified experiences.

8. /src/pages

Contains the main application screens.

Pages are separated into role-based areas.

pages/
│
├── auth/
│
├── student/
│   └── games/
│
└── teacher/
9. /src/pages/auth

Contains authentication and account-related pages.

Main pages include:

Login
Sign up
Forgot password
Splash screen

These pages control access to the application.

10. /src/pages/student

Contains student-facing application features.

Student pages cover areas such as:

Dashboard
Learning
Lesson player
Assessments
Taking assessments
Learning materials
Progress
Achievements
Leaderboards
Personalized problems
Study decks
Quests
Profile
Submission history
/src/pages/student/games

Contains the educational games.

games/
│
├── ArrayBlitz
├── NodeConnect
├── PathExplorer
├── QueueRush
├── SortArena
├── StackTower
└── TreeBuilder

Each game represents an educational activity related to data structures or algorithms.

ArrayBlitz

Focused on array-related concepts.

NodeConnect

Focused on linked data structures or node connections.

PathExplorer

Focused on graph traversal or path-related concepts.

QueueRush

Focused on queue concepts.

SortArena

Focused on sorting algorithms.

StackTower

Focused on stack concepts.

TreeBuilder

Focused on tree structures.

Game results can connect to the game_sessions database table.

11. /src/pages/teacher

Contains teacher-facing features.

Teacher pages include functionality for:

Teacher dashboard
Block management
Student management
Assessment management
Assessment creation
Quiz generation
Material management
Student progress monitoring
Activity logs
Teacher profile

The teacher area connects heavily with:

blocks
block_enrollments
assessments
questions
choices
materials
submissions
student_progress
game_sessions
12. /src/services

Contains service-layer and business logic.

This folder can be used to separate application operations from the user interface.

Typical service responsibilities may include:

Page
 │
 ▼
Service
 │
 ▼
Supabase / External Integration

This separation helps prevent database logic from being tightly coupled to React components.

13. /src/store

Contains global application state.

AuthContext.tsx

Handles authentication-related state.

Possible responsibilities include:

Current user
User session
Authentication status
User profile information
Login and logout state
ThemeContext.tsx

Handles application appearance and theme state.

This allows theme settings to be shared across the application.

14. /src/types

Contains shared TypeScript types and interfaces.

Example:

auth.ts

This helps maintain consistent data structures throughout the application.

15. /src/utils

Contains reusable utility and helper functions.

Utilities are generally small pieces of logic that do not belong directly to:

Pages
Components
Services
Global state
16. /migrations

Contains SQL migration files.

Current migrations include:

migration_002_progress_tracking.sql
migration_003_fix_lesson_ids.sql
migration_002_progress_tracking.sql

Related to database changes involving progress tracking.

migration_003_fix_lesson_ids.sql

Related to database changes involving lesson identifiers.

Migrations allow database changes to be versioned and applied consistently.

17. Root Files
package.json

Contains project metadata, dependencies, and scripts.

Typical responsibilities include:

Defining dependencies
Defining development dependencies
Running the development server
Building the application
Configuration Files

The project root also contains configuration files used by the application and development environment.

These may include configuration for:

TypeScript
Vite
Build tools
Environment variables
Package management
18. Folder Relationship Overview
src/
│
├── components/
│      └── Shared interface components
│
├── pages/
│      └── Main application screens
│
├── lessons/
│      └── Structured learning content
│
├── lib/
│      └── Core integrations and shared logic
│
├── services/
│      └── Business and service logic
│
├── store/
│      └── Global application state
│
├── hooks/
│      └── Reusable React logic
│
├── types/
│      └── Shared TypeScript definitions
│
└── utils/
       └── General helper functions
19. Architectural Flow
User
 │
 ▼
Pages
 │
 ├── Components
 │
 ├── Hooks
 │
 ├── Store / Context
 │
 ├── Services
 │
 └── Lib
        │
        ▼
    Supabase / AI / Multiplayer

The folder structure separates user interface code from shared logic and external integrations.

This makes the application easier to maintain as the project grows.