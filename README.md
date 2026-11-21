# AacharyX AI — har doubt ka samadhan

An AI doubt-solving tutor for Indian school students (K-12). A student picks their medium, grade,
board and subject, then asks a doubt by typing or speaking. AacharyX answers step by step in simple
language, using only the platform's own lesson content (revision notes, video transcripts and
practice questions), and shows the sources behind every answer.

## How it works

- **Backend (FastAPI, Python):** loads a plan's lesson content, splits it into chunks and indexes it
  with BM25. For each question, an OpenAI "router" call (`gpt-5.4-mini`) checks whether the question
  belongs to the subject, retrieval finds the relevant excerpts, and an OpenAI "tutor" call
  (`gpt-5.5`) streams a cited answer over Server-Sent Events. Chats, messages and feedback are
  stored in SQLite.
- **Frontend (React 18, TypeScript, Vite, Tailwind):** a streaming chat with maths (KaTeX),
  clickable citations with expandable full-text sources, light and dark mode, and a mobile-first
  responsive layout.

## Features

- Answers grounded in lesson content, with citations that link to the source
- One open chat per subject, plus a chat history side menu across subjects
- "Did this solve your doubt?" close flow with a 1–5 star rating, and "Talk to a teacher" hand-off
- Voice: speak a doubt (it sends automatically when you stop talking), and answers are read aloud
  in a soft female teacher voice
- Topic browser: tap any chapter concept to get it explained
- Choice of subject comes from the configured plan, so changing the plan ID changes the dropdowns

## Stack

FastAPI · OpenAI (`gpt-5.4-mini` router, `gpt-5.5` tutor) · BM25 · SQLite · React · TypeScript ·
Vite · Tailwind CSS · Web Speech API

See `README.md` for setup, configuration and design decisions.
