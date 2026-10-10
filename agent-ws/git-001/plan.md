
## Implementation plan

**Mockup:** agent-ws/git-001/index.html

### Server
- Create the package `server/src/ieee/portfolio/`. Put each class in its own file.
- `PortfolioItem`: the SQLAlchemy model. `ExperienceType`: an `Enum` with `PROJECT` and `WORK`.
- Contracts (`ApiModel`): `AnalyzeRequest`, `ExtractedFields`, `DuplicateMatch`, `AnalysisView`, `ImproveRequest`, `ImprovedText`, `SaveItemRequest`, and `PortfolioItemView`.
  - Limits: text 4000 characters, instruction 300, title 160, company 160, each skill 40, and at most 20 skills.
  - `DuplicateMatch` has `level` (`Enum`: `VERY_SIMILAR`, `SOME_OVERLAP`) and `reason`. The UI only shows them.
  - Each field of `ExtractedFields` and `ImprovedText` has a `description`. The schema uses `ExperienceType` and a date pattern.
- `ExperienceExtractor` and `ExperienceImprover`: two small Microsoft Agent Framework classes that use `AzureChatClientFactory`. Each has its own instructions class. Each uses a typed Pydantic response format.
  - The member text goes in the user message, not in the instructions. The instructions tell the model not to add facts.
  - Invalid model output raises an explicit `ExperienceAiError`.
- `DuplicateSearchService`: finds at most three similar items of the same owner. It compares the title, the company, and the dates. It sets the level and the reason.
- `ExperienceAnalysisService`: calls the extractor, then `DuplicateSearchService`, and returns `AnalysisView`. It writes no row.
- `PortfolioService`: lists, reads, and saves items for one owner. Rules: the text and the title are necessary, dates use `YYYY`, `YYYY-MM`, or `YYYY-MM-DD`, and the start date is not after the end date. It keeps `original_text` and `final_text`.
- `PortfolioController`: `GET /api/portfolio`, `GET /api/portfolio/{id}`, `POST /api/portfolio/analyze`, `POST /api/portfolio/improve`, and `POST /api/portfolio`. Each route uses `current_user`.
  - The analyze and improve routes are `async def`. The database query does not block the event loop.
  - Missing settings, a model failure, and invalid model output return HTTP 503 with one fixed message. The cause goes only to the log.
- `SessionController`: add `aiAvailable` to `SessionView`. The value comes from `AzureChatClientFactory.configured()`.
- `Application` in `main.py`: create the new services and the controller. Keep the extractor and the improver as attributes, so that tests can replace them before `build()`.

### UI
- Run `npm install react-markdown` in `ui/`. Commit `package.json` and `package-lock.json`.
- `ApiClient.ts`: add the types and the calls `portfolioItems`, `portfolioItem`, `analyzeExperience`, `improveExperience`, and `savePortfolioItem`.
- `App.tsx`: add the **Portfolio** menu item and the `portfolio` view, as in `index.html`.
- `PortfolioScreen.tsx`: the breadcrumb, **Add experience**, the cards, the empty state, the saved message with its dismiss button, and the **New** label on the saved card.
- `PortfolioItemScreen.tsx`: the fields, the skills, the text, **All experiences**, and **Back to your draft**.
- `AddExperienceFlow.tsx`: holds the draft, the progress steps (**Write**, **Review**, **Save**), the error message with its dismiss button, and **Cancel** in each step.
- `ExperienceEditor.tsx`: the **Write** and **Preview** tabs, the counter, **Analyze**, and the AI-at-work state.
- `ExperienceReview.tsx`: the fields form, the type switch, the skill chips, the "Not found" hints, the duplicate warning with links, the no-duplicate note, and **Edit text**.
  - It shows the tags **Your original text, unchanged** and **Improved by AI**, and **Restore my original text**.
  - **Approve & save** is not available while the AI works or while a comparison is open.
