# Qurio Learning Content

Multilingual static learning content for **Qurio**.

This repository is the content/data source for the Qurio client. It contains class-wise study material, optional subject syllabi, timed practice quizzes, and reusable preparation-plan templates for competitive/school entrance exams.

The repository contains **public learning content only**. Authentication, admin approval, learner progress, quiz attempts, selected exams, and private user state belong in the Qurio app/backend (Supabase is planned separately).

## Local Qurio Content Studio

This repository now includes a **local Express + EJS content-authoring app**. After cloning, run:

```bash
npm install
npm run studio
```

Then open `http://127.0.0.1:4310`. The Studio creates/edits study notes, quiz sets and syllabi, manages Tamil/Hindi translations, rebuilds `manifest.json`, validates content, and can edit the existing exam-plan files. See [`STUDIO.md`](STUDIO.md) for the complete workflow.

The Studio runs locally and writes directly into this repository; it is not part of the Qurio learner client and should not be deployed publicly.

## Current demo coverage

- Languages: English (`en`), Tamil (`ta`), Hindi (`hi`)
- English is canonical and fallback language
- Curriculum: `general`
- Grade demo: Grade 5
- Subjects: Mathematics, Science, English, Social Studies, Intelligence, General Knowledge
- Optional `syllabus.md` per class subject
- Markdown study notes with YAML frontmatter
- Mermaid diagrams and LaTeX/KaTeX equations
- Timed MCQ quizzes with hints, per-option feedback and explanations
- **Multiple practice sets for one chapter/topic**
- Exam catalog and exam-plan templates
- Demo exam plans for AISSEE, JNVST and RMS CET
- Daily plan, week-view data, phase plan, full syllabus, strategy and timetable model

> Exam-plan samples are demo data for Qurio development/testing. Official exam dates, eligibility, syllabus and pattern can change. Production exam content must be checked against the latest official notification before publishing.

---

# Core design rules

## 1. Language changes presentation, not identity

The same lesson/quiz/exam-plan translated into different languages keeps the same logical IDs.

```text
en/.../equivalent-fractions.md
ta/.../equivalent-fractions.md
hi/.../equivalent-fractions.md
```

All use:

```yaml
id: math-05-equivalent-fractions
```

Keep these stable across translations:

- content ID
- syllabus ID
- quiz ID
- quiz series ID
- question ID
- option ID
- chapter/topic ID
- exam ID
- exam-plan ID
- phase ID
- day task ID

This makes learner state language-independent.

## 2. English is canonical/fallback

When `ta` or `hi` is unavailable for an item, Qurio should load the English version instead of failing.

## 3. Paths are language-independent in the manifest

Manifest:

```json
{
  "path": "grade-05/mathematics/notes/fractions/equivalent-fractions.md",
  "languages": ["en", "ta", "hi"]
}
```

Client URL:

```text
{CONTENT_BASE_URL}/{resolvedLanguage}/{item.path}
```

## 4. Progress uses logical IDs, cache uses language + ID

Progress:

```text
contentId = math-05-equivalent-fractions
```

Cache:

```text
ta:math-05-equivalent-fractions
```

A learner may study in English, switch to Tamil, and still retain completion.

---

# Repository structure

```text
qurio-learning-content/
│
├── README.md
├── manifest.json
├── .nojekyll
│
├── schemas/
│   ├── quiz.schema.json
│   ├── exam-plan.schema.json
│   └── exam-calendar.schema.json
│
├── en/
│   ├── grade-05/
│   │   ├── mathematics/
│   │   │   ├── syllabus.md
│   │   │   ├── notes/
│   │   │   │   └── fractions/
│   │   │   │       └── equivalent-fractions.md
│   │   │   └── quizzes/
│   │   │       ├── equivalent-fractions-01.json
│   │   │       ├── equivalent-fractions-02.json
│   │   │       └── equivalent-fractions-03.json
│   │   ├── science/
│   │   ├── english/
│   │   ├── social-studies/
│   │   └── intelligence/
│   │
│   └── exams/
│       ├── aissee/
│       │   └── class-06/
│       │       └── 2027/
│       │           ├── overview.md
│       │           ├── syllabus.md
│       │           ├── strategy.md
│       │           ├── plan.json
│       │           └── calendar/
│       │               └── 2026-09.json
│       ├── jnvst/
│       └── rms-cet/
│
├── ta/
│   └── ...same relative structure as en...
│
└── hi/
    └── ...same relative structure as en...
```

