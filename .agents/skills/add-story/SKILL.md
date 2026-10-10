---
name: add-story
description: Turn a requirement into a short user story, create it as a GitHub issue, and build a high-quality clickable mockup in agent-ws/git-NNN. Shows each step clearly for a live audience. Use when the user asks to add, write, or create a story, user story, or feature request.
---

# Add a user story

This skill runs in live demos. The audience watches the screen.
Keep the story short and simple. Make the mockup high quality.

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
# 🎉 Complete · Story ready
- **Issue:** #42 · <title>
- **URL:** <url>
```

Banner rules:

- Put at most three bullets in a done banner. Each bullet states one result.
- Use bold text for numbers, names, and links that the audience must see.
- Do not put long text, code, or tables in a banner. Show long content after the banner.
- Use short, plain sentences. The text must be readable on a projector from the back of a hall.
- Show the full story text on screen before you create the issue.

The steps are:

1. Understand the requirement
2. Explore the code
3. Ask questions
4. Write the story
5. Create the GitHub issue
6. Build the mockup

## Step 1 · Understand the requirement

- Use the requirement in the skill arguments or in the user's message.
- If there is no requirement, ask for it in one short question.
- Restate the requirement in one sentence.

## Step 2 · Explore the code

- Read `CLAUDE.md` (section **GitHub issues**) and `docs/development/architecture-conventions.md`.
- Find the UI screens, services, and server endpoints that the requirement touches.
- Read `ui/src/styles.css` and the related components. The mockup must match the real app.
- Tell the audience which parts of the app the story changes.

## Step 3 · Ask questions

- Ask two or three questions in one `AskUserQuestion` call.
- Ask about choices that change what the user sees or gets. Put a recommended option first.
- Make reasonable decisions for all other details. List them as assumptions.

## Step 4 · Write the story

Use this structure:

```markdown
As a [user], I want [capability], so that [benefit].

## Acceptance criteria
- [ ] Short, observable results.

## How to test
1. Short steps.

**Expected result:** The result that the tester sees.

## Assumptions
- Decisions made without a user answer.

## Technical notes
- The parts of the app that change (screens, services, endpoints).
```

- Keep the story short and simple. It is an illustration.
- Give the issue a short title that states the user's result.
- Keep the first sentence free of implementation details.
- Show the full story on screen.

## Step 5 · Create the GitHub issue

Write the body to a file in the scratchpad directory. Then run:

```bash
gh label create user-story --color 0E8A16 --description "User story" >/dev/null 2>&1
URL=$(gh issue create --title "<title>" --label user-story --body-file <body-file>)
NNN=$(printf "%03d" "${URL##*/}")
mkdir -p "agent-ws/git-$NNN" && cp <body-file> "agent-ws/git-$NNN/story.md"
echo "$URL agent-ws/git-$NNN"
```

- The folder name uses the issue number with three digits: issue 7 gives `agent-ws/git-007`.
- Show the issue URL on screen.

## Step 6 · Build the mockup

Create a high-quality, clickable mockup in `agent-ws/git-NNN/`:

- `index.html`, `styles.css`, and `mockup.js` if the mockup needs behavior.
- No build step. The page must open directly from the file.
- Match the real app: copy the colors, fonts, spacing, components, and layout from `ui/src/styles.css`.
- Show the main flow of the story. Include empty, error, and success states where they help.
- Support light and dark themes, and phone width without horizontal scroll.
- Mark the page as a mockup. Use sample data only.
- Take a desktop screenshot and a phone screenshot. Fix any visual problem that you see.
- Save the screenshots as `desktop-preview.png` and `mobile-preview.png` in the issue folder.
- Open the mockup in the browser so the audience can see it.

Then add the mockup path to the issue:
`gh issue comment <number> --body "Mockup: agent-ws/git-NNN/index.html"`.

Do not commit or push unless the user asks.

## Finish

Write the final banner:

```markdown
---
# 🎉 Complete · Story ready
- **Issue:** #42 · <title>
- **URL:** <url>
- **Mockup:** agent-ws/git-042/index.html
```

Then list the assumptions below the banner.

## Writing style: ASD-STE100 (Simplified Technical English)

Write the issue, the on-screen messages, and the mockup text in ASD-STE100 style.
Follow it about 90%: keep these rules, but do not check each word against the STE dictionary.

- **Short sentences.** At most 20 words for an instruction, 25 words for a description.
- **One topic in each sentence.** One instruction in each sentence.
- **Active voice.** Say who or what does the action.
- **Simple tenses.** Use present, past and future simple. Use the imperative for instructions.
- **One word, one meaning.** Use the same word for the same thing each time.
- **Simple, common words.** Do not use idioms, figures of speech, or filler words.
- **No `-ing` forms** as verbs or nouns where a simple form is available.
- **No noun clusters** longer than three words.
- **Keep the articles** (`the`, `a`, `an`). Do not write in telegraphic style.
- **Use vertical lists** for steps and for sets of items.

Technical names are permitted as they are.