- `ImprovePanel.tsx`: the instruction field, the three suggestions, the AI-at-work state, the error message, the side-by-side comparison, **Use improved version**, **Keep original**, **Try again**, and the close button.
- `MarkdownView.tsx`: renders Markdown with `react-markdown`. It does not render raw HTML or `javascript:` links.
- `styles.css`: copy the portfolio styles from `agent-ws/git-001/styles.css`. Keep the light theme, the dark theme, and the phone layout.
- When `aiAvailable` is false, show a clear message and disable **Analyze**.
- The UI shows the server validation message. It does not repeat the validation rules.
- **Insert sample text**, **Empty list**, and **AI error** are mockup aids. Do not build them.

### Database
- Alembic migration `v4_create_portfolio_items.py`: table `portfolio_item` with `id`, `owner_id`, `type`, `title`, `company`, `start_date`, `end_date`, `skills` (JSON), `original_text`, `final_text`, and `created_at`.
- Add indexes on `owner_id` and on `(owner_id, company)`.

## Test plan

### Unit tests
- Server `test_portfolio_service.py`: save and list are scoped to the owner. Empty text, an empty title, invalid dates, and a start date after the end date are rejected. `original_text` stays the same when the final text is the improved text.
- Server `test_duplicate_search_service.py`: finds a similar title at the same company, sets the level and the reason, returns at most three matches, and ignores items of other owners.
- Server `test_experience_extractor.py` and `test_experience_improver.py`: use a scripted chat client. They return typed results. The improver works with and without an instruction. Invalid model output raises `ExperienceAiError`.
- Server `test_experience_analysis_service.py`: joins the fields and the matches. Analyze writes no row.
- Server `test_portfolio_controller.py`:
  - Anonymous calls return 401. Calls without the CSRF token return 403.
  - Text over 4000 characters and an instruction over 300 characters return 400.
  - A read of another owner's item returns 404.
  - Missing settings and a model failure return 503 with the fixed message, for analyze and for improve.
  - Analyze and improve write no row. Only `POST /api/portfolio` stores an item.
- Server `test_application_security.py`: `aiAvailable` is true with settings and false without settings.
- Server `test_migrations.py`: the `portfolio_item` table exists after the migration.
- UI `ApiClient.test.ts`: the portfolio calls send typed bodies and the CSRF header.
- UI `portfolio.spec.ts` (Playwright, desktop and phone, simulated API):
  - The full flow: write, preview, analyze, improve, accept, approve, and the **New** card.
  - The states: empty list, AI at work, AI error for analyze and for improve, duplicate warning, no duplicate, and AI not available.
  - The controls: **Edit text**, **Restore my original text**, **Keep original**, **Try again**, **Cancel**, **Back to your draft**, and **All experiences**.
  - **Approve & save** is disabled while a comparison is open.
  - `MarkdownView` shows no raw HTML and no `javascript:` link.

### Manual tests
Follow the **How to test** section of the story. Then check each mockup state:

1. Open **Portfolio** with no saved items. Compare the empty state with the mockup.
2. Add the sample text. Select **Preview**. Compare with the mockup.
3. Select **Analyze**. Check the AI-at-work state, then the fields and the unchanged text.
4. Select **Edit text**. Check that the write step shows your text. Select **Analyze** again.
5. Add a similar experience. Check the duplicate warning, the level, and the reason. Open a link. Select **Back to your draft**.
6. Use **Improve with AI**. Compare the side-by-side view with `desktop-preview.png` and `mobile-preview.png`.
7. Select **Use improved version**, then **Restore my original text**. Check the tags.
8. Select **Approve & save**. Check the saved message and the **New** card. Open the card. Select **All experiences**.
9. Start the server without the Azure settings. Check the clear message and the disabled **Analyze** button.
10. Repeat steps 1 to 8 in the dark theme and at phone width.

**Expected result:** Each state matches the mockup. The app saves an item only after **Approve & save**.