There is intentionally **no `examples/` folder**. Qurio UI translations belong in the app repository under `src/assets/i18n/`, not in this content repository.

---

# Root `manifest.json`

The manifest is the only discovery/index file the app should need at startup.

Qurio must not use the GitHub REST API to browse folders.

Current top-level contract:

```json
{
  "schemaVersion": 2,
  "contentVersion": "2026.09.05-demo.2",
  "defaultLanguage": "en",
  "fallbackLanguage": "en",
  "supportedLanguages": [],
  "curricula": [],
  "grades": [],
  "subjects": [],
  "exams": [],
  "examPlans": [],
  "items": []
}
```

## `items`

`items` contains normal class-learning content:

- `syllabus`
- `note`
- `quiz`

Manifest v2 includes explicit `grade`, `subject`, `chapter`, and `topic` metadata where relevant. The client should use those fields rather than parsing paths.

Example note:

```json
{
  "id": "math-05-equivalent-fractions",
  "type": "note",
  "path": "grade-05/mathematics/notes/fractions/equivalent-fractions.md",
  "languages": ["en", "ta", "hi"],
  "curriculum": "general",
  "grade": 5,
  "subject": "mathematics",
  "chapter": "fractions",
  "topic": "equivalent-fractions"
}
```

Example quiz set:

```json
{
  "id": "math-05-equivalent-fractions-02",
  "type": "quiz",
  "path": "grade-05/mathematics/quizzes/equivalent-fractions-02.json",
  "languages": ["en", "ta", "hi"],
  "grade": 5,
  "subject": "mathematics",
  "chapter": "fractions",
  "topic": "equivalent-fractions",
  "seriesId": "math-05-equivalent-fractions-practice",
  "setNumber": 2,
  "sourceNoteIds": ["math-05-equivalent-fractions"]
}
```

---

# Class-wise subject content

Use lowercase kebab-case.

```text
{language}/grade-05/{subject}/
├── syllabus.md
├── notes/{chapter}/{topic}.md
└── quizzes/{topic}-{setNumber}.json
```

Examples:

```text
en/grade-05/mathematics/notes/fractions/equivalent-fractions.md
ta/grade-05/mathematics/notes/fractions/equivalent-fractions.md
hi/grade-05/mathematics/notes/fractions/equivalent-fractions.md
```

---

# Optional subject syllabus

A subject may have one optional syllabus file:

```text
{language}/grade-05/{subject}/syllabus.md
```

Example frontmatter:

```yaml
---
id: syllabus-general-05-mathematics
type: syllabus
title: Mathematics — Grade 5 Syllabus
language: en
curriculum: general
grade: 5
subject: mathematics
optional: true
version: 1
updatedAt: '2026-09-05'
---
```

If the syllabus item is absent from `manifest.json`, Qurio should hide the syllabus action. A missing optional syllabus is not an error.

---

# Study-note format

Study notes are Markdown + YAML frontmatter.

```yaml
---
id: math-05-equivalent-fractions
type: note
title: Equivalent Fractions
language: en
curriculum: general
grade: 5
subject: mathematics
chapter: fractions
topic: equivalent-fractions
order: 1
difficulty: beginner
estimatedMinutes: 10
quizIds:
- math-05-equivalent-fractions-01
- math-05-equivalent-fractions-02
- math-05-equivalent-fractions-03
tags:
- fractions
- equivalent-fractions
version: 2
updatedAt: '2026-09-05'
---
```

## Stable fields

Keep these logically identical across translations:

```text
id
type
curriculum
grade
subject
chapter
topic
order
difficulty
quizIds
version
```

Translate human-readable text such as `title` and Markdown body.

---

# Markdown, Mermaid and LaTeX

Normal Markdown is supported.

Inline math:

```markdown
The fraction $\frac{1}{2}$ represents one half.
```

Display math:

```markdown
$$
\frac{1}{2} = \frac{2}{4} = \frac{3}{6}
$$
```

Mermaid:

````markdown
```mermaid
flowchart LR
    A[Learn] --> B[Practice]
    B --> C[Review]
```
````

The Qurio app should sanitize downloaded Markdown and must not execute arbitrary scripts.

---

# Multiple practice quizzes for one chapter/topic

Qurio now supports any number of quiz sets for one logical topic.

Example:

```text
equivalent-fractions-01.json
equivalent-fractions-02.json
equivalent-fractions-03.json
```

IDs:

