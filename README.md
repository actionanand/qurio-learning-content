# Qurio Learning Content

Multilingual study notes, optional syllabi, and timed practice quiz content for **Qurio**.

This repository is designed to be a **static content source**. Qurio can fetch these files directly from GitHub Raw, GitHub Pages, or any static CDN. Authentication and private user progress should live in the Qurio application/backend, not in this repository.

## Repository name

Recommended GitHub repository name:

```text
qurio-learning-content
```

Recommended GitHub description:

> Multilingual study notes, syllabi, and practice quiz content for Qurio.

Why this name:

- clearly belongs to **Qurio**
- says exactly what the repository contains
- does not tie the content to one school board, grade, or language
- can scale later to more grades, subjects, curricula, and languages

---

## Demo coverage

This starter repository contains working sample content for:

- Languages: **English (`en`)**, **Tamil (`ta`)**, **Hindi (`hi`)**
- Curriculum: **General**
- Grade: **5**
- Subjects:
  - Mathematics
  - Science
  - English
  - Social Studies
  - Intelligence
- Each subject contains:
  - optional `syllabus.md`
  - one study note
  - one timed practice quiz
- Study notes demonstrate:
  - Markdown
  - YAML frontmatter
  - Mermaid diagrams
  - LaTeX/KaTeX mathematics
- Quizzes demonstrate:
  - multiple-choice questions
  - timer
  - pass percentage
  - hints
  - feedback for every option
  - correct-answer explanation
  - question and option shuffling

The demo intentionally uses the **same logical IDs across all translations** so progress remains language-independent.

---

## Important design rule

> **Language changes presentation, not content identity.**

English, Tamil, and Hindi translations of the same lesson or quiz must use the **same content ID**.

Example:

```text
en/.../equivalent-fractions.md
ta/.../equivalent-fractions.md
hi/.../equivalent-fractions.md
```

All three files use:

```yaml
id: math-05-equivalent-fractions
```

This means a learner can:

1. complete the lesson in English,
2. switch Qurio to Tamil,
3. still see that lesson as completed.

The same rule applies to:

- syllabus IDs
- note IDs
- quiz IDs
- question IDs
- option IDs
- subject IDs
- chapter IDs
- topic IDs

Only human-readable text is translated.

---

# Repository structure

```text
qurio-learning-content/
│
├── README.md
├── manifest.json
│
├── schemas/
│   └── quiz.schema.json
│
├── examples/
│   ├── app-i18n-en.json
│   ├── app-i18n-ta.json
│   └── app-i18n-hi.json
│
├── en/
│   └── grade-05/
│       ├── mathematics/
│       │   ├── syllabus.md
│       │   ├── notes/
│       │   │   └── fractions/
│       │   │       └── equivalent-fractions.md
│       │   └── quizzes/
│       │       └── equivalent-fractions-01.json
│       │
│       ├── science/
│       │   ├── syllabus.md
│       │   ├── notes/
│       │   │   └── plants/
│       │   │       └── photosynthesis.md
│       │   └── quizzes/
│       │       └── photosynthesis-01.json
│       │
│       ├── english/
│       │   ├── syllabus.md
│       │   ├── notes/
│       │   │   └── grammar/
│       │   │       └── nouns.md
│       │   └── quizzes/
│       │       └── nouns-01.json
│       │
│       ├── social-studies/
│       │   ├── syllabus.md
│       │   ├── notes/
│       │   │   └── geography/
│       │   │       └── directions-and-maps.md
│       │   └── quizzes/
│       │       └── directions-and-maps-01.json
│       │
│       └── intelligence/
│           ├── syllabus.md
│           ├── notes/
│           │   └── patterns/
│           │       └── number-patterns.md
│           └── quizzes/
│               └── number-patterns-01.json
│
├── ta/
│   └── grade-05/
│       └── ...same relative structure as `en`...
│
└── hi/
    └── grade-05/
        └── ...same relative structure as `en`...
```

## Why language is the top-level folder

The language prefix makes static fetching simple:

```text
{baseUrl}/{language}/{relativeContentPath}
```

For example:

```text
{baseUrl}/en/grade-05/mathematics/notes/fractions/equivalent-fractions.md
{baseUrl}/ta/grade-05/mathematics/notes/fractions/equivalent-fractions.md
{baseUrl}/hi/grade-05/mathematics/notes/fractions/equivalent-fractions.md
```

