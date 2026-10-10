---
name: create-plan
description: Take a GitHub issue number (user story, bug, or task) and add a short implementation plan and test plan to the issue as separate sections below the main description. An independent agent reviews the plan as a GitHub comment. The skill then updates the plan and replies to the review. Skips a plan that already exists. Fast and simple for live demos. Use when the user asks to plan, create a plan, or add an implementation or test plan for an issue.
---

# Create a plan for an issue

This skill runs in live demos. The audience watches the screen.
Keep the plans short and simple. Work fast. Do not ask questions unless the issue number is missing.

## Show the progress on screen

The audience must always see what happens now and what is done.
Use the same three banner types each time. Put a horizontal rule (`---`) before each banner.

**Start banner.** Write it before each step:

```markdown
---
## ▶ Step 2 of 6 · Explore the code
I read the related screens and server APIs.
```

**Done banner.** Write it after each step. Use a level-1 heading so that it is large:

```markdown
---
# ✅ Done · Explore the code
- Found 3 related files.
- The change touches the Resume Builder screen.
```

**Final banner.** Write it at the end. Use a level-1 heading and a short list:

```markdown
---
# 🎉 Complete · Plan ready
- **Issue:** #42 · <title>
- **URL:** <url>
```

Banner rules:

- Put at most three bullets in a done banner. Each bullet states one result.
- Use bold text for numbers, names, and links that the audience must see.
- Do not put long text, code, or tables in a banner. Show long content after the banner.
- Use short, plain sentences. The text must be readable on a projector from the back of a hall.
- Show the full plans on screen after the done banners of steps 3 and 6.

**Review banners.** Steps 5 and 6 use special banners. They show the audience who works now:

```markdown
---
# 🔍 Independent review starts
- **Reviewer:** a separate agent with no planning context
- **Output:** a review comment on issue #42
```

```markdown
---
# 🛠 Planning agent incorporates the review
- **Findings:** 4 · **Accepted:** 3 · **Rejected:** 1
```

The steps are:

1. Read the issue
2. Explore the code
3. Write the plans
4. Publish the draft plan
5. Independent review
6. Incorporate the review

## Step 1 · Read the issue

- Use the issue number in the skill arguments. Accept `42`, `#42`, or an issue URL.
- If there is no issue number, ask for it in one short question.
- Read the issue:

  ```bash
  gh issue view <number> --json number,title,labels,body,url
  ```

- Find the issue type from the labels: `user-story`, `bug`, or other work.
- Check the body for the headings `## Implementation plan` and `## Test plan`.
- If both plans exist, add the `AI:PlanningDone` label (see **Finish**), show the issue URL, and stop.
- Show the title and the type in one line.

## Step 2 · Explore the code

- Read only the files that the issue touches. Do not do a full code review.
- Read `agent-ws/ai-best-practices.md` if the issue touches the agent or LLM calls.
- Read the mockup in `agent-ws/git-NNN/` (`NNN` is the issue number with three digits).
  Read `index.html`, `styles.css`, `mockup.js`, and the preview screenshots if they exist.
- List the screens, controls, states, and sample data that the mockup shows.
- If there is no mockup folder, say so in one line and continue.
- Tell the audience which parts of the app will change.

## Step 3 · Write the plans

Write only the plans that do not exist yet. Use this structure:

```markdown
## Implementation plan

### Server
- Short steps: file or class, and the change.

### UI
- Short steps: component or service, and the change.

### Database
- Alembic migration, if a schema change is necessary.

## Test plan

### Unit tests
- Server: test class and the behavior it checks.
- UI: test file and the behavior it checks.

### Manual tests
1. Short steps.

**Expected result:** The result that the tester sees.
```

- Omit a subsection that has no work, for example **Database**.
- Keep each plan to about 5–10 bullets. It is an illustration.
- For a bug, start the implementation plan with one line about the likely cause.
  Make the first unit test reproduce the bug.
- Follow `CLAUDE.md` and `docs/development/architecture-conventions.md`.
- Do not repeat the acceptance criteria or the **How to test** section. Refer to them.
- If a mockup exists, use it as the UI target:
  - Add a UI step for each screen, control, and state in the mockup.
    These states include the empty, error, and success states.
  - Reuse the mockup's layout, labels, and styles. Name the mockup file in each UI step.
  - Add a manual test for each mockup state. Compare the result with the mockup screenshots.
  - Add a line at the top of the implementation plan: `**Mockup:** agent-ws/git-NNN/index.html`.

