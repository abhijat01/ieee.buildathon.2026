As a professional, I want to get a resume that fits a job description from my portfolio with help from AI,
so that I can apply for the job with a strong and honest resume.

## Acceptance criteria
- [ ] The left menu has a **Resume** item. It opens the resume builder.
- [ ] I can paste a job description as plain text.
- [ ] **Analyze** shows the main requirements and keywords that the agent found in the job description.
- [ ] The agent reviews each of my portfolio items. Each item shows a relevance level and a short reason.
- [ ] The agent proposes which items to include. I can include or exclude each item.
- [ ] **Write resume** gives a resume in Markdown that uses only the included items.
- [ ] The agent improves the description of each included item for the job. I can compare the original and the improved description.
- [ ] The agent does not add or change facts. It uses only facts from my portfolio.
- [ ] The resume has a format that is safe for Applicant Tracking Systems (ATS): standard section headings, one column, plain bullets, and no tables or images.
- [ ] The resume uses the keywords from the job description only where my portfolio supports them.
- [ ] An ATS check shows which keywords the resume covers and which keywords are missing from my portfolio.
- [ ] I can switch between **Preview** and **Markdown**. I can copy the Markdown and download a `.md` file.
- [ ] The app does not change my portfolio items.
- [ ] I see a clear message when my portfolio is empty or when the AI is not available.
- [ ] The agent uses only my own portfolio items.
- [ ] The screen works on a phone and in the light and dark themes.

## How to test
Prerequisites: the application runs with the Azure model settings. You are signed in. Your portfolio has three items or more.

1. Open **Resume** from the left menu.
2. Paste a job description. Select **Analyze**.
3. Check the requirements, the keywords, and the relevance of each portfolio item.
4. Exclude one proposed item. Include one item that the agent did not propose.
5. Select **Write resume**.
6. Compare the original and the improved description of one item.
7. Check the ATS check. Select **Markdown**.
8. Select **Copy Markdown**. Select **Download .md**.
9. Open **Portfolio**. Open one item that the resume uses.

**Expected result:** Step 3 shows a level and a reason for each item. Step 5 gives a resume with only the included items.
Step 6 shows the same facts in both versions. Step 8 gives the Markdown text and a file. Step 9 shows the unchanged item.

## Assumptions
- The member pastes the job description. File upload is not part of this story.
- The job description has a maximum of 8000 characters.
- The relevance levels are **High**, **Medium**, and **Low**. The agent proposes the High and Medium items.
- The resume contains a name, a summary, skills, work experience, and projects. Contact details stay as placeholders for the member.
- The app does not store the job description or the resume. A reload starts a new resume.
- Edit of the resume text in the app is not part of this story.
- PDF and Word formats are not part of this story.

## Technical notes
- UI: a new Resume screen in `ui/src/components`, a menu item in `App.tsx`, and new calls in `ApiClient.ts`.
- Server: a new `resume` package in `server/src/ieee` with a controller and services.
- Endpoints: `POST /api/resume/analyze` (requirements, keywords, and relevance for each item) and `POST /api/resume/write` (Markdown resume, improved descriptions, and ATS check).
- Both endpoints are scoped to the authenticated subject and check the CSRF token. The browser sends item identifiers only.
- AI: use Microsoft Agent Framework with typed Pydantic schemas, as `StructuredAgent` in the `portfolio` package does.
- The ATS format rules and the keyword check live in a server service. The agent instructions do not repeat them.
- A server rule checks that each included item belongs to the member. The agent reads items through `PortfolioService`.
- No database change.
- Follow `agent-ws/ai-best-practices.md` and `docs/development/python.md`.
- This story depends on issue #1.
