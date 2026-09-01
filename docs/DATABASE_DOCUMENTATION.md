Database Documentation

## 1. Database Overview

The database supports the main features of the learning platform.

The schema can be divided into the following domains:

```text
AUTHENTICATION & USERS
│
└── profiles


CLASSROOM MANAGEMENT
│
├── blocks
└── block_enrollments


LEARNING CONTENT
│
├── modules
├── lessons
└── materials


ASSESSMENTS
│
├── assessments
├── questions
├── choices
├── submissions
├── answers
└── file_submissions


STUDENT PROGRESS & GAMIFICATION
│
├── student_progress
├── game_sessions
├── daily_challenges
├── challenge_attempts
├── student_problems
├── student_decks
├── deck_cards
└── notifications
2. User Management
profiles

The profiles table stores application-specific information for users.

Main Purpose
Identify users
Store student and teacher information
Store academic information
Store gamification statistics
Track activity
Columns
Column	Type	Description
id	uuid	Primary user identifier
school_id	text	Unique school identifier
first_name	text	User first name
last_name	text	User last name
username	text	Unique username
role	text	User role
year_level	text	Academic year level
course	text	Academic course
avatar_url	text	Profile image URL
xp	int4	Total XP
level	int4	Current level
streak	int4	Current streak
best_streak	int4	Highest streak
last_active	timestamptz	Last recorded activity
created_at	timestamptz	Profile creation date
year_course	text	Combined year/course information
bio	text	User biography
student_type	text	Student classification
contact_email	text	Contact email
Connections
profiles.id
│
├── blocks.teacher_id
├── block_enrollments.student_id
├── assessments.teacher_id
├── assessments.created_by
├── submissions.student_id
├── student_progress.student_id
├── game_sessions.student_id
├── challenge_attempts.student_id
├── student_problems.student_id
├── student_decks.student_id
└── notifications.user_id
3. Classroom Management
blocks

Represents a class, section, or student group.

Columns
Column	Type	Description
id	uuid	Primary identifier
name	text	Block name
description	text	Block description
teacher_id	uuid	Assigned teacher
created_at	timestamptz	Creation date
school_year	text	Academic year
semester	text	Semester
is_archived	bool	Archive status
schedule	text	Block schedule
Connections
Teacher
   │
   ▼
 blocks
   │
   ├── block_enrollments
   ├── assessments
   └── materials
block_enrollments

Connects students to blocks.

Columns
Column	Type	Description
id	uuid	Primary identifier
block_id	uuid	Related block
student_id	uuid	Enrolled student
enrolled_at	timestamptz	Enrollment date
status	text	Enrollment status
removed_at	timestamptz	Removal date
Relationship
profiles
   │
   │ student
   ▼
block_enrollments
   ▲
   │
 blocks

This table allows students to belong to blocks while also allowing a block to contain multiple students.

4. Learning Content
modules

Represents major learning units.

Columns
Column	Type	Description
id	uuid	Primary identifier
order_index	int4	Module order
title	text	Module title
description	text	Module description
type	text	Module type
xp_reward	int4	XP reward
is_locked	bool	Lock status
created_at	timestamptz	Creation date
Connections
modules
│
├── lessons
├── assessments
├── materials
├── daily_challenges
└── student_progress
lessons

Stores individual lessons.

Columns
Column	Type	Description
id	text	Primary identifier
module_id	uuid	Related module
order_index	int4	Lesson order
title	text	Lesson title
duration_minutes	int4	Estimated duration
xp_reward	int4	XP reward
created_at	timestamptz	Creation date

Lessons are connected to modules and can be tracked through student_progress.

materials

Stores learning resources.

Columns
Column	Type	Description
id	uuid	Primary identifier
block_id	uuid	Related block
module_id	uuid	Related module
teacher_id	uuid	Related teacher
title	text	Material title
description	text	Material description
file_url	text	File location
file_type	text	File type
created_at	timestamptz	Creation date
file_size	int8	File size
uploaded_by	uuid	User who uploaded the file

Materials can be associated with a specific block, module, and teacher.

5. Student Progress
student_progress

Tracks lesson and module completion.

Columns
Column	Type	Description
id	uuid	Primary identifier
student_id	uuid	Student
module_id	text	Module identifier
lesson_id	text	Lesson identifier
completed	bool	Completion status
completed_at	timestamptz	Completion date
Flow
Student
   │
   ▼
Complete Lesson
   │
   ▼
student_progress

This data can be used to calculate:

Lesson completion
Module progress
Overall learning progress
XP rewards
Content unlocks
6. Assessment System

The assessment system follows this structure:

assessments
      │
      ▼
  questions
      │
      ▼
   choices


Student
   │
   ▼
submissions
      │
      ▼
    answers
assessments

Stores quizzes, exams, and other assessments.

Columns
Column	Type	Description
id	uuid	Primary identifier
block_id	uuid	Assigned block
module_id	uuid	Related module
teacher_id	uuid	Teacher
title	text	Assessment title
description	text	Description
type	text	Assessment type
total_points	int4	Maximum points
xp_reward	int4	XP reward
time_limit	int4	Time limit
due_date	timestamptz	Due date
opens_at	timestamptz	Opening date
is_published	bool	Publication status
created_at	timestamptz	Creation date
created_by	uuid	Creating user
module_topic	text	Related topic
total_questions	int4	Number of questions
difficulty	text	Difficulty level
questions

Stores questions belonging to an assessment.

Columns
Column	Type	Description
id	uuid	Primary identifier
assessment_id	uuid	Related assessment
order_index	int4	Question order
question_text	text	Question content
question_type	text	Type of question
points	int4	Available points
created_at	timestamptz	Creation date
explanation	text	Answer explanation
correct_choice_index	int4	Correct choice position
choices

Stores choices for multiple-choice questions.

Columns
Column	Type	Description
id	uuid	Primary identifier
question_id	uuid	Related question
choice_text	text	Choice content
is_correct	bool	Correctness status
order_index	int4	Choice order
submissions

Represents a student's assessment attempt.

Columns
Column	Type	Description
id	uuid	Primary identifier
assessment_id	uuid	Related assessment
student_id	uuid	Student
score	numeric	Score
total_points	int4	Maximum points
xp_earned	int4	Earned XP
started_at	timestamptz	Start time
submitted_at	timestamptz	Submission time
is_submitted	bool	Submission status
percentage	numeric	Percentage score
graded_at	timestamptz	Grading date
answers

Stores individual answers within a submission.

Columns
Column	Type	Description
id	uuid	Primary identifier
submission_id	uuid	Related submission
question_id	uuid	Related question
choice_id	uuid	Selected choice
answer_text	text	Text answer
is_correct	bool	Correctness
points_earned	numeric	Earned points
file_submissions

Stores uploaded files related to student submissions.

Columns
Column	Type	Description
id	uuid	Primary identifier
submission_id	uuid	Related submission
student_id	uuid	Student
file_url	text	File location
file_name	text	File name
file_type	text	File type
uploaded_at	timestamptz	Upload date
file_size	int8	File size
7. Gamification

The platform tracks XP, levels, streaks, games, and challenges.

Student Activity
│
├── Lessons
├── Assessments
├── Games
└── Daily Challenges
        │
        ▼
      XP Earned
        │
        ▼
profiles
├── xp
├── level
├── streak
└── best_streak
8. Game Sessions
game_sessions

Records student game activity.

Columns
Column	Type	Description
id	uuid	Primary identifier
student_id	uuid	Student
game_id	text	Game identifier
mode	text	Game mode
difficulty	text	Difficulty
score	int4	Score
correct	int4	Correct answers
total_rounds	int4	Total rounds
best_combo	int4	Best combo
rank_letter	text	Rank
badges	text[]	Earned badges
meta	jsonb	Additional game metadata
xp_earned	int4	XP earned
played_at	timestamptz	Play date
9. Daily Challenges
daily_challenges

Stores the challenge available for a particular date.

Columns
Column	Type	Description
id	uuid	Primary identifier
module_id	uuid	Related module
question	text	Challenge question
difficulty	text	Difficulty
xp_reward	int4	XP reward
generated_at	timestamptz	Generation date
expires_at	timestamptz	Expiration date
date	date	Challenge date
topic	text	Topic
hint	text	Hint
model_answer	text	Expected answer

The date field is unique.

challenge_attempts

Stores student attempts for daily challenges.

Columns
Column	Type	Description
id	uuid	Primary identifier
challenge_id	uuid	Related challenge
student_id	uuid	Student
answer	text	Student answer
is_correct	bool	Correctness
xp_earned	int4	XP earned
attempted_at	timestamptz	Attempt date
submitted_at	timestamptz	Submission date
score_pct	int4	Score percentage
ai_feedback	text	AI-generated feedback
Relationship
daily_challenges
        │
        ▼
challenge_attempts
        ▲
        │
      profiles
10. Personalized Problems
student_problems

Stores practice problems associated with individual students.

Columns
Column	Type	Description
id	uuid	Primary identifier
student_id	uuid	Student
topic	text	Problem topic
type	text	Problem type
difficulty	text	Difficulty
title	text	Problem title
description	text	Problem description
hint	text	Optional hint
solution	text	Solution
choices	jsonb	Optional answer choices
last_attempt	text	Last attempt
is_solved	bool	Solved status
created_at	timestamptz	Creation date
11. Study Decks and Flashcards
student_decks

Represents a flashcard deck owned by a student.

Columns
Column	Type	Description
id	uuid	Primary identifier
student_id	uuid	Student
topic	text	Deck topic
title	text	Deck title
description	text	Description
card_count	int4	Number of cards
created_at	timestamptz	Creation date
deck_cards

Stores individual flashcards.

Columns
Column	Type	Description
id	uuid	Primary identifier
deck_id	uuid	Related deck
front	text	Front content
back	text	Back content
position	int4	Card order
Relationship
student_decks
      │
      ▼
  deck_cards
12. Notifications
notifications

Stores user-specific notifications.

Columns
Column	Type	Description
id	uuid	Primary identifier
user_id	uuid	Recipient
type	text	Notification type
title	text	Notification title
body	text	Notification content
link	text	Optional destination
is_read	bool	Read status
created_at	timestamptz	Creation date

Possible uses include:

New assessments
Assessment deadlines
New materials
Graded submissions
Challenge availability
XP or level milestones
13. Row Level Security

The database uses Row Level Security policies to control access.

Profiles
Anyone can view profiles.
Users can insert their own profile.
Users can update their own profile.

Ownership is based on:

auth.uid() = profiles.id
Blocks

Students can view blocks in which they are enrolled.

Teachers can manage blocks assigned to them.

The policies rely on:

is_enrolled_in_block(id)

and:

teacher_id = auth.uid()
Block Enrollments

Students can view their own enrollment.

Teachers can manage enrollments for blocks they are authorized to manage.

The authorization relies on:

is_teacher_of_block(block_id)
Assessments

Staff can:

Create assessments
Read assessments
Update their own assessments
Delete their own assessments

Students can read assessments when:

The assessment is published
The student is enrolled in the assigned block, if applicable

Students can also access assessments for which they already have a submission.

Questions and Choices

The listed policies allow staff to delete:

Questions
Choices
Submissions

Students can:

Create their own submissions
Read their own submissions
Update their own submissions while the assessment remains open

Staff can:

Read submissions
Grade submissions
Delete submissions

Assessment availability is checked through:

assessment_is_open_for_submission(assessment_id)
Materials

Authenticated users can read materials.

Teachers can insert and delete materials based on the user's role.

File Submissions

Authenticated users can read file submissions.

Students can insert file submissions when:

student_id = auth.uid()
Lessons

Lessons are publicly readable according to the current policy.

Notifications

Users can:

Read their own notifications
Update their own notifications

Authorization is based on:

auth.uid() = user_id
Game Sessions

Students can:

Insert their own game sessions
Read their own game sessions

Teachers can read game sessions belonging to students in blocks they manage.

Student Problems

Students can fully manage only their own personalized problems.

Student Decks

Students can fully manage only their own study decks.

Deck Cards

Students can manage deck cards only when the related deck belongs to them.

14. RLS Helper Functions

Several policies rely on helper functions.

is_enrolled_in_block(block_id)

Checks whether the authenticated user is enrolled in a specific block.

Current User
      │
      ▼
block_enrollments
      │
      ▼
Is user enrolled?
      │
   ┌──┴──┐
   │     │
  Yes    No
   │     │
Allow   Deny
is_teacher_of_block(block_id)

Checks whether the authenticated user is the teacher assigned to a specific block.

is_staff()

Checks whether the authenticated user has staff-level privileges.

Used for operations such as assessment and submission management.

assessment_is_open_for_submission(assessment_id)

Checks whether an assessment is currently available for submission.

15. Overall Database Relationship Map
                              ┌─────────────────┐
                              │    profiles     │
                              └────────┬────────┘
                                       │
             ┌─────────────────────────┼──────────────────────────┐
             │                         │                          │
             ▼                         ▼                          ▼
        ┌─────────┐             ┌──────────────┐          ┌──────────────┐
        │ blocks  │             │ submissions  │          │ game_sessions│
        └────┬────┘             └──────┬───────┘          └──────────────┘
             │                         │
             ▼                         ▼
     ┌─────────────────┐          ┌─────────┐
     │block_enrollments│          │ answers │
     └─────────────────┘          └─────────┘


             ┌───────────────┐
             │    modules    │
             └───────┬───────┘
                     │
          ┌──────────┼──────────────┐
          ▼          ▼              ▼
      lessons   assessments      materials
                     │
                     ▼
                 questions
                     │
                     ▼
                  choices


     ┌──────────────────┐
     │ daily_challenges │
     └────────┬─────────┘
              ▼
      challenge_attempts


     ┌───────────────┐
     │ student_decks │
     └───────┬───────┘
             ▼
        deck_cards
16. Database Relationship Summary
Parent / Source	Related Table	Relationship
profiles	blocks	One teacher can manage multiple blocks
profiles	block_enrollments	A student can have multiple enrollments
blocks	block_enrollments	A block can contain multiple students
modules	lessons	A module can contain multiple lessons
modules	assessments	A module can have multiple assessments
modules	materials	A module can contain multiple materials
modules	daily_challenges	A module can be associated with challenges
assessments	questions	An assessment contains multiple questions
questions	choices	A question can contain multiple choices
assessments	submissions	An assessment can have multiple submissions
submissions	answers	A submission contains multiple answers
submissions	file_submissions	A submission can contain uploaded files
daily_challenges	challenge_attempts	A challenge can have multiple attempts
profiles	challenge_attempts	A student can attempt multiple challenges
profiles	game_sessions	A student can have multiple game sessions
profiles	student_decks	A student can own multiple decks
student_decks	deck_cards	A deck can contain multiple cards
profiles	notifications	A user can receive multiple notifications
17. Database Summary

The database supports:

User Management
profiles
Classroom Management
blocks
block_enrollments
Learning Content
modules
lessons
materials
Assessments
assessments
questions
choices
submissions
answers
file_submissions
Progress Tracking
student_progress
Gamification
game_sessions
daily_challenges
challenge_attempts
XP, levels, and streaks in profiles
Personalized Learning
student_problems
Study Tools
student_decks
deck_cards
Communication
notifications

The schema uses Row Level Security to restrict access according to user identity, ownership, enrollment, and teacher or staff authorization.