The relative path after the language should remain identical for all translations.

---

# Naming conventions

Use lowercase **kebab-case** for directories and filenames.

Good:

```text
social-studies
equivalent-fractions
directions-and-maps
grade-05
```

Avoid:

```text
Social Studies
Equivalent_Fractions
grade5
Grade-5
```

## Language codes

Use standard short codes:

```text
en  English
ta  Tamil
hi  Hindi
```

English is the canonical and fallback language.

## Grade folders

Use zero-padded grade identifiers:

```text
grade-01
grade-02
grade-03
...
grade-12
```

The machine value in frontmatter remains numeric:

```yaml
grade: 5
```

---

# Curriculum

The starter repository uses:

```yaml
curriculum: general
```

This lets Qurio start without being tied to a particular board.

The schema can later support:

```text
general
ncert
cbse
icse
tn-state-board
karnataka-state-board
```

Do not put curriculum names into note or quiz IDs unless two curricula genuinely contain different logical content that must be tracked separately.

---

# Subject layout

A grade-scoped subject follows:

```text
{language}/
└── grade-05/
    └── mathematics/
        ├── syllabus.md
        ├── notes/
        │   └── fractions/
        │       └── equivalent-fractions.md
        └── quizzes/
            └── equivalent-fractions-01.json
```

The current demo treats Intelligence as grade-scoped for easier app testing.

Qurio can later support non-grade learning trees such as:

```text
levels/
├── beginner/
├── intermediate/
└── advanced/
```

without changing the ID principles in this repository.

---

# Optional syllabus

Yes, Qurio can have **one optional syllabus Markdown file per subject**.

Location:

```text
{language}/grade-05/{subject}/syllabus.md
```

Example:

```text
en/grade-05/mathematics/syllabus.md
ta/grade-05/mathematics/syllabus.md
hi/grade-05/mathematics/syllabus.md
```

If `syllabus.md` does not exist, the app should simply hide the **Syllabus** action/tab for that subject.

Do not treat a missing syllabus as an error.

## Syllabus frontmatter

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
updatedAt: 2026-09-05
---
```

### Syllabus field reference

| Field | Required | Meaning |
|---|---|---|
| `id` | Yes | Stable language-independent syllabus ID |
| `type` | Yes | Must be `syllabus` |
| `title` | Yes | Localized display title |
| `language` | Yes | `en`, `ta`, `hi`, etc. |
| `curriculum` | Yes | Curriculum machine ID |
| `grade` | Yes | Numeric grade |
| `subject` | Yes | Stable subject machine ID |
| `optional` | Recommended | Use `true` |
| `version` | Yes | Increment when content changes materially |
| `updatedAt` | Yes | ISO date `YYYY-MM-DD` |

The body is normal Markdown and can contain chapter lists, learning goals, tables, links, Mermaid, and LaTeX if needed.

---

# Study note format

Study material is written as Markdown with YAML frontmatter.

Example:

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
tags:
  - fractions
  - equivalent-fractions
version: 1
updatedAt: 2026-09-05
---
```

Then normal Markdown follows.

## Study-note frontmatter reference

| Field | Required | Meaning |
|---|---|---|
| `id` | Yes | Stable language-independent lesson ID |
| `type` | Yes | Must be `note` |
| `title` | Yes | Localized lesson title |
| `language` | Yes | Translation language |
| `curriculum` | Yes | Curriculum machine ID |
| `grade` | Yes | Numeric grade |
| `subject` | Yes | Stable subject ID |
| `chapter` | Yes | Stable chapter ID |
| `topic` | Yes | Stable topic ID |
| `order` | Yes | Display order inside chapter |
| `difficulty` | Recommended | `beginner`, `intermediate`, `advanced` |
| `estimatedMinutes` | Recommended | Estimated study time |
| `quizIds` | Optional | Quizzes related to the note |
| `tags` | Optional | Search/filter metadata |
| `version` | Yes | Local content revision |
| `updatedAt` | Yes | ISO date |

## Stable vs translated frontmatter

Keep these identical across languages:

