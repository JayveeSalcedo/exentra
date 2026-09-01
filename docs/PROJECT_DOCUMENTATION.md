# Project Documentation

## 1. Project Overview

This project is a role-based, gamified educational and learning management platform designed for students and teachers.

The system combines structured learning, assessments, classroom management, educational games, progress tracking, personalized study tools, and gamification.

## 2. Core Features

### User Management
- User authentication
- Student and teacher profiles
- Role-based access
- Academic and profile information

### Classroom Management
- Teacher-managed blocks or classes
- Student enrollment
- School year and semester information
- Block schedules
- Archive support

### Learning
- Learning modules
- Individual lessons
- Learning materials
- Interactive visualizers
- Module and lesson progress tracking

### Assessments
- Teacher-created assessments
- Multiple-choice and text-based questions
- Answer choices
- Student submissions
- Automatic or manual grading
- File submissions
- XP rewards

### Gamification
- XP rewards
- Levels
- Activity streaks
- Best streak tracking
- Educational games
- Daily challenges
- Badges and game rankings

### Personalized Learning
- Personalized practice problems
- Difficulty-based exercises
- AI feedback
- Student-created study decks
- Flashcards

### Notifications
- User-specific notifications
- Read/unread status
- Optional navigation links

---

# 3. High-Level System Architecture

```text
Application
│
├── Frontend
│   ├── React / TypeScript
│   ├── Pages
│   ├── Components
│   ├── Context / Global State
│   └── Custom Hooks
│
├── Core Services
│   ├── Supabase Integration
│   ├── AI Integration
│   ├── Game Session Logic
│   ├── Multiplayer Logic
│   └── Shared Utilities
│
└── Backend / Database
    ├── Supabase Authentication
    ├── PostgreSQL Database
    ├── Row Level Security
    └── File Storage
4. User Roles

The application primarily supports two user roles.

Student

Students interact with the learning and gamification features of the platform.

Student Capabilities
Access enrolled blocks
View learning modules and lessons
Complete lessons
Track progress
Take assessments
Submit answers and files
Play educational games
Earn XP
Build streaks
Complete daily challenges
Create and manage study decks
Practice personalized problems
View notifications
Teacher

Teachers manage learning activities and monitor students.

Teacher Capabilities
Create and manage blocks
Manage student enrollments
Create assessments
Create questions and answer choices
Generate quizzes
Upload learning materials
View submissions
Grade student work
Monitor student progress
Monitor student game activity
5. Core System Domains
AUTHENTICATION & USERS
        │
        ▼
     profiles
        │
        ├──────────────────┐
        │                  │
        ▼                  ▼
 CLASSROOMS            STUDENT ACTIVITY
        │                  │
        ▼                  ├── Progress
     blocks                ├── Assessments
        │                  ├── Games
        ▼                  ├── Challenges
block_enrollments          ├── Problems
                           └── Study Decks


LEARNING CONTENT
        │
        ▼
     modules
        │
        ├── lessons
        ├── materials
        └── assessments
6. Student Application Flow
Login
  │
  ▼
Load User Profile
  │
  ▼
Load Enrolled Blocks
  │
  ▼
Student Dashboard
  │
  ├── Learning
  │      │
  │      ├── Modules
  │      ├── Lessons
  │      └── Progress Tracking
  │
  ├── Assessments
  │      │
  │      ├── Questions
  │      ├── Answers
  │      └── Submissions
  │
  ├── Educational Games
  │      │
  │      └── Game Sessions
  │
  ├── Daily Challenges
  │      │
  │      └── Challenge Attempts
  │
  └── Study Tools
         │
         ├── Personalized Problems
         └── Study Decks
7. Teacher Application Flow
Login
  │
  ▼
Teacher Dashboard
  │
  ├── Manage Blocks
  │      │
  │      └── Student Enrollments
  │
  ├── Manage Materials
  │      │
  │      └── Upload Learning Resources
  │
  ├── Create Assessments
  │      │
  │      ├── Questions
  │      └── Choices
  │
  ├── Review Submissions
  │      │
  │      └── Grade Student Work
  │
  └── Monitor Students
         │
         ├── Learning Progress
         ├── Assessment Performance
         └── Game Activity
8. Gamification Flow
Student Activity
│
├── Complete Lessons
├── Complete Assessments
├── Play Educational Games
└── Complete Daily Challenges
        │
        ▼
      Earn XP
        │
        ▼
   Update Profile
        │
        ├── XP
        ├── Level
        ├── Streak
        └── Best Streak

The gamification system is supported by:

profiles
game_sessions
daily_challenges
challenge_attempts
9. Learning and Assessment Flow
Module
  │
  ├── Lessons
  │      │
  │      └── Student Progress
  │
  ├── Materials
  │
  └── Assessments
          │
          ▼
       Questions
          │
          ▼
        Choices
          │
          ▼
    Student Submission
          │
          ├── Answers
          └── File Submissions
10. Overall System Summary

The project combines three major areas:

Learning Management
Modules
Lessons
Materials
Blocks
Assessments
Student Activity and Progress
Lesson completion
Assessment submissions
Game performance
Daily challenges
Gamification and Personalized Learning
XP
Levels
Streaks
Games
Personalized problems
Flashcards and study decks

The frontend separates student and teacher experiences while shared services, components, integrations, and state management support the entire application.

Database access is controlled through Supabase Row Level Security policies based on user identity, ownership, role, enrollment, and teacher authorization.