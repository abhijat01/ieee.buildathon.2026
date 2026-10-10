---
name: implement-now
description: Take a GitHub issue number and implement it from the implementation plan and test plan in the issue. Labels the issue AI:Coding-In-Progress while it works. An independent agent reviews the code and compares the result with the mockup, and posts an implementation review comment. The skill then fixes the findings, posts a comment about the changes, and labels the issue AI:Implemented. Fast and simple for live demos. Use when the user asks to implement an issue, ticket, story, or bug.
---

# Implement an issue now

This skill runs in live demos. The audience watches the screen.
Keep the code simple and the steps fast. Do not ask questions unless the issue number is missing.

## Show the progress on screen

The audience must always see what happens now and what is done.
Use the same banner types each time. Put a horizontal rule (`---`) before each banner.

**Start banner.** Write it before each step:

```markdown
---
## ▶ Step 3 of 7 · Write the code
I follow the implementation plan in issue #42.
```

**Done banner.** Write it after each step. Use a level-1 heading so that it is large:

```markdown
---
# ✅ Done · Write the code
- Changed **5** files.
- Added the `ResumeExportService` class.
```

**Label banner.** Write it each time the skill changes a label:

```markdown
---
# 🏷 Label · AI:Coding-In-Progress
- Issue **#42** is now in progress.
```

**Review banners.** Steps 5 and 6 use special banners. They show the audience who works now:

```markdown
---
# 🔍 Independent implementation review starts
- **Reviewer:** a separate agent with no implementation context
- **Checks:** code, tests, and the mockup
```

```markdown
---
# 🛠 Implementation agent incorporates the review
- **Findings:** 4 · **Accepted:** 3 · **Rejected:** 1
```

**Final banner.** Write it at the end. Use a level-1 heading and a short list.

Banner rules:

- Put at most three bullets in a done banner. Each bullet states one result.
- Use bold text for numbers, names, and links that the audience must see.
- Do not put long text, code, or tables in a banner. Show long content after the banner.
- Use short, plain sentences. The text must be readable on a projector from the back of a hall.

The steps are:

1. Read the issue
2. Start the work
3. Write the code
4. Run the tests
5. Independent review
6. Incorporate the review
7. Finish the work

## Labels

| Label | Color | Meaning |
|-------|-------|---------|
| `AI:Coding-In-Progress` | `FBCA04` (yellow) | An agent works on the issue now. |
| `AI:Implemented` | `8250DF` (purple) | The agent finished and reviewed the work. |

## Step 1 · Read the issue

- Use the issue number in the skill arguments. Accept `42`, `#42`, or an issue URL.
- If there is no issue number, ask for it in one short question.
- Read the issue:

  ```bash
  gh issue view <number> --json number,title,labels,body,url
  ```

- If the body has no `## Implementation plan`, tell the user to run `/create-plan <number>` and stop.
- If the issue has the `AI:Implemented` label, show the issue URL and stop.
- Read the mockup in `agent-ws/git-NNN/` if it exists. `NNN` is the issue number with three digits.
- Show the title and the number of plan steps in one line.

## Step 2 · Start the work

```bash
gh label create "AI:Coding-In-Progress" --color FBCA04 --description "An agent works on this issue" >/dev/null 2>&1
gh label create "AI:Implemented" --color 8250DF --description "An agent implemented and reviewed this issue" >/dev/null 2>&1
gh issue edit <number> --add-label "AI:Coding-In-Progress"
git switch -c issue-NNN 2>/dev/null || git switch issue-NNN
```

- Write the **Label banner**.

## Step 3 · Write the code

- Follow the implementation plan step by step. Do not add work that the plan does not contain.
- Follow `CLAUDE.md`, `docs/development/python.md`, and `docs/development/architecture-conventions.md`.
- Read `agent-ws/ai-best-practices.md` if the issue touches the agent or LLM calls.
- Match the mockup: layout, labels, styles, and states.
- Write the tests from the test plan.
- Add a Playwright test `ui/tests/issue-NNN.spec.ts` for the main flow.
  At the end of the flow, save a screenshot to `agent-ws/git-NNN/impl-<project>.png`.
  `<project>` is `desktop` or `mobile` from `testInfo.project.name`.
- Write one done line for each plan step, for example `✅ Server: added the export endpoint.`

## Step 4 · Run the tests

Run these tests. They are fast enough for a demo:

```bash
(cd server && uv run --locked pytest -q)
npm test --prefix ui
npm run build --prefix ui
(cd ui && npx playwright test tests/issue-NNN.spec.ts)
```

- Fix each failure before you continue.
- Show the test counts in the done banner, for example `**42** server tests passed.`
- Show the two screenshots `impl-desktop.png` and `impl-mobile.png` to the audience.

## Step 5 · Independent review

Write the **Independent implementation review starts** banner first.

Start the reviewer with the `Agent` tool (`subagent_type: general-purpose`).
The reviewer must be independent. Do not give it your notes or your reasons.
Give it only this prompt, with the issue number:

```text
You are an independent reviewer. Review the implementation of GitHub issue #<number>.
Read the issue and its plans with `gh issue view <number>`.
Read the changes with `git diff main` and `git status`.
Check the code against CLAUDE.md, docs/development/python.md,
docs/development/architecture-conventions.md, and agent-ws/ai-best-practices.md.
Check that the code follows the implementation plan and that the tests cover the test plan.

Compare the result with the mockup in agent-ws/git-<NNN>/. This step is mandatory.
Open index.html and look at desktop-preview.png and mobile-preview.png.
Compare them with impl-desktop.png and impl-mobile.png in the same folder.
Check the layout, labels, styles, and states. Report each visible difference.

Look for: bugs, missing plan steps, missing tests, business rules in the UI,
security gaps, and differences from the mockup. Give at most 5 findings.
Number each finding. Give each finding a severity (High, Medium, Low) and a fix.
Write the review in ASD-STE100 style. Use short sentences.
Post the review as one comment. The first line must be "## 🔎 Implementation review".
Add a section "### Mockup comparison" with one line for each screen or state.
Use `gh issue comment <number> --body-file <file>`.
Do not edit the issue body. Do not change any code.
Return only the URL of the comment.
```

Then write a done banner with the comment URL.

## Step 6 · Incorporate the review

Write the **Implementation agent incorporates the review** banner first.

Read the review back from GitHub. Use the latest implementation review comment:

```bash
gh issue view <number> --json comments \
  --jq '[.comments[] | select(.body | startswith("## 🔎 Implementation review"))] | last | {url, body}'
```

- Decide on each finding: **Accepted** or **Rejected**. Give a one-line reason for a rejection.
- Fix each accepted finding.
- Run the tests from step 4 again. Update the screenshots.
- Post a new comment that describes the changes. Start it with a link to the review:

  ```markdown
  ## 🛠 Changes after the [implementation review](<review comment URL>)

  | # | Finding | Decision | Change |
  |---|---------|----------|--------|
  | 1 | Short name | Accepted | The file and the change |
  | 2 | Short name | Rejected | The reason |

  **Tests:** server 42 passed · UI 18 passed · browser 2 passed
  ```

  ```bash
  gh issue comment <number> --body-file <scratchpad>/changes.md
  ```

## Step 7 · Finish the work

### Restart the local app

The running server does not load new server code or migrations. Restart the app so that the changes are effective.
Read [Separate application instances](agent-ws/multi-instance-support.md) first. Always use the explicit profile:

```bash
./run-all.sh --profile sample-app-02 --stop
./run-all.sh --profile sample-app-02
```

- `run-all.sh` applies the Alembic migrations when the server starts.
- Check that the app runs the new code. Call a new or changed endpoint with `curl`.
  Without a session, the expected status is 401, not 404.
- If the change adds a migration, check the database version in `.runtime/ieee.db`.
- Show the app URL from the `run-all.sh` output.
- If the restart fails, read `.runtime/server.log`. Fix the problem, or write a `# ❌ Stopped` banner.

### Set the label

```bash
gh issue edit <number> --remove-label "AI:Coding-In-Progress" --add-label "AI:Implemented"
```

- Write the **Label banner** for `AI:Implemented`.
- Do not commit, push, or create a pull request unless the user asks.

Write the final banner:

```markdown
---
# 🎉 Complete · Issue implemented
- **Issue:** #42 · <title>
- **Branch:** issue-042 · **Files changed:** 7
- **Review:** 4 findings · 3 accepted · 1 rejected
- **Tests:** all passed
- **App:** restarted at <app URL> with the new code
```

If a step fails and you cannot fix it, keep the `AI:Coding-In-Progress` label.
Write a `# ❌ Stopped · <step>` banner with the reason.

## Writing style

Write the code comments, the GitHub comments, and the on-screen messages in ASD-STE100 style,
as `CLAUDE.md` describes. Use short sentences, active voice, and simple words.
Technical names are permitted as they are.