```text
math-05-equivalent-fractions-01
math-05-equivalent-fractions-02
math-05-equivalent-fractions-03
```

All belong to the same series:

```json
"seriesId": "math-05-equivalent-fractions-practice"
```

and carry:

```json
"setNumber": 2,
"setLabel": "Practice Set 2"
```

`seriesId` and `setNumber` are language-independent. `setLabel` is localized.

A note can advertise all related quizzes through `quizIds`.

## Why `seriesId` exists

The client can render:

```text
Equivalent Fractions

Practice Set 1
Practice Set 2
Challenge Set 3
```

without assuming one quiz per chapter.

Later you can add:

```text
- revision sets
- challenge sets
- chapter tests
- mock tests
```

while keeping stable IDs.

---

# Quiz JSON contract

```json
{
  "schemaVersion": 2,
  "id": "math-05-equivalent-fractions-02",
  "type": "quiz",
  "language": "en",
  "curriculum": "general",
  "grade": 5,
  "subject": "mathematics",
  "chapter": "fractions",
  "topic": "equivalent-fractions",
  "seriesId": "math-05-equivalent-fractions-practice",
  "setNumber": 2,
  "setLabel": "Practice Set 2",
  "title": "Equivalent Fractions — Practice Set 2",
  "difficulty": "intermediate",
  "timeLimitSeconds": 300,
  "passingPercentage": 70,
  "shuffleQuestions": true,
  "shuffleOptions": true,
  "sourceNoteIds": ["math-05-equivalent-fractions"],
  "questions": []
}
```

Each question:

```json
{
  "id": "q1",
  "type": "single-choice",
  "question": "...",
  "hint": "...",
  "options": [
    {
      "id": "A",
      "text": "...",
      "feedback": "Why this option is correct or incorrect"
    }
  ],
  "correctOption": "B",
  "explanation": "Overall explanation"
}
```

Across translations preserve:

- quiz ID
- series ID
- set number
- question count/order identities
- question IDs
- option IDs
- correctOption
- scoring/timer behavior

The app may shuffle display order, but must compare answers by stable option ID.

---

# Exam catalog

`manifest.json` now includes `exams`.

Example:

```json
{
  "id": "aissee",
  "shortName": "AISSEE",
  "label": {
    "en": "Sainik School Entrance",
    "ta": "...",
    "hi": "..."
  },
  "fullName": {},
  "category": "school-entrance",
  "officialInfoUrl": "https://exams.nta.ac.in/AISSEE/"
}
```

The exam catalog is language-neutral metadata with localized labels.

The current demo contains three exam families so the client can test an exam selector:

- AISSEE
- JNVST
- RMS CET

The schema is intentionally generic. Future plans can represent other Indian examinations without changing the core structure.

---

# Exam-plan folders

Localized exam preparation content lives outside grade subject folders:

```text
{language}/exams/{examId}/class-06/2027/
├── overview.md
├── syllabus.md
├── strategy.md
├── plan.json
└── calendar/
    └── 2026-09.json
```

Why separate it from `grade-05`?

A class note is reusable educational content. An exam plan is a preparation overlay that can reference reusable notes/quizzes but has its own timeline, phases and strategy.

Do not duplicate ordinary notes under every exam unless content is genuinely exam-specific.

---

# `examPlans` manifest entries

```json
{
  "id": "aissee-2027-class-06-demo",
  "examId": "aissee",
  "entryClass": 6,
  "examYear": 2027,
  "path": "exams/aissee/class-06/2027/plan.json",
  "languages": ["en", "ta", "hi"],
  "demo": true
}
```

The path is again language-independent.

Fetch:

```text
{baseUrl}/{language}/{examPlan.path}
```

---

# Exam plan JSON

`plan.json` contains stable plan metadata and phase definitions.

Important fields:

```json
{
  "id": "aissee-2027-class-06-demo",
  "type": "exam-plan",
  "examId": "aissee",
  "language": "en",
  "title": "AISSEE 2027 — Daily Battle Plan",
  "entryClass": 6,
  "examYear": 2027,
  "demo": true,
  "officialSchedule": false,
  "planStartDate": "2026-04-01",
  "planEndDate": "2027-01-31",
  "targetDate": "2027-01-31",
  "contentRefs": {
    "overview": "overview.md",
    "syllabus": "syllabus.md",
    "strategy": "strategy.md"
  },
  "phases": [],
  "calendarFiles": ["calendar/2026-09.json"]
}
```

