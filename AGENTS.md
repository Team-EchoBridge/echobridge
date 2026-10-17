# EchoBridge agent rules

Project: one speaker talks in Hindi or Marathi, listeners join by QR and hear/read the English translation live.
Stack: Node 20, Express, Socket.IO, React + Vite. /nlp is a Node module that calls Google Speech-to-Text and Translation.

Read before working: docs/contracts.md (event and function shapes) and docs/TASKS.md (who does what).

Folders and owners:
- client/src/speaker: Member 1
- client/src/listener: Member 2
- client/src/shared and server: Member 3
- nlp: Member 4

Rules:
- Only edit files inside the folder named in the task.
- docs/contracts.md is the source of truth. Never change event or function shapes without asking.
- Do not add dependencies without saying so in your reply.
- Never read, print or hardcode secrets. Keys come from .env and the secrets folder.
- No database, no extra frameworks, no extra AI providers. Keep code simple and readable.
- After a change, say how to run it and what to check.
- If a fix fails twice, stop and report instead of looping.
