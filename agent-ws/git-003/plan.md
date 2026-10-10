
## Implementation plan

**Mockup:** agent-ws/git-003/index.html

The acceptance criteria and the assumptions above define the scope. This plan does not repeat them.

### Server
- Create the package `server/src/ieee/resume`. Put one class in each file.
- `PortfolioService`: add `get_items(owner, item_ids)`. It returns the items of the owner. It raises `PortfolioItemNotFound` if one identifier is not an item of the owner.
- `resume_limits.py`: 8000 characters for the job description, 50 keywords of 60 characters each, 100 item identifiers of 36 characters each, and 1500 characters of each item text for the analysis.
- `AnalyzeJobRequest` and `WriteResumeRequest`: Pydantic requests that use these limits. `WriteResumeRequest` has the job description, the keywords from the analysis, and the item identifiers.
- `JobAnalyst`: a `StructuredAgent` with `JobAnalystInstructions`. The schema `JobAnalysis` has the job title, the company, the requirements, the keywords, and one `ItemReview` for each item. `ItemReview` has the item identifier, a `RelevanceLevel` enum (`HIGH`, `MEDIUM`, `LOW`), a reason, and the matched keywords.
- `DescriptionTailor`: a `StructuredAgent` with `TailorInstructions`. The schema `TailoredResume` has a summary and one improved description for each included item.
- Give each schema field a `description` and a `max_length`. The instructions tell each agent to treat the job text, the keywords, and the item text as data.
- `PortfolioPrompt`: build the agent message from the items. Send only the identifier, the type, the title, the company, the dates, the skills, and the text. Shorten each text for the analysis to the limit.
- `JobAnalysisService.analyze(owner, job_text)`: read the items with `PortfolioService.list_items` in `asyncio.to_thread`. Raise a `ResumeValidationError` if the portfolio is empty. Run `JobAnalyst`. Reject a result with an unknown, missing, or repeated item identifier as `ExperienceAiError`. Set `proposed` to true for the `HIGH` and `MEDIUM` items. This rule lives only in this service.
- `KeywordCheckService`: sort the job keywords into three groups: in the resume, in excluded items, and not in the portfolio. Match each keyword against the portfolio text and the skills of the items, not against the AI text. The match rule lives only here: an exact match of the full keyword on word limits, with no difference for the letter case. A plural form does not match.
- `TailoredResumeCheck`: the server rule that protects the facts. Reject a `TailoredResume` with a missing, unknown, or repeated item identifier, or with a text over 4000 characters. Reject a summary or a description that contains a job keyword from the group **Not in your portfolio**. Each rejection raises `ExperienceAiError`.
- `ResumeFormatter`: build the Markdown without the AI. It holds the ATS format rules: the name, the contact placeholders, `Summary`, `Skills`, `Work Experience`, `Projects`, one column, plain bullets, and plain dates. The `Skills` line has the covered keywords first, then the other skills of the included items, with no repeated skill. It removes tables, images, and raw HTML from the improved descriptions. It returns the list of format checks.
- `ResumeWriterService.write(owner, name, request)`: read the items in `asyncio.to_thread`. Run `KeywordCheckService` first. Run `DescriptionTailor`, then `TailoredResumeCheck`, then `ResumeFormatter`. Return a `ResumeView` with the Markdown, the file name, the original and improved text of each item, and the ATS check. It stores nothing.
- `ResumeController`: add `POST /api/resume/analyze` and `POST /api/resume/write`. Each route uses `current_user`. Map `PortfolioItemNotFound` to 404.
- `main.py`: create the services and register `ResumeController`. Map `ResumeValidationError` to 400. The existing handler maps `ExperienceAiError` to 503.