`targetDate` in demo plans is a **planning target**, not an asserted official examination date. Production data should only mark an official date after verification.

## Plan tabs mapped to the screenshot-style UI

The client can implement:

```text
Today        -> calendar month file, matching today's date
Week View    -> calendar days grouped by weekNumber
Phase Plan   -> plan.phases
Full Syllabus-> syllabus.md
Strategy     -> strategy.md
Progress     -> calculated from learner state
```

Countdown chips such as days/months remaining should be **calculated by the client** from `targetDate`; do not store precomputed values in content.

---

# Monthly calendar shards

Do not create one huge multi-year plan JSON.

Use month files:

```text
calendar/2026-04.json
calendar/2026-05.json
...
calendar/2026-09.json
```

and list them in `plan.json`.

This allows Qurio to fetch only the month required for Today/Week View.

Demo files contain 4, 5 and 6 September 2026 so previous/today/next navigation can be tested.

---

# Daily plan contract

A day contains:

```json
{
  "date": "2026-09-05",
  "phaseId": "phase-3",
  "weekNumber": 22,
  "topics": [],
  "revision": [],
  "practiceQuizIds": [],
  "studyMaterialIds": [],
  "timetable": []
}
```

## `topics`

New learning for the day:

```json
{
  "id": "topic-1",
  "subjectId": "science",
  "title": "Ecosystem & Food Chain",
  "activityType": "new-learning",
  "details": "New concept + examples + practice",
  "contentId": "sci-05-photosynthesis"
}
```

`contentId` is optional. When present, the client may open the linked Qurio note. When absent, the row is still a valid informational plan task.

## `revision`

Use:

```json
"activityType": "spaced-recall"
```

This supports a dedicated Revision section like the reference screenshot.

## `practiceQuizIds`

A day can reference one or many quizzes:

```json
[
  "math-05-equivalent-fractions-01",
  "math-05-equivalent-fractions-02"
]
```

This works naturally with multiple practice sets per chapter.

## `studyMaterialIds`

Links to ordinary Qurio notes that should be surfaced as daily study material.

## `timetable`

```json
{
  "id": "time-1",
  "startTime": "06:00",
  "endTime": "06:30",
  "title": "Morning run + exercise"
}
```

The timetable is content/template data. Whether a learner completed it is user state and must not be written back to GitHub.

---

# Exam overview, syllabus and strategy Markdown

These use normal YAML frontmatter.

Example:

```yaml
---
id: aissee-2027-class-06-strategy
type: exam-strategy
title: AISSEE 2027 — Strategy
language: en
examId: aissee
entryClass: 6
examYear: 2027
demo: true
version: 1
updatedAt: '2026-09-05'
---
```

Supported types in the demo:

```text
exam-overview
exam-syllabus
exam-strategy
```

These documents may use Mermaid and LaTeX exactly like normal study notes.

---

# Learner state for exam plans

Do not store completion inside `plan.json`.

Static plan:

```text
planId + date + taskId
```

User state later:

```text
userId
planId
date
taskId
completed
completedAt
```

Recommended stable local/Supabase key concept:

```text
aissee-2027-class-06-demo:2026-09-05:topic-1
```

Similarly save:

- selected exam plan
- daily task completion
- quiz attempts
- note completion
- phase progress

outside this repository.

The Progress tab should derive values rather than storing aggregate percentages in static content.

---

# Supporting many Indian exams

Do not hardcode `AISSEE` routes/components.

The client should render exam selection from:

```text
manifest.exams
manifest.examPlans
```

The generic hierarchy is:

```text
Exam
  -> entry/class/level when relevant
  -> exam year / attempt
  -> preparation plan
  -> phases
  -> month calendar
  -> day
```

Not every future examination needs `entryClass`. If Qurio later targets exams such as undergraduate/professional/government recruitment exams, evolve the plan profile with optional fields such as `level`, `attempt`, or `targetCategory` instead of forcing school-grade semantics everywhere.

---

# Adding another exam

1. Add an exam catalog entry in `manifest.json`.
2. Choose a stable machine ID, e.g. `some-exam`.
3. Create the English canonical plan first.
4. Add Tamil/Hindi at identical relative paths.
5. Preserve plan/phase/task IDs across translations.
6. Add `examPlans` manifest entry.
7. Create `overview.md`, `syllabus.md`, `strategy.md`, `plan.json`.
8. Add monthly calendar shards.
9. Validate all referenced `contentId` and `quizId` values.
10. Mark demo/unverified data clearly until checked against official sources.

