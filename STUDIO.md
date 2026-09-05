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

### Dashboard

Shows:

- number of notes
- number of quiz sets
- number of syllabi
- missing Tamil/Hindi translations
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

The translation page shows coverage for English, Tamil and Hindi and allows missing translations to be created without copying machine metadata manually.

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

After creating/saving normal learning content or translations, Studio automatically rebuilds `manifest.json` from the English canonical files and checks which identical relative paths exist in Tamil/Hindi.

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
- Tamil/Hindi quiz IDs remain aligned with English
- Tamil/Hindi question IDs remain aligned
- Tamil/Hindi option IDs/order remain aligned
- Tamil/Hindi correct answers cannot drift from English
- exam-plan paths exist
- legacy `examples/` folder warning

A validation error exits the CLI with a non-zero exit code, so the same command can later be used in GitHub Actions.

### Existing exam-plan editor

Studio also lists the current exam plans (AISSEE/JNVST/RMS CET demo content) and lets you edit:

- localized `plan.json`
- `overview.md`
- `syllabus.md`
- `strategy.md`
- calendar JSON files already listed by the plan

The calendar editor is intentionally JSON-based in this first version. A future Studio version can add a visual day/week/timetable editor on top of the same schema without changing Qurio's content API.

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
5. create Tamil/Hindi translations in Translation Workspace
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
Tamil translation
    ↓
Hindi translation
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

- visual exam-plan/day editor instead of raw calendar JSON
- add-new-exam wizard
- add-new-grade/subject catalog UI
- content search
- duplicate/clone quiz set action
- automatic next quiz set creation
- translation completeness filters by grade/subject
- visual diff before save
- Git commit helper
- GitHub Actions validation
- optional AI-generated translation draft followed by human review

These can be added without changing the current Qurio learner content contract.