```yaml
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

Translate/change these where appropriate:

```yaml
title
language
```

Tags should preferably use stable machine-friendly values so search/filter logic is predictable.

---

# Markdown features

Qurio study notes are expected to support ordinary Markdown plus Mermaid and LaTeX.

## LaTeX / KaTeX

Inline mathematics:

```markdown
The fraction $\frac{1}{2}$ represents one half.
```

Display mathematics:

```markdown
$$
\frac{1}{2} = \frac{2}{4}
$$
```

More complex example:

```markdown
$$
a \times d = b \times c
$$
```

Recommended app renderer:

```text
Markdown parser -> KaTeX
```

## Mermaid

Use fenced Mermaid blocks:

````markdown
```mermaid
flowchart LR
    A["Start"] --> B["Learn"]
    B --> C["Practice"]
    C --> D["Progress"]
```
````

The demo notes include Mermaid in all three languages so the application can test Unicode labels.

Recommended rendering flow:

```text
Markdown
   ↓
detect mermaid code block
   ↓
Mermaid.js
   ↓
SVG
```

Do not execute arbitrary HTML or JavaScript from Markdown.

---

# Quiz format

Quiz files are JSON.

Example:

```json
{
  "schemaVersion": 1,
  "id": "math-05-equivalent-fractions-01",
  "type": "quiz",
  "language": "en",
  "curriculum": "general",
  "grade": 5,
  "subject": "mathematics",
  "chapter": "fractions",
  "topic": "equivalent-fractions",
  "title": "Equivalent Fractions — Practice",
  "description": "A short timed practice quiz with hints and answer explanations.",
  "difficulty": "beginner",
  "timeLimitSeconds": 180,
  "passingPercentage": 70,
  "shuffleQuestions": true,
  "shuffleOptions": true,
  "sourceNoteIds": [
    "math-05-equivalent-fractions"
  ],
  "version": 1,
  "updatedAt": "2026-09-05",
  "questions": []
}
```

## Quiz-level field reference

| Field | Required | Meaning |
|---|---|---|
| `schemaVersion` | Yes | JSON structure version |
| `id` | Yes | Stable language-independent quiz ID |
| `type` | Yes | Must be `quiz` |
| `language` | Yes | Translation language |
| `curriculum` | Yes | Curriculum ID |
| `grade` | Yes | Numeric grade |
| `subject` | Yes | Subject ID |
| `chapter` | Yes | Chapter ID |
| `topic` | Yes | Topic ID |
| `title` | Yes | Localized quiz title |
| `description` | Recommended | Localized description |
| `difficulty` | Recommended | Difficulty |
| `timeLimitSeconds` | Yes | Total quiz timer |
| `passingPercentage` | Yes | Pass mark from 0–100 |
| `shuffleQuestions` | Recommended | Randomize question order |
| `shuffleOptions` | Recommended | Randomize display order of options |
| `sourceNoteIds` | Recommended | Related lesson IDs |
| `version` | Yes | Quiz revision |
| `updatedAt` | Yes | ISO date |
| `questions` | Yes | Question array |

---

# Question format

Each question is currently a single-answer multiple-choice question.

```json
{
  "id": "q1",
  "type": "single-choice",
  "question": "Which fraction is equivalent to 1/2?",
  "hint": "Multiply the numerator and denominator by the same number.",
  "options": [
    {
      "id": "A",
      "text": "2/3",
      "feedback": "2/3 is greater than 1/2."
    },
    {
      "id": "B",
      "text": "2/4",
      "feedback": "Correct. 1×2 / 2×2 = 2/4."
    }
  ],
  "correctOption": "B",
  "explanation": "2/4 is equivalent to 1/2 because both parts were multiplied by 2."
}
```

## Question field reference

| Field | Required | Meaning |
|---|---|---|
| `id` | Yes | Stable ID inside this logical quiz |
| `type` | Yes | Currently `single-choice` |
| `question` | Yes | Localized question text |
| `hint` | Recommended | Optional learner hint |
| `options` | Yes | Answer choices |
| `correctOption` | Yes | ID of the correct option |
| `explanation` | Yes | Explanation shown after answering/review |

## Option field reference

| Field | Required | Meaning |
|---|---|---|
| `id` | Yes | Stable option ID |
| `text` | Yes | Localized option text |
| `feedback` | Yes | Why this choice is correct or incorrect |

The option-specific `feedback` is important because Qurio can explain **why the learner's selected answer is wrong**, instead of only showing the correct answer.

---

# Translation rules for quizzes

English:

```json
{
  "id": "q1",
  "correctOption": "B"
}
```

Tamil and Hindi translations of the same question must still use:

```json
{
  "id": "q1",
  "correctOption": "B"
}
```

Do **not** reorder IDs while translating.

Even when `shuffleOptions` is `true`, the app should shuffle the display order, not alter option identity.

For the same logical quiz, all translations should preserve:

```text
quiz id
question ids
option ids
correctOption
question count
scoring behavior
time limit
passing percentage
```

Only the visible language changes.

This makes attempts and progress comparable across languages.

---

# Timer behaviour

`timeLimitSeconds` applies to the entire quiz.

Example:

```json
"timeLimitSeconds": 180
```

means:

```text
3 minutes
```

Recommended app behaviour:

1. start countdown when the learner begins,
2. keep current quiz answers in local state,
3. auto-submit when the timer reaches zero,
4. save one quiz-attempt record after submission,
5. do not write to the remote database after every question.

---

# Practice answer behaviour

Recommended Qurio practice flow:

```text
Question
   ↓
