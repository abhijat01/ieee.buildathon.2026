# Claude Code Guidelines

Important: Be concise and clear. Use simple language, avoid unnecessary jargon and 
abbreviations. 

Before setup, startup, shutdown, or deployment when multiple instances share a host,
read [Separate application instances](agent-ws/multi-instance-support.md).
Use an explicit deployment profile to protect other instances.

Before you configure demo access or change public URLs, read
[Internal and external demo access](docs/deployment/demo-access.md).
Use `./access.sh` to switch access modes and preserve other Tailscale services.

Before you write or change LLM calls, agents, agent tools, or the UI agent, read
[AI best practices](agent-ws/ai-best-practices.md).

## GitHub issues

Track all user stories, bugs, tasks, and other project work in this repository's GitHub issues.
Use the `user-story` label for user stories. Use the `bug` label for bugs.

Start each user story's main description with a simple statement:
"As a [user], I want [capability], so that [benefit]."
Use plain language that describes the user's need and expected result.
Keep implementation details in separate sections, such as **Technical notes**.
Other sections can use technical language when necessary.

Include a **How to test** section in each user story issue.
State the prerequisites, test steps, and expected results.
Include acceptance criteria that define when the story is complete.

For bugs, describe the steps to reproduce, expected behavior, and actual behavior.
Link related issues and pull requests so the work remains traceable.

## Writing style: ASD-STE100 (Simplified Technical English)

Write replies, documents, reviews, issues and code comments in the style of
ASD-STE100. Follow it about 90%: keep the rules below, but do not check each word
against the STE dictionary.

- **Short sentences.** Maximum 20 words for an instruction, 25 words for a description.
- **One topic in each sentence.** One instruction in each sentence.
- **Active voice.** Say who or what does the action.
- **Simple tenses.** Use present, past and future simple. Use the imperative for instructions.
- **One word, one meaning.** Use the same word for the same thing each time.
- **Simple, common words.** Do not use idioms, figures of speech or filler words.
- **No `-ing` forms as verbs or nouns** where a simple form is available.
- **No noun clusters** longer than three words.
- **Keep the articles** (`the`, `a`, `an`). Do not write in telegraphic style.
- **Use vertical lists** for steps and for sets of items.

Technical names (class names, commands, domain terms such as "follow-up" or
"disposition") are permitted as they are. Do not change them to simpler words.


## Design documents

Read the document for your language before you write code:

- **Python (server and scripts):** [docs/development/python.md](docs/development/python.md).
  Write only high-quality, object-oriented Python code. Follow every rule in that document.
- **TypeScript/React (UI):** the **UI** section below.

Read [Architecture conventions](docs/development/architecture-conventions.md) before you start new work.
It describes the server and UI boundaries, persistence, security, and the agent.

## Core design principles

1. **Simplicity over cleverness.** Write simple, clear, self-explanatory code.
   Avoid unnecessary abstraction. Prefer the explicit approach over the clever one.
2. **Object-oriented.** Use classes. Keep related data and behavior together.
   Follow SOLID where applicable. Prefer composition over inheritance.
3. **Clear contracts.** Use explicit types and interfaces. Names describe purpose.
4. **Separation of concerns.** Give each module, class, and function one responsibility.
   Keep business logic, presentation, and data access separate.
5. **High cohesion, low coupling.** Group related code. Keep dependencies between modules small.
6. **Right-sized files.** Put one concept in each file. Split Python files over about 300 lines
   and TypeScript files over about 1000 lines.

### Avoid

- Long functions that do many things. Large files with mixed responsibilities.
- Generic names (`data`, `manager`, `handler`). Hidden dependencies and tight coupling.
- Clever one-liners that are hard to read. Missing or unclear types.

## Architecture

The backend is a **Python** server. This split is deliberate. Do not move server work to other languages.

**Server (Python, `server/`)**
- The server is a uv project. The package is `server/src/ieee`.
- **REST services:** all endpoints use FastAPI.
- **Database access:** SQLAlchemy 2 owns persistence, queries, and transactions.
- **Database versioning:** Alembic owns all schema changes.
- **Business rules:** each rule lives in one server service. Do not repeat a rule in the UI.
- **Authentication:** OIDC with Authlib. Tokens and secrets stay on the server.
- **AI agent:** Microsoft Agent Framework. AG-UI streaming uses `agent-framework-ag-ui`.
- **Python environment:** uv owns the Python version and the virtual environment.
  Never use pip directly. Add dependencies with `uv add` and commit `server/uv.lock`.

**UI (`ui/`)**
- Use React with TypeScript.
- Write object-oriented TypeScript: class components and service classes. Avoid functional components.
- Write simple, clean, concise classes.
- Follow UI and UX best practices. Keep the interface easy to understand and use.
- Give clear affordances. Always check the UI visually to make sure that it looks clean.
- Support mobile devices as first-class clients.

**General**
- Always write tests and run them.
- Run the full regression before you create a pull request. No regression is permitted.
- Keep `create-env.sh` and `run-all.sh` at the top level.
- Put all other utility scripts in `scripts/src/main/nix` (and `scripts/src/main/win` if Windows is supported).
- Write scripts in Python. Run them with uv.

## Summary

Write code that is **simple and maintainable**, uses **classes/OOP**, has **clear
interfaces and types**, follows **separation of concerns**, achieves **high
cohesion and low coupling**, is organized into **right-sized files**, and
**includes comprehensive unit tests**. When in doubt, choose the simpler, more
explicit approach. Do not write smart code, write simple code. 