## Step 4 · Publish the draft plan

Keep the user story or the bug description at the top of the body.
Add the new plan sections at the end of the body. Do not change the existing text.

```bash
gh issue view <number> --json body --jq .body > <scratchpad>/original.md
cat <scratchpad>/original.md <scratchpad>/plan.md > <scratchpad>/body.md
gh issue edit <number> --body-file <scratchpad>/body.md
```

- `<scratchpad>/plan.md` contains only the new plan sections.
- Keep `<scratchpad>/original.md`. Step 6 uses it to replace the draft plan.

## Step 5 · Independent review

Write the **Independent review starts** banner first.

Start the reviewer with the `Agent` tool (`subagent_type: general-purpose`).
The reviewer must be independent. Do not give it your notes or your reasons.
Give it only this prompt, with the issue number:

```text
You are an independent reviewer. Review the implementation plan and the test plan
in GitHub issue #<number>. Read the issue with `gh issue view <number>`.
Read only the code that the plan touches. Check the plan against CLAUDE.md,
docs/development/architecture-conventions.md, and agent-ws/ai-best-practices.md.
If the folder agent-ws/git-<NNN> has a mockup, check that the plan covers each
screen, control, and state in the mockup.
Look for: missing steps, wrong files or classes, missing tests, business rules in the UI,
security gaps, and steps that are too large. Give at most 5 findings.
Number each finding. Give each finding a severity (High, Medium, Low) and a fix.
Write the review in ASD-STE100 style. Use short sentences.
Post the review as one comment. The first line must be "## 🔍 Independent plan review".
Use `gh issue comment <number> --body-file <file>`.
Do not edit the issue body. Do not change any code.
Return only the URL of the comment.
```

Then write a done banner with the comment URL.

## Step 6 · Incorporate the review

Write the **Planning agent incorporates the review** banner first.

Read the review back from GitHub. Use the latest review comment:

```bash
gh issue view <number> --json comments \
  --jq '[.comments[] | select(.body | startswith("## 🔍 Independent plan review"))] | last | {url, body}'
```

- Decide on each finding: **Accepted** or **Rejected**. Give a one-line reason for a rejection.
- Update `<scratchpad>/plan.md` with the accepted findings.
- Replace the draft plan in the issue. The top of the body stays the same:

  ```bash
  cat <scratchpad>/original.md <scratchpad>/plan.md > <scratchpad>/body.md
  gh issue edit <number> --body-file <scratchpad>/body.md
  NNN=$(printf "%03d" <number>)
  mkdir -p "agent-ws/git-$NNN" && cp <scratchpad>/plan.md "agent-ws/git-$NNN/plan.md"
  ```

- Post a separate reply comment. GitHub issue comments have no threads,
  so start the reply with a link to the review:

  ```markdown
  ## 🛠 Reply to the [plan review](<review comment URL>)

  | # | Finding | Decision | Change in the plan |
  |---|---------|----------|--------------------|
  | 1 | Short name | Accepted | The step that changed |
  | 2 | Short name | Rejected | The reason |
  ```

  ```bash
  gh issue comment <number> --body-file <scratchpad>/reply.md
  ```

- Show the updated plans on screen.
- Do not write code. Do not commit or push unless the user asks.

## Finish

Add the `AI:PlanningDone` label (color `0969DA`, blue):

```bash
gh label create "AI:PlanningDone" --color 0969DA --description "An agent created and reviewed the plan" >/dev/null 2>&1
gh issue edit <number> --add-label "AI:PlanningDone"
```

Write a label banner:

```markdown
---
# 🏷 Label · AI:PlanningDone
- Issue **#42** has a reviewed plan.
```

Then write the final banner:

```markdown
---
# 🎉 Complete · Plan ready
- **Issue:** #42 · <title>
- **Added:** Implementation plan, Test plan
- **Review:** 4 findings · 3 accepted · 1 rejected
- **Plan file:** agent-ws/git-042/plan.md
```

If a plan already existed, add one line: `- **Kept:** <plan name>`.

## Writing style

Write the plans and the on-screen messages in ASD-STE100 style, as `CLAUDE.md` describes.
Use short sentences, active voice, and simple words. Technical names are permitted as they are.