### UI
- `ApiClient.ts`: add the types `JobAnalysis`, `ItemReview`, `Resume`, and `AtsCheck`. Add `analyzeJob(text)` and `writeResume(jobText, keywords, itemIds)` on the existing `post` method.
- `App.tsx`: add the **Resume** rail button with the scroll icon, after **Portfolio**, as `index.html` shows. Add the view `resume`. Hide the breadcrumb and the title of `App.tsx` for this view, as for `portfolio`.
- `App.tsx`: render `ResumeScreen` with `api`, `aiAvailable`, `onAuthExpired`, and `onOpenPortfolio`. `onOpenPortfolio` sets the view to `portfolio`.
- `ResumeScreen.tsx`: hold the step, the job text, the analysis, the included identifiers, and the resume. Show the breadcrumb, the title, the intro line for each step, the 3-step progress list, and the error banner with the **Dismiss error** button from `mockup.js`. A reload starts a new resume.
- `ResumeScreen.tsx`: load `portfolioItems()` first. Show the empty state with **Open Portfolio** when the list is empty. Show the info note and set **Analyze** to off when `aiAvailable` is false.
- `ResumeJobStep.tsx`: the **Job description** panel, the text area with the `0 / 8000` counter, the AI note, and **Analyze**. Do not add the mockup button **Insert sample text**.
- `ResumeSelectStep.tsx`: the **What the job needs** panel and the **Your portfolio items** list. Each row has the include switch, the type badge, the relevance level, the reason, the matched keywords, and the tag **Proposed by AI**, **Not proposed by AI**, or **Changed by you**. Add **Change the job description** and **Write resume**. **Write resume** is off when no item is included.
- `ResumeResultStep.tsx`: the **Your resume** panel with the **Preview** and **Markdown** tabs, **Copy Markdown** with the **Copied** state, and **Download .md**. Use `MarkdownView` for the preview. Add **Change the selection** and **Start a new resume**.
- `AtsCheckPanel.tsx`: the keyword meter, the three keyword groups, and the format list. Hide a keyword group that is empty.
- `ImprovedDescriptions.tsx`: one row for each included item. A row opens and closes with `aria-expanded`. An open row shows **In your portfolio** and **In the resume** side by side.
- `ResumeFile.ts`: a service class for the clipboard copy and the `.md` download. The components do not use the browser APIs directly.
- `styles.css`: copy the new rules from `agent-ws/git-003/styles.css`. These include the steps, the switch, the relevance labels, the meter, the tabs, the compare layout, and the phone and dark theme rules.
- Show the two loading panels with the texts from `mockup.js`. Show the 503 message of the server in the error banner. Keep the job text and the selection after an error.

## Test plan

### Unit tests
- Server `test_job_analyst.py` and `test_description_tailor.py`: use `scripted_chat_client.py`. Check the schema, the instructions, and an invalid result.
- Server `test_job_analysis_service.py`: the service proposes the `HIGH` and `MEDIUM` items. It rejects an empty portfolio. It rejects an AI result with an unknown, missing, or repeated item identifier. It sends only the items of the owner. The message for 100 items stays in the limit.
- Server `test_keyword_check_service.py`: each keyword goes into the correct group. `SQL` does not match `PostgreSQL`. A keyword of two words matches. A plural form does not match. The match ignores the letter case.
- Server `test_tailored_resume_check.py`: the check rejects a wrong item identifier, a text over 4000 characters, and a text with a keyword that the portfolio does not support.
- Server `test_resume_formatter.py`: the Markdown has the standard headings in the correct order and only the included items. It has no table, image, or HTML. It omits an empty section. The `Skills` line has the covered keywords first, no repeated skill, and no keyword from **Not in your portfolio**.
- Server `test_resume_writer_service.py`: the resume uses only the included items. The original text equals the portfolio text. The portfolio rows are unchanged after the call. An AI failure gives `ExperienceAiError`.
- Server `test_resume_controller.py`: both routes give 401 without a session and 403 without the CSRF token. An item of a different member gives 404. A job description over 8000 characters gives 400. More than 50 keywords give 400. An AI failure gives 503.
- Server `test_portfolio_service.py`: `get_items` returns only the items of the owner and raises for an unknown identifier.
- UI `ApiClient.test.ts`: `analyzeJob` and `writeResume` send the CSRF header and the correct body. A 503 response gives an `ApiError` with the server message.
- UI `ResumeFile.test.ts`: the download uses the file name of the server and the `text/markdown` type.
- UI `ui/tests/resume.spec.ts` (Playwright, mocked API): the full flow, the include switch with the **Changed by you** tag, **Write resume** off, the two tabs, the copy state, the download, the empty state, the state without AI, and the AI error state. One case runs at a width of 390 px.

### Manual tests
1. Do the steps in **How to test** above with three portfolio items or more.
2. Compare each step with `agent-ws/git-003/desktop-preview.png` and the mockup page.
3. Step 2: change one switch. Make sure that the tag changes to **Changed by you**. Exclude all items. Make sure that **Write resume** is off.
4. Step 3: open one compare row. Make sure that the facts and the numbers are the same in both versions.
5. Step 3: make sure that the **Not in your portfolio** keywords are not in the resume text.
6. Sign in as a member with an empty portfolio. Open **Resume**. Compare with the mockup state **Empty portfolio**. Select **Open Portfolio**.
7. Start the server without the Azure model settings. Open **Resume**. Make sure that the info note shows and **Analyze** is off.
8. Stop the network access to the model. Select **Analyze**, then **Write resume**. Compare with the mockup state **AI error**. Dismiss the error.
9. Repeat steps 1 to 4 at a phone width of 390 px and in the dark theme. Compare with `agent-ws/git-003/mobile-preview.png`.
10. Reload the page. Make sure that the screen starts again at **Job description**.

**Expected result:** Each screen agrees with the mockup. The resume contains only the included items and only facts from the portfolio. The portfolio items stay unchanged. Each error shows a clear message and keeps the input of the member.
