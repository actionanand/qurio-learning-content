# Qurio learning-content structure (v2.5)

This repository uses a scalable topic-scoped layout. Every subject keeps its syllabus at the subject root, and every study topic owns its study document plus its quiz sets.

```text
{language}/
├── grade-05/
│   ├── mathematics/
│   │   ├── syllabus.md
│   │   └── topics/
│   │       ├── fractions/
│   │       │   └── equivalent-fractions/
│   │       │       ├── study.md
│   │       │       └── quizzes/
│   │       │           ├── 01.json
│   │       │           ├── 02.json
│   │       │           └── 03.json
│   │       ├── data-handling/probability/...
│   │       ├── number-operations/factorial/...
│   │       └── numbers/prime-numbers/...
│   ├── science/
│   │   ├── syllabus.md
│   │   └── topics/plants/photosynthesis/...
│   ├── english/
│   │   ├── syllabus.md
│   │   └── topics/grammar/nouns/...
│   ├── social-studies/
│   │   ├── syllabus.md
│   │   └── topics/geography/directions-and-maps/...
│   ├── intelligence/
│   │   ├── syllabus.md
│   │   └── topics/patterns/number-patterns/...
│   └── general-knowledge/
│       ├── syllabus.md
│       └── topics/world/continents-and-oceans/...
└── exams/
    └── ... existing exam preparation content ...
```

The same logical file layout is mirrored under `en`, `ta`, and `hi`. Stable content IDs are unchanged when only a file path moves. The client should use `manifest.json`; it should never derive identity from physical paths.

## Relationship model

A study note and its quizzes share `curriculum + grade + subject + chapter + topic`. The manifest also exposes `note.quizIds` and `quiz.sourceNoteIds`. Studio manifest rebuild automatically supplements these relationships, so authors do not need to maintain every link by hand.

## Client selection

After Grade + Subject selection:

- Syllabus is shown separately.
- Study Material dropdown contains `All` plus note items.
- Selecting one note filters Quiz dropdown to related quizzes.
- Selecting `All` shows all quizzes for that grade + subject.
- Full Markdown/quiz JSON is fetched only when opened; dropdown labels come from manifest metadata.