Learner selects option
   ↓
Show Correct / Incorrect
   ↓
Show selected option's feedback
   ↓
Show correct answer
   ↓
Show overall explanation
   ↓
Next question
```

For a stricter **Test Mode**, Qurio can delay all feedback until final submission while reusing the same JSON content.

---

# Manifest

`manifest.json` is the discovery/index file for the app.

The app should fetch the manifest first instead of guessing which files exist.

Example structure:

```json
{
  "schemaVersion": 1,
  "contentVersion": "2026.09.05-demo.1",
  "defaultLanguage": "en",
  "fallbackLanguage": "en",
  "supportedLanguages": [],
  "curricula": [],
  "grades": [],
  "subjects": [],
  "items": []
}
```

Each item stores a **language-independent relative path**:

```json
{
  "id": "math-05-equivalent-fractions",
  "type": "note",
  "path": "grade-05/mathematics/notes/fractions/equivalent-fractions.md",
  "languages": [
    "en",
    "ta",
    "hi"
  ]
}
```

Qurio then builds:

```text
{baseUrl}/{selectedLanguage}/{item.path}
```

## Why paths in manifest do not contain language

This lets one manifest entry represent every translation.

It also makes fallback simple:

```text
selected language = ta

item languages contains ta?
    yes -> /ta/{path}
    no  -> /en/{path}
```

---

# Language fallback

English is the canonical fallback.

Recommended logic:

```text
User selects Tamil
      ↓
Manifest says Tamil exists?
      ├─ Yes -> fetch Tamil
      └─ No  -> fetch English
```

The app may show a small message such as:

> This content is currently available in English.

A missing translation should not make the lesson unusable.

---

# Progress identity

Remote learner progress should use the logical content IDs, not localized file paths.

Correct:

```text
user_id
content_id = math-05-equivalent-fractions
completed = true
```

Avoid:

```text
content_id = ta/grade-05/mathematics/...
```

Similarly:

```text
quiz_id = math-05-equivalent-fractions-01
```

not a language-specific ID.

The language can optionally be saved as analytics:

```text
language_used = ta
```

but should not determine whether the lesson or quiz is completed.

---

# Offline/cache identity

Cache identity **should** include language because the file contents differ.

Recommended cache key:

```text
{language}:{contentId}
```

Examples:

```text
en:math-05-equivalent-fractions
ta:math-05-equivalent-fractions
hi:math-05-equivalent-fractions
```

So:

```text
Progress ID = language-independent
Cache ID    = language-aware
```

---

# Content versions

Two levels of versions are included.

## Repository content version

In `manifest.json`:

```json
"contentVersion": "2026.09.05-demo.1"
```

Use this for broad cache/update detection.

## Individual item version

In note frontmatter or quiz JSON:

```yaml
version: 1
```

or:

```json
"version": 1
```

Increment the item version when its content changes materially.

Example:

```text
fix typo only                  -> version may remain 1
change explanation significantly -> version 2
change correct answer            -> version 2
replace question logic           -> version 2
```

For production, decide one consistent team policy and document it.

---

# Adding a new study note

Example: Grade 5 Mathematics > Geometry > Angles.

Create the English canonical file first:

```text
en/grade-05/mathematics/notes/geometry/angles.md
```

Choose a stable ID:

```yaml
id: math-05-angles
```

Then add translations at the identical relative path:

```text
ta/grade-05/mathematics/notes/geometry/angles.md
hi/grade-05/mathematics/notes/geometry/angles.md
```

All three use:

```yaml
id: math-05-angles
chapter: geometry
topic: angles
```

Then add one `manifest.json` item:

```json
{
  "id": "math-05-angles",
  "type": "note",
  "path": "grade-05/mathematics/notes/geometry/angles.md",
  "languages": ["en", "ta", "hi"]
}
```

If only English exists:

```json
"languages": ["en"]
```

---

# Adding a new quiz

Create:

```text
en/grade-05/mathematics/quizzes/angles-01.json
```

Then translations:

```text
ta/grade-05/mathematics/quizzes/angles-01.json
hi/grade-05/mathematics/quizzes/angles-01.json
```

Use the same logical ID in all files:

```json
"id": "math-05-angles-01"
```

Question/option IDs must also match.

Add it to `manifest.json`.

Then connect the study note to it:

```yaml
quizIds:
  - math-05-angles-01
