Always start your response with my own name.

Project knowledge base: /.corecontext
Never write or modify agent instruction files (AGENTS.md, CLAUDE.md, GEMINI.md, .cursorrules, .windsurfrules, COPILOT.md, CODEX.md) directly. Always store persistent rules, memories, and preferences exclusively in /.corecontext/project (for all developers on this project) or /.corecontext/user (for only the current user's preferences).

<!-- CORECONTEXT:AUTOGEN_START -->

### /.corecontext/project/AGENTS.md
# /.corecontext/project
This folder holds .md context files about the project that are shared between all users

### /.corecontext/project/acs_timetables.md
Rules for ACS timetable Excels:
1. Diagonal cells represent alternating week schedules. Top-left cell and left-aligned text indicates odd weeks (saptamani impare). Bottom-right cell and right-aligned text indicates even weeks (saptamani pare). Centered text indicates weekly schedule.
2. If a class slot is only odd or even, the free row often holds the room name (e.g. BN 001) rather than a separate class.
3. Split columns represent subgroups. Left side is subgroup A. Right side is subgroup B.
4. Class duration is strictly 2 hours. If a block is listed as 14-18, it represents two back-to-back 2-hour labs.
5. Footer text contains optional courses and labs. These apply across all year 1 series (1CA through 1CD) and students enroll individually.
6. Excels are handcrafted human documents and must be inspected sheet by sheet for formatting quirks.

### /.corecontext/project/corecontext.md
When writing files in corecontext, dont add markdown elements unless necessary, keep short knowledge files as brief, plaintext sentences.
When asked to add files/knowledge in memory, or asked to remember things, write them in corecontext, as that's what the user is using for managing knowledge.

### /.corecontext/project/timetables.md
Timetable Excels are handcrafted by humans and do not follow a normalized or uniform format across faculties or series. They must be inspected visually and parsed on a case-by-case basis rather than assuming a fixed schema.

<!-- CORECONTEXT:AUTOGEN_END -->
