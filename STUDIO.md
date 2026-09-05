# Qurio Content Studio

`qurio-learning-content` now includes a small **local-only Express + EJS authoring application**. It edits this repository directly, so you no longer need to hand-create most YAML frontmatter, quiz JSON, file paths, translation copies, or manifest entries.

The Studio is intended for the repository maintainer/content author. It is **not part of the Qurio learner Android/web app** and it is not intended to be deployed publicly.

## Quick start

From the repository root:

```bash
npm install
npm run studio
```

Open:

```text
http://127.0.0.1:4310
```

For automatic restart while editing Studio code:

```bash
npm run dev
```

The server binds to `127.0.0.1` by default so it is available only on your computer.

## What Studio currently handles

### Catalog Setup

Use **Catalog Setup** in the sidebar before authoring content to manage the selectable metadata used everywhere else in Studio. You can add or edit:

- languages (`en`, `ta`, `hi`, `kn`, `ml`, etc.) with English and native names
- curricula/boards (`general`, `ncert`, `cbse`, `icse`, state boards, etc.)
- grades/classes with localized labels for every configured language
- subjects with localized labels, an optional short code for generated content IDs, and grade-scoped behavior

New entries are written directly to `manifest.json` and immediately appear in Note, Quiz, Syllabus and Translation screens. You do not need to restart Studio.

The canonical/default language remains English in the current Qurio design. Adding a language makes it available as a translation target and backfills safe display-label fallbacks for existing grades/subjects; you can then correct those localized labels from Catalog Setup.

`general` content keeps the existing path structure:

```text
en/grade-05/mathematics/...
```

Additional curricula are isolated so two boards cannot overwrite the same topic path:

```text
en/curricula/ncert/grade-05/mathematics/...
en/curricula/cbse/grade-05/mathematics/...
```

Non-General content IDs also include the curriculum prefix to avoid cross-board collisions.

Deletion is intentionally guarded: a catalog entry cannot be removed while learning content or exam-plan content still references it.

### Dashboard

Shows:

- number of notes
- number of quiz sets
- number of syllabi
- missing configured-language translations
- exam-plan count
- Git branch/change summary when the repository has `.git` metadata

### Study-note creator/editor

You choose:

- language
- curriculum
- grade
- subject
- chapter ID
- topic ID
- title
- order
- difficulty
- estimated time
- related quiz IDs
- tags
- Markdown content

Studio generates the stable ID, correct language/grade/subject/chapter folder, YAML frontmatter, update date and manifest entry.

Example generated path:

```text
en/grade-05/mathematics/notes/fractions/equivalent-fractions.md
```

### Markdown preview

The note and syllabus editors have live/manual preview support for:

- Markdown
- KaTeX/LaTeX
- Mermaid diagrams

Raw HTML is intentionally not executed by the Studio preview.

### Quiz builder

The quiz editor avoids hand-writing JSON. For each question it provides:

- question text
- hint
- four stable options `A`–`D`
- option-specific feedback
- correct option
- overall explanation

Quiz-level fields include:

- quiz series
- set number
- localized set label
- difficulty
- timer
- passing percentage
- shuffle questions/options
- related note IDs

For a topic such as Equivalent Fractions, multiple sets can be created:

```text
equivalent-fractions-01.json
equivalent-fractions-02.json
equivalent-fractions-03.json
```

Studio creates IDs such as:

```text
math-05-equivalent-fractions-01
math-05-equivalent-fractions-02
math-05-equivalent-fractions-03
```

and groups them under:

```text
math-05-equivalent-fractions-practice
```

### Syllabus editor

Creates/edits the optional subject syllabus:

```text
{language}/grade-{grade}/{subject}/syllabus.md
```

The app generates syllabus frontmatter automatically.

### Translation workspace

English remains canonical.

The translation page shows coverage for every language configured in Catalog Setup and allows missing translations to be created without copying machine metadata manually.

For Markdown content Studio locks/copies:

- ID
- type
- curriculum
- grade
- subject
- chapter/topic
- order
- quiz IDs
- version

You translate only the visible title and Markdown body.

For quizzes Studio also locks:

- quiz ID
- series ID
- set number
- question IDs
- option IDs
- `correctOption`
- scoring/timer behavior

You translate:

- set label
- title
- description
- question text
- hints
- option text
- per-option feedback
- explanations

This protects Qurio's rule that progress remains language-independent.

### Manifest regeneration

After creating/saving normal learning content or translations, Studio automatically rebuilds `manifest.json` from the English canonical files and checks which identical relative paths exist in every configured language.

The manifest generator:

- keeps schema version 2
- refreshes `contentVersion`
- refreshes `generatedAt`
- builds note/syllabus/quiz items
- detects available translations
- carries quiz `seriesId` and `setNumber`
- preserves exam definitions and exam-plan references
- preserves existing subject metadata
- adds newly discovered grades when needed

You can also rebuild manually:

```bash
npm run manifest:rebuild
```

or use **Validate → Rebuild manifest** in the Studio.

### Repository validation

Run from the browser or command line:

```bash
npm run validate
```

Current checks include:

- manifest schema version
- duplicate content IDs
- manifest paths actually exist
- English note frontmatter IDs match manifest IDs
- referenced quiz IDs exist
- quiz JSON matches `schemas/quiz.schema.json`
- each `correctOption` is a real option
- translated quiz IDs remain aligned with English
- translated question IDs remain aligned
- translated option IDs/order remain aligned
- translated correct answers cannot drift from English
- exam-plan paths exist
- legacy `examples/` folder warning

A validation error exits the CLI with a non-zero exit code, so the same command can later be used in GitHub Actions.

### Exam catalog

Studio has a dedicated **Exams** screen for maintaining reusable exam definitions in `manifest.json`. You can:

- add a new exam without hand-editing JSON
- edit short name, category and official information URL
- maintain localized display names and full names for every configured language
- see how many preparation plans reference each exam
- delete an exam only when no plan references it

Example exam IDs remain stable machine keys such as:

```text
aissee
jnvst
rms-cet
```

### Structured exam-plan editor

The **Exam Plans** screen now supports creation and structured editing instead of requiring manual `plan.json` editing.

When creating a plan you choose:

- exam
- entry class
- exam year
- authoring language
- plan title/subtitle
- plan start/end date
- target date
- demo/official-schedule flags
- one or more preparation phases
- optional initial calendar months
- overview Markdown
- strategy Markdown
- full-syllabus Markdown

Studio creates the correct folder and plan reference automatically, for example:

```text
en/exams/aissee/class-06/2027/plan.json
en/exams/aissee/class-06/2027/overview.md
en/exams/aissee/class-06/2027/strategy.md
en/exams/aissee/class-06/2027/syllabus.md
en/exams/aissee/class-06/2027/calendar/2026-09.json
```

For existing plans, stable identity fields (`id`, `examId`, `entryClass`, `examYear` and path) stay locked while visible content, dates, phases and version can be edited safely.

Plan translations can be created from any configured language. Studio clones the canonical structure, keeps the same IDs/dates/calendar references and lets you translate the visible plan/Markdown content.

Calendar months can be added from the plan editor. Adding a month creates the same empty month file for every existing plan language so multilingual structure stays aligned. Empty months can also be removed safely.

The individual monthly calendar editor is still JSON-based for detailed daily topics/revision/timetable data. A future improvement can add a visual day planner on top of the same schema.

The Studio also uses `studio/public/favicon.ico` as its browser favicon.

## Repository layout with Studio

```text
qurio-learning-content/
│
├── package.json
├── STUDIO.md
├── README.md
├── manifest.json
├── .env.example
│
├── studio/
│   ├── server.js
│   ├── config.js
│   ├── cli/
│   ├── lib/
│   ├── public/
│   └── views/
│
├── schemas/
│   ├── quiz.schema.json
│   ├── exam-plan.schema.json
│   └── exam-calendar.schema.json
│
├── en/
├── ta/
└── hi/
```

Studio code and learner content live in the same repository, but Studio never becomes part of the public content schema. The Qurio client continues to read only `manifest.json` and referenced static learning files.

## Configuration

Normally no configuration is needed.

The Studio assumes that the folder containing `package.json` is the Qurio content root.

Optional environment variables:

```text
QURIO_CONTENT_ROOT=/absolute/path/to/qurio-learning-content
HOST=127.0.0.1
PORT=4310
```

Copy `.env.example` to `.env` when you need overrides. The Studio loads `.env` automatically.

## Recommended workflow

```text
1. git pull
2. npm install        # first run / dependency changes only
3. npm run studio
4. create or edit English canonical content
5. create the required translations in Translation Workspace
6. open Validate and fix any errors
7. review git diff
8. git add .
9. git commit
10. git push
```

Studio deliberately does **not** commit or push automatically in this version. You retain normal Git review/control over every generated change.

## English-first authoring

Recommended order:

```text
English source
    ↓
review learning correctness
    ↓
freeze IDs/question logic
    ↓
target-language translations
    ↓
validate every configured language
    ↓
validate
    ↓
commit
```

Do not create independent translated quiz structures. Translation should change language, not assessment logic.

## Stable IDs

Once learner progress exists, IDs should be considered permanent.

Changing a title is fine:

```text
Equivalent Fractions
→ Understanding Equivalent Fractions
```

but avoid changing:

```text
math-05-equivalent-fractions
```

because Qurio uses the stable ID for learner progress.

## Local-only safety

The Studio contains filesystem write endpoints. That is intentional because it is an authoring tool.

For safety:

- it binds to localhost by default
- do not expose it directly to the internet
- do not deploy the Express app to GitHub Pages
- review `git diff` before committing
- keep normal Git backups/history

The public Qurio learner app remains a separate project.

## NPM commands

```bash
npm run studio
npm run dev
npm run validate
npm run manifest:rebuild
```

## Dependencies

Running `npm install` installs the Studio dependencies:

- Express
- EJS
- dotenv
- js-yaml
- AJV
- Marked
- KaTeX
- Mermaid

No database is needed. The Git repository itself is the content store.

## Future Studio improvements

Good next additions are:

- visual day/week/timetable editor instead of raw monthly calendar JSON
- content search
- duplicate/clone quiz set action
- automatic next quiz set creation
- translation completeness filters by grade/subject
- visual diff before save
- Git commit helper
- GitHub Actions validation
- optional AI-generated translation draft followed by human review

These can be added without changing the current Qurio learner content contract.
