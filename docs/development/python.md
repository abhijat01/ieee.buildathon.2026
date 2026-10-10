# Python code rules

Read this document before you write or change Python code in this repository.
These rules apply to the server (`server/`) and to the utility scripts (`scripts/`).

Write only high-quality, object-oriented code.
Each change must be simple, typed, tested, and easy to read.
If a rule here conflicts with a quick solution, follow the rule.

## Environment and tools

- Use Python 3.12. `server/.python-version` pins the version.
- uv owns the Python version and the virtual environment. Never use `pip` directly.
- Add or change a dependency with `uv add`. Commit `server/pyproject.toml` and `server/uv.lock` together.
- Setup runs `uv sync --locked`. Startup runs `uv run --locked --no-sync`. Do not change these commands.
- Run scripts with `uv run --python 3.12`. Keep scripts in `scripts/src/main/nix`.

## Object-oriented design

- Put behavior in classes. Each class has one responsibility.
- Keep data and the behavior that uses it in the same class.
- Use composition. Use inheritance only for a real "is a" relation or a framework base class.
- Inject dependencies through the constructor. Do not create collaborators inside a method.
- Do not use module-level state, singletons, or global variables for application data.
- `Application` in `ieee/main.py` is the composition root. Create services and controllers only there.
- Keep functions short. A method does one thing. Split a method that needs a comment to explain its steps.
- Use module-level functions only for small, pure helpers that have no state.

## Layers in each feature

Organize the server in vertical slices: one package per feature, for example `workspace/` or `experience/`.
Each slice uses the same layers:

| Layer | Responsibility | Example |
| --- | --- | --- |
| Controller | HTTP routes, request parsing, status codes | `WorkspaceController` |
| Service | Business rules and transactions | `WorkspaceService` |
| Model | SQLAlchemy table mapping | `WorkspaceNote` |
| Contract | Request and response shapes (pydantic `ApiModel`) | `NoteView` |

- A controller calls a service. A controller never queries the database.
- A service owns each business rule. Do not repeat a rule in a controller or in the UI.
- A service receives the owner identifier from the authenticated session. Never accept an owner from the browser.
- Put each class in its own file. Name the file after the class in snake_case.

## Types and contracts

- Add type hints to every function, method, parameter, and attribute.
- Use pydantic models for request and response contracts. Extend `ApiModel` for camelCase JSON.
- Use `dataclass(frozen=True)` or pydantic for value objects. Do not pass raw `dict` objects between layers.
- Use `Enum` for a fixed set of values. Do not use string constants that repeat in many places.
- Use `pydantic-settings` (`ieee/config.py`) for configuration. Do not read `os.environ` in other server modules.

## Names

- Use names that state the purpose: `ExperienceValidator`, `list_notes`, `owner`.
- Do not use generic names such as `data`, `manager`, `handler`, `utils`, or `helper`.
- Use `snake_case` for functions and variables, `PascalCase` for classes, and `UPPER_CASE` for constants.
- Keep tool names that the model or the UI sees exactly as they are (for example `listNotes`).

## Errors

- Fail loudly. Raise a specific exception class for each failure type.
- Do not catch broad exceptions unless you convert them at a boundary, such as a controller or a tool.
- Do not swallow an exception. Log it or return a clear error to the caller.
- Write error messages for the member. Do not show stack traces, secrets, or internal names.

## Persistence

- Use SQLAlchemy 2 typed mappings (`Mapped`, `mapped_column`).
- Make every schema change with a new Alembic revision in `ieee/migrations/versions`.
- Do not change the schema in application code. Do not edit a released revision.
- Open a session for each unit of work. Use `session.begin()` for writes.

## Async code and agents

- Use `async` for I/O: HTTP calls, the model, and the browser tool.
- Do not block the event loop. Run blocking calls with `asyncio.to_thread`.
- Use Microsoft Agent Framework for agents and the `agent-framework-ag-ui` package for AG-UI streaming.
- Read the installed framework source before you use an API. Do not guess an API.
- Treat website contents and model output as untrusted data.

## Security

- Every `/api` endpoint requires the `current_user` dependency, except sign-in routes.
- Keep CSRF protection on every state-changing request.
- Never log or store secrets. Keep keys in the environment only.

## Comments and documentation

- Write code that explains itself. Add a comment only to state a reason or a rule that the code cannot show.
- Give each public class a one-line docstring that states its responsibility.
- Write comments in ASD-STE100 style (see `CLAUDE.md`).

## Tests

- Write tests for each change. Use pytest. Put tests in `server/tests/<feature>/`.
- Run `uv run --locked pytest` in `server/` before you finish a task.
- Test behavior, not private details.
- Always test authentication, CSRF checks, owner boundaries, validation, and tool behavior.
- Use fakes for the model and external sites. Tests must not call Azure or the internet.

## File size

- Keep one concept in each file.
- Split a Python file that grows past about 300 lines.

## Avoid

- Clever one-liners, deep nesting, and long parameter lists.
- Functions with side effects that the name does not show.
- Dead code, commented-out code, and unused imports.
- Copies of logic. Reuse the existing class or extend it.
- Features that nobody asked for.