---

# Adding another quiz set

For a fourth Equivalent Fractions set:

```text
en/grade-05/mathematics/quizzes/equivalent-fractions-04.json
ta/grade-05/mathematics/quizzes/equivalent-fractions-04.json
hi/grade-05/mathematics/quizzes/equivalent-fractions-04.json
```

Use:

```json
"id": "math-05-equivalent-fractions-04",
"seriesId": "math-05-equivalent-fractions-practice",
"setNumber": 4
```

Add the quiz ID to the study note's `quizIds` and add a manifest item.

Never recycle a published quiz ID for a completely different set after learner attempts exist.

---

# Language fallback

For any normal item or exam plan:

```text
requested language exists?
  yes -> requested language
  no  -> manifest.fallbackLanguage (en)
```

Return metadata to the client:

```text
requestedLanguage
resolvedLanguage
fallbackUsed
```

so the UI can tell the learner that English fallback is being shown.

---

# Static hosting

Current GitHub repository:

```text
https://github.com/actionanand/qurio-learning-content
```

Current default branch:

```text
master
```

GitHub Raw base:

```text
https://raw.githubusercontent.com/actionanand/qurio-learning-content/master
```

Manifest:

```text
{CONTENT_BASE_URL}/manifest.json
```

Keep the client dependent only on `CONTENT_BASE_URL`, so the same files can later be served through GitHub Pages or another static CDN.

`.nojekyll` is included for GitHub Pages static-file publishing.

---

# Content versioning

Root manifest:

```json
"contentVersion": "2026.09.05-demo.2"
```

Use this for broad update/cache detection.

Each note/quiz/plan also has its own `version`.

Do not change stable IDs merely because the title or wording changes.

---

# Validation rules

Before publishing, validate at least:

- every JSON file parses
- manifest paths exist for every listed language
- frontmatter IDs match logical IDs
- language field matches language folder
- translated quiz IDs match
- translated quiz series IDs/set numbers match
- question IDs match across translations
- option IDs match across translations
- `correctOption` matches across translations
- every correct option exists
- every quiz source note exists
- every note `quizIds` entry exists
- every exam plan listed in manifest exists in each declared language
- plan IDs and phase IDs match across translations
- every listed calendar file exists
- calendar `planId` matches its parent plan
- linked `contentId`/`quizId` values exist when provided

Schemas under `schemas/` provide a starting point for GitHub Actions validation.

---

# Security and data ownership

Everything in this public repository should be considered public, including:

- study notes
- quiz questions
- correct answers
- explanations
- exam plans
- strategies
- timetable templates

Do not store:

```text
email
password
userId
approval status
completed flags
scores
private learner profile
```

Those belong in Qurio/Supabase.

---

# Recommended authoring workflow

```text
1. Write/review English canonical content
2. Freeze stable IDs
3. Translate to Tamil
4. Translate to Hindi
5. Preserve IDs and answer logic
6. Update manifest
7. Increment contentVersion
8. Validate schemas/references
9. Commit
10. Qurio refreshes from manifest
```

For exam data, add an additional verification step against current official information before removing demo/unverified flags.

---

# Client fetch flow

Normal learning:

```text
manifest.json
  -> grade
  -> subject
  -> syllabus / notes / quiz series
  -> selected language/fallback
  -> Markdown or JSON
```

Exam preparation:

```text
manifest.json
  -> exams
  -> selected exam plan
  -> localized plan.json
  -> Today / Week / Phase
  -> overview / syllabus / strategy
  -> linked notes + one or more quiz sets
```

User progress remains a separate layer.

---

# Demo files to test first

## Multiple quiz sets

```text
en/grade-05/mathematics/quizzes/equivalent-fractions-01.json
en/grade-05/mathematics/quizzes/equivalent-fractions-02.json
en/grade-05/mathematics/quizzes/equivalent-fractions-03.json
```

Equivalent `ta` and `hi` files are included.

## Exam plan

```text
en/exams/aissee/class-06/2027/plan.json
en/exams/aissee/class-06/2027/calendar/2026-09.json
en/exams/aissee/class-06/2027/syllabus.md
en/exams/aissee/class-06/2027/strategy.md
```

Equivalent Tamil and Hindi versions are included.

The same plan structure is also provided for JNVST and RMS CET, allowing the Qurio client to test switching between different exams without hardcoding a single examination.
