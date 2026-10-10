As a professional, I want to open a portfolio item and change it with help from an AI assistant,
so that my portfolio stays correct and strong for a resume or an essay.

## Acceptance criteria
- [ ] The Portfolio list shows my saved items. I select an item to open it.
- [ ] I can change the title, type, company, dates, skills, and text of the item.
- [ ] I can switch between **Write** and **Preview** for the text.
- [ ] An assistant pane is next to the item. The assistant knows the open item and my unsaved changes.
- [ ] I can talk to the assistant in several turns. The conversation stays while I work on the item.
- [ ] Quick actions send common requests: **Improve the text**, **Suggest skills**, **Update the fields**, **Ask me for missing facts**, and **Write resume bullets**.
- [ ] The assistant shows each change as a proposal in the form. The proposal shows the current value and the new value.
- [ ] I accept or reject each proposal. A rejected proposal changes nothing.
- [ ] The assistant asks me for a missing fact, and uses my answer in the next proposal.
- [ ] The assistant does not add facts that I did not give.
- [ ] The app stores my changes only when I select **Save changes**.
- [ ] The app asks me before it discards unsaved changes.
- [ ] I see a clear message when the assistant is not available. I can still edit and save.
- [ ] I can change only my own items.
- [ ] The screen works on a phone and in the light and dark themes.

## How to test
Prerequisites: the application runs with the Azure model settings. You are signed in. Your portfolio has one item.

1. Open **Portfolio**. Select an item.
2. Change the company. Check that **Save changes** becomes available.
3. Select **Improve the text** in the assistant pane.
4. Compare the current text and the proposed text. Select **Accept**.
5. Select **Suggest skills**. Accept one skill and reject one skill.
6. Select **Ask me for missing facts**. Answer the question of the assistant.
7. Accept the new proposal. Select **Save changes**.
8. Open the item again.

**Expected result:** Step 4 changes the text in the form. Step 5 adds only the accepted skill.
Step 6 gives a proposal that contains your answer. Step 8 shows all saved changes.

## Assumptions
- The item screen opens in edit mode. The story has no separate read-only screen.
- The conversation starts new when I open a different item or reload the page.
- Resume bullets are a proposal that adds a section at the end of the text.
- The app keeps the original text from issue #1 unchanged. A save replaces only the final text and the fields.
- On a phone, the assistant opens from a button and covers the lower part of the screen.
- Delete of an item is not part of this story.
- The assistant cannot save. Only the user saves.

## Technical notes
- UI: `PortfolioItemScreen.tsx` gets an edit form. A new assistant pane uses the AG-UI protocol.
- UI: the assistant changes the form through frontend tools: propose text, propose skills, and propose fields.
- UI: the page sends the open item and the unsaved form values to the agent as context.
- Server: a new `PUT /api/portfolio/{id}` endpoint in `PortfolioController`, with rules in `PortfolioService`.
- Server: a portfolio agent with Microsoft Agent Framework and `agent-framework-ag-ui`. Add the package again.
- Server: the agent endpoint is scoped to the authenticated subject and checks the CSRF token.
- Follow `agent-ws/ai-best-practices.md`: page and task awareness, frontend tools, and accept or undo for each change.
- This story depends on issue #1.
