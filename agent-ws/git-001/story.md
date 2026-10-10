As a professional, I want to add an experience to my work portfolio with help from AI,
so that I can use it later to build a resume or write a personal essay.

## Acceptance criteria
- [ ] The left menu has a **Portfolio** item. It opens a list of my saved portfolio items.
- [ ] I can add an experience as plain text or Markdown.
- [ ] I can switch between **Write** and **Preview** to see the Markdown as formatted text.
- [ ] **Analyze** shows the extracted fields: title, type, company, start date, end date, and skills.
- [ ] The type is **Project** or **Work experience**.
- [ ] The analysis does not change my original text.
- [ ] I can edit each extracted field before I save.
- [ ] The preview shows a warning when a similar item exists. The warning links to each similar item.
- [ ] I can still save an item that has a duplicate warning.
- [ ] **Improve with AI** accepts an optional instruction and shows the original and the improved text side by side.
- [ ] I can accept or reject the improved text. I can ask for an improvement again.
- [ ] The app stores the item only when I select **Approve & save**.
- [ ] The saved item appears in the list. I can open it to read it.
- [ ] I see only my own portfolio items.
- [ ] The screen works on a phone and in the light and dark themes.

## How to test
Prerequisites: the application runs with the Azure model settings. You are signed in.

1. Open **Portfolio** from the left menu. Select **Add experience**.
2. Paste a Markdown description of a project. Select **Preview**.
3. Select **Analyze**.
4. Check the extracted fields. Change one field.
5. Select **Improve with AI**. Type `Make the results measurable`. Select **Improve**.
6. Compare the two versions. Select **Use improved version**.
7. Select **Approve & save**.
8. Add the same experience again. Select **Analyze**.
9. Select the link in the duplicate warning.

**Expected result:** Step 2 shows formatted text. Step 4 shows the correct fields and the unchanged text.
Step 7 adds the item to the list. Step 8 shows a duplicate warning. Step 9 opens the first item.

## Assumptions
- The AI extracts these fields: title, type, company, start date, end date, and skills.
- Dates use the format `YYYY`, `YYYY-MM`, or `YYYY-MM-DD`. The end date can be empty for current work.
- The app does not save a draft. A cancel discards the text.
- The duplicate check compares the new item only with the user's own items.
- The app shows at most three similar items.
- Edit and delete of a saved item are not part of this story.
- Search and filters in the list are not part of this story.
- Without the Azure model settings, the screen shows a clear message and Analyze is not available.

## Technical notes
- UI: a new Portfolio screen in `ui/src/components`, a menu item in `App.tsx`, and new calls in `ApiClient.ts`.
- Server: a new `portfolio` package in `server/src/ieee` with a controller, services, and a SQLAlchemy model.
- Endpoints: list items, read one item, analyze, improve, and save. All are scoped to the authenticated subject.
- Database: a new Alembic migration for the portfolio table. Store the original text, the final text, and the fields.
- AI: use Microsoft Agent Framework with typed Pydantic schemas for the extraction and the improvement.
- Duplicate search: a server service finds similar items. The agent does not repeat this rule.
- Follow `agent-ws/ai-best-practices.md` and `docs/development/python.md`.
