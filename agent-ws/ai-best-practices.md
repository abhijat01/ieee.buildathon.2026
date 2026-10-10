# AI best practices

Follow these rules for all LLM calls, agents, and agent tools in this project.

## Structured output

- Give each LLM or agent call a schema when the call returns data.
- Define the schema as a typed Pydantic model.
- Pass the Pydantic model to the framework as the response format.
- Read the result as a validated Pydantic object.
- Do not parse the model text by hand. Do not use regular expressions, string splits, or `json.loads` on model output.
- Use field types, enums, and constraints to limit the allowed values.
- Give each field a clear `description`. The model reads these descriptions.
- When validation fails, handle the error explicitly. Do not hide the error with a default value.
- Use free text only when the result is for a human reader, such as a chat reply.

## Microsoft Agent Framework

- Use Microsoft Agent Framework for all agents and LLM calls where possible.
- Do not call a model provider SDK directly when the framework supports the task.
- Keep the agent definition, the instructions, and the tools in separate, focused classes.
- Put business rules in server services. The agent calls these services through tools.
  The agent does not repeat a business rule.

## Tool design

- Give each tool one clear purpose.
- Give each tool a name that describes the action, for example `find_member_by_email`.
- Write a short, exact description for each tool and each parameter.
- Use typed parameters and typed Pydantic return values.
- Return the smallest result that the agent needs. Do not return full database rows.
- Make tools safe to call again with the same input where possible.
- Check permissions in the server service, not in the prompt.
- Ask the user for confirmation before a tool changes or deletes data.
- Return clear error messages that the agent can explain to the user.
- Write unit tests for each tool.

## UI agent: AG-UI

- Always use the AG-UI protocol between the UI agent and the server.
- Use `agent-framework-ag-ui` on the server.
- Do not add a different chat or streaming protocol.
- Use AG-UI shared state and frontend tools for UI actions.

## Page and task awareness

The UI agent must know where the user is and what the user does.
This gives the user relevant help without extra questions.

- Send the current page, the selected record, and the active task to the agent as context.
- Update the context when the user changes page, selection, or task.
- Send only the data that the agent needs. Do not send secrets or tokens.
- Adapt the agent instructions and the available tools to the current page and task.
- Show suggested prompts that match the current page and task.
- Let the agent act on the current page through frontend tools, for example to fill a form.
- Show the user what the agent changed. Let the user accept or undo the change.