```

---

# Adding another quiz set for the same topic

Use:

```text
angles-01.json
angles-02.json
angles-03.json
```

IDs:

```text
math-05-angles-01
math-05-angles-02
math-05-angles-03
```

This allows:

```text
Practice Set 1
Practice Set 2
Challenge Set
```

without changing the lesson ID.

---

# App UI translations

The three files under:

```text
examples/
```

are only small examples of Qurio UI translation JSON.

For the real Qurio application, UI translations should live in the **app repository**, for example:

```text
qurio/
└── src/
    └── assets/
        └── i18n/
            ├── en.json
            ├── ta.json
            └── hi.json
```

Do **not** make the application download critical UI translations from this learning-content repository.

Keep:

```text
App UI translation -> Qurio app repo
Learning content    -> qurio-learning-content repo
```

separate.

---

# Fetching from GitHub Raw

After pushing this repository to GitHub, a base URL can be configured in Qurio.

Example pattern:

```text
https://raw.githubusercontent.com/{owner}/qurio-learning-content/main
```

Manifest:

```text
{baseUrl}/manifest.json
```

Tamil note:

```text
{baseUrl}/ta/grade-05/mathematics/notes/fractions/equivalent-fractions.md
```

Hindi quiz:

```text
{baseUrl}/hi/grade-05/mathematics/quizzes/equivalent-fractions-01.json
```

Keep the content base URL in an Angular environment/config value so the source can be changed later without rewriting content services.

---

# GitHub Pages and `.nojekyll`

The repository includes an empty:

```text
.nojekyll
```

file. If this repository itself is published with GitHub Pages, this tells Pages to serve the repository as static files instead of asking Jekyll to transform Markdown content.

This is useful because Qurio expects to download the original `.md` files and render them inside the app.

---

# Fetching from GitHub Pages

The same repository can also be published as static files through GitHub Pages.

The app logic should not care whether the base is:

```text
GitHub Raw
GitHub Pages
another static CDN
```

It should only depend on:

```text
CONTENT_BASE_URL
```

and the manifest/file paths.

---

# Recommended Angular content flow

```text
App starts
   ↓
load manifest.json
   ↓
selected language
   ↓
build subject/grade navigation
   ↓
user opens content
   ↓
check local cache
   ↓
fetch language file if needed
   ↓
parse frontmatter
   ↓
render Markdown
   ├── Mermaid.js
   └── KaTeX
```

For quizzes:

```text
manifest
   ↓
quiz path
   ↓
fetch JSON
   ↓
validate shape
   ↓
QuizState
   ↓
timer + answers
   ↓
result
   ↓
save attempt/progress
```

---

# Recommended app-state separation

This repository does not store user state.

In the Qurio app:

```text
AuthState
LearningState
QuizState
ProgressState
```

can be implemented with Angular Signals.

Private learner state such as:

```text
account approval
study completion
quiz score
quiz history
progress
```

belongs in Supabase/local storage, not GitHub content.

---

# Public-content note

Anything stored in a public GitHub repository should be considered public.

That includes:

```text
study notes
quiz questions
correct answers
hints
explanations
syllabi
```

Authentication should protect **user data and application access**, but it cannot make public GitHub files secret.

This is normally fine for Qurio because the learning content is intended to be accessible educational material.

---

# Mermaid and Markdown safety

When rendering downloaded content:

- sanitize rendered HTML
- do not allow arbitrary scripts from Markdown
- treat Mermaid input as content, not executable app code
- configure external links safely
- do not use `innerHTML` with unsanitized downloaded text
- keep the content repository write-access restricted to trusted maintainers

---

# `quiz.schema.json`

The repository contains:

```text
schemas/quiz.schema.json
```

It documents the expected quiz JSON shape and can be used later in CI to validate quiz files.

For production, adding GitHub Actions validation is recommended so a malformed quiz cannot be merged.

Useful validation checks include:

```text
JSON is valid
required fields exist
IDs are unique
correctOption exists in options
same quiz translations have same question IDs
same question translations have same option IDs
manifest paths exist
frontmatter ID matches manifest ID
language matches containing language folder
```

---

# Recommended authoring workflow

Use English as the canonical source.

```text
1. Write English syllabus/note/quiz
2. Review educational correctness
3. Freeze stable IDs
4. Translate to Tamil
5. Translate to Hindi
6. Preserve all IDs and quiz logic
7. Update manifest
8. Validate
9. Commit
10. Qurio sees new contentVersion and refreshes
```

Do not translate an English lesson while its IDs/question structure are still changing heavily.

---

# Translation quality rules

Translations should be educational translations, not blind word-for-word substitutions.

Preserve:

```text
meaning
difficulty
question intent
correct answer
mathematical values
scientific facts
question IDs
option IDs
```

For English-language subject lessons, it is valid for Tamil/Hindi explanations to retain the actual English examples being taught.

For mathematical notation and formulas, translate explanatory text but keep mathematical expressions logically identical.

---

# ID convention used by the demo

Notes:

```text
{subject-short}-{grade}-{topic}
```

Examples:

```text
math-05-equivalent-fractions
sci-05-photosynthesis
eng-05-nouns
sst-05-directions-and-maps
int-05-number-patterns
```

Quizzes:

```text
{note-id}-{set-number}
```

Examples:

```text
math-05-equivalent-fractions-01
sci-05-photosynthesis-01
```

Syllabi:

```text
syllabus-{curriculum}-{grade}-{subject}
```

Example:

```text
syllabus-general-05-mathematics
```

Once published and learner progress exists, avoid changing IDs. Rename display titles instead.

---

# What should not be stored in frontmatter

Do not put user-specific information in Markdown:

```text
completed
score
bookmarked
lastOpened
userId
attemptCount
```

Those belong to user state.

Frontmatter describes the **content itself**.

---

# What should not be duplicated in Supabase

Qurio should not copy the full learning content into its user database.

Keep static content here:

```text
notes
questions
options
answers
explanations
syllabus
```

Keep only learner state remotely:

```text
profile
approval status
note completion
quiz attempt summary
score
time taken
```

This keeps the backend small.

---

# Demo files worth testing first

Start app integration with these files:

```text
manifest.json

en/grade-05/mathematics/notes/fractions/equivalent-fractions.md
ta/grade-05/mathematics/notes/fractions/equivalent-fractions.md
hi/grade-05/mathematics/notes/fractions/equivalent-fractions.md

en/grade-05/mathematics/quizzes/equivalent-fractions-01.json
ta/grade-05/mathematics/quizzes/equivalent-fractions-01.json
hi/grade-05/mathematics/quizzes/equivalent-fractions-01.json
```

The Mathematics note contains both **Mermaid** and several **LaTeX** expressions, making it a good renderer test.

Then test Science for a second Mermaid/LaTeX combination and the remaining subjects for normal multilingual Markdown/quiz navigation.

---

# Future extensions

The structure can later support:

```text
more grades
more languages
school boards/curricula
audio
images
downloadable worksheets
multiple quiz sets
difficulty levels
revision quizzes
question banks
competitive exams
language-independent intelligence levels
bookmarks
related-content IDs
prerequisites
```

Add these only when the app needs them; keep V1 content metadata simple.

---

# Summary

The core Qurio content contract is:

```text
Language folder
   ↓
Grade
   ↓
Subject
   ├── optional syllabus.md
   ├── notes/{chapter}/{topic}.md
   └── quizzes/{topic}-{set}.json
```

with:

```text
English = canonical/fallback language
same paths across translations
same logical IDs across translations
Markdown + YAML frontmatter for notes
JSON for quizzes
manifest.json for discovery
Mermaid + KaTeX supported in study notes
progress IDs language-independent
cache keys language-aware
```

This demo repository is intentionally ready to push to GitHub and use as the first Qurio static content source.
