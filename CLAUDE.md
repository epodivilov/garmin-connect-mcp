# Garmin Connect MCP Server - Project Instructions

## Project Overview

This is an MCP (Model Context Protocol) server that provides integration with Garmin Connect. It enables access to health metrics, activities, and training data from Garmin devices through standardized MCP tools.

**Tech Stack:**
- TypeScript/Node.js (v20+)
- MCP SDK (@modelcontextprotocol/sdk)
- garmin-connect client library
- Vitest for testing
- tsup for bundling

**Project Structure:**
- `src/` - Source code
- `src/tools/` - MCP tool implementations
- `src/types/` - TypeScript type definitions
- `dist/` - Built output
- `backlog/` - Task management using backlog.md CLI

## Common Commands

```bash
# Development
pnpm dev              # Watch mode with auto-rebuild
pnpm build            # Build for production
pnpm start            # Run the built server

# Quality Checks
pnpm typecheck        # Run TypeScript type checking
pnpm lint             # Lint code
pnpm lint:fix         # Auto-fix linting issues

# Testing
pnpm test             # Run tests in watch mode
pnpm test:run         # Run tests once
pnpm test:coverage    # Generate coverage report

# Task Management
backlog task list --plain              # List all tasks
backlog task create "Title" -d "Desc" # Create new task
backlog task edit <id> -s "Done"      # Update task status
```

**IMPORTANT:** Always use `pnpm`, never `npm` or `yarn`.

## Code Style Guidelines

- Use ES modules (import/export), not CommonJS
- Prefer functional programming patterns
- Use explicit types, avoid `any`
- Destructure imports when possible
- Use async/await over promises
- Follow existing naming conventions in the codebase

**Example:**
```typescript
// ✅ Good
import { GarminConnect } from 'garmin-connect';
export async function fetchData(): Promise<Data> { ... }

// ❌ Bad
const GarminConnect = require('garmin-connect');
export function fetchData(): any { ... }
```

## Testing Requirements

- New features require corresponding test files
- Use Vitest for unit tests
- Place tests in `__tests__` directories or as `*.test.ts` files
- Mock external dependencies (Garmin API calls)
- Always run `pnpm typecheck && pnpm test:run` before committing

## Task Management with Backlog.md CLI

**IMPORTANT:** We use the `backlog` CLI tool for all task operations. NEVER edit task markdown files directly.

### Quick Reference

```bash
# Create tasks
backlog task create "Task title" -d "Description" --ac "Criteria 1" --ac "Criteria 2"
backlog task create "[TASK] Name" -p <parent-id> --priority high

# Manage tasks
backlog task list --plain                    # List all tasks (AI-friendly)
backlog task list -s "To Do" --plain         # Filter by status
backlog task edit <id> -s "In Progress"      # Update status
backlog task edit <id> --plan "1. Step one" # Add implementation plan
backlog task edit <id> --check-ac 1          # Check acceptance criteria
backlog task edit <id> --notes "Details"     # Add notes
backlog task archive <id>                    # Archive completed task
```

### Task Hierarchy

```
[PROJ] Project Name        # Top-level initiative
├── [PHASE] Phase Name     # Time-boxed phase/sprint
    ├── [EPIC] Epic Name   # Optional grouping
    └── [TASK] Task Name   # Individual work items
```

### Task Statuses
- "To Do" - Ready to work on
- "In Progress" - Actively being worked on
- "Done" - Completed, ready to archive

**IMPORTANT - Status Management:**
- **When starting** a task → Update status to "In Progress": `backlog task edit <id> -s "In Progress"`
- **When finishing** a task → Update status to "Done": `backlog task edit <id> -s "Done"`
- Always update task status in backlog to keep project status accurate

### Task Creation Best Practices

**Title:** Brief, clear summary

**Description:** Explain WHY the task exists, not HOW to implement it

**Acceptance Criteria:** Focus on outcomes and testable behaviors, not implementation steps
- ✅ "User can log in with valid credentials"
- ❌ "Add handleLogin() function in auth.ts"

**Requirements:**
- Tasks must be atomic (single PR scope)
- Each task should be testable independently
- Never reference tasks that don't exist yet
- Use `--plain` flag when scripting or automating

### Development Workflow

1. **Pick a task:**
   ```bash
   backlog task list -s "To Do" --plain
   backlog task edit <id> -s "In Progress" -a @developer
   ```

2. **Add implementation plan:**
   ```bash
   backlog task edit <id> --plan "1. Research\n2. Implement\n3. Test"
   ```

3. **Implement the task:**
   - Write code following style guidelines
   - Add tests for new functionality
   - Run `pnpm typecheck && pnpm test:run`

4. **Mark acceptance criteria as complete:**
   ```bash
   backlog task edit <id> --check-ac 1 --check-ac 2
   ```

5. **Add implementation notes:**
   ```bash
   backlog task edit <id> --notes "$(date '+%Y-%m-%d %H:%M:%S')\nCompleted using X approach"
   ```

6. **Complete the task:**
   ```bash
   backlog task edit <id> -s "Done"
   backlog task archive <id>
   ```

## Multi-Agent Workflows (MANDATORY)

This project uses specialized agents for different phases of work. These workflows are **MANDATORY** and must be followed exactly.

### Workflow 1: Task Implementation

When the user asks to **fix or implement** something:

**BEFORE STARTING:** Update task status to "In Progress" in backlog

1. **Analyze** - Use `@agent-analyst` (`.claude/agents/analyst.md`) to:
   - Decompose requirements into actionable tasks
   - Create detailed specifications
   - Define test cases and acceptance criteria

2. **Develop** - Use `@agent-developer` (`.claude/agents/developer.md`) to:
   - Implement the solution following specifications
   - Write unit tests
   - Ensure code follows style guidelines

3. **Review** - Use `@agent-reviewer` (`.claude/agents/reviewer.md`) to:
   - Review code quality and best practices
   - Check architectural patterns
   - Verify test coverage and documentation

4. **Commit** - Use `@agent-committer` (`.claude/agents/committer.md`) to:
   - Create proper conventional commits
   - Follow git best practices
   - Write meaningful commit messages

**AFTER COMPLETING:** Update task status to "Done" in backlog and archive

**Example:**
```
User: "Add support for weekly training volume aggregation"

Response:
→ Update task status to "In Progress" in backlog
→ @agent-analyst - Analyze requirements and create specifications
→ @agent-developer - Implement the feature based on specifications
→ @agent-reviewer - Review the implementation
→ @agent-committer - Create conventional commits
→ Update task status to "Done" and archive in backlog
```

**Critical Rules:**
- **NEVER** skip any step in this workflow
- Each agent must complete before moving to the next
- Do not implement directly - always use `@agent-developer`
- Do not commit directly - always use `@agent-committer`
- **ALWAYS** update task status: "In Progress" when starting, "Done" when finishing

### Workflow 2: Task Creation

When the user asks to **create a task**:

1. **Analyze** - Use `@agent-analyst` to:
   - Understand the full scope and context
   - Break down into atomic tasks
   - Define clear acceptance criteria
   - Identify dependencies and requirements

2. **Create in Backlog** - After analysis:
   - Use `backlog task create` with proper structure
   - Include description, acceptance criteria
   - Set appropriate priority and parent task
   - Add any relevant tags or metadata

**Example:**
```
User: "Create a task for implementing heart rate zone analysis"

Response:
→ @agent-analyst - Analyze requirements and define specifications
→ Create task in backlog with specifications from analysis
```

**Critical Rules:**
- **ALWAYS** analyze before creating tasks
- Never create tasks without proper analysis
- Ensure acceptance criteria are testable and clear
- Tasks must be atomic (single PR scope)

### Available Agents

Agents are located in `.claude/agents/` directory:

- `@agent-analyst` - Requirements analysis, task decomposition, test specifications
- `@agent-developer` - TypeScript development for frontend and backend
- `@agent-reviewer` - Code review, best practices, architectural patterns
- `@agent-committer` - Git commit operations following conventional commits

## Project Management Rules

When acting as project manager:
- Only one developer agent works in parallel
- Always ask user confirmation before starting new tasks
- Use backlog CLI for all task operations
- After development, delegate to reviewer agent
- Run full test suite before marking phase complete: `pnpm test:run && pnpm typecheck`

## Repository Etiquette

- Commit messages should be clear and descriptive
- Run tests and typecheck before pushing
- Keep PRs focused on single tasks
- Update tests when modifying existing code
- Don't commit node_modules, dist/, or .env files

## Important Notes

- Garmin Connect credentials must be configured via environment variables or MCP settings
- The server runs as a stdio MCP server, not HTTP
- Always handle Garmin API rate limits and errors gracefully
- Mock Garmin API responses in tests to avoid real API calls

---

**Tips for AI Agents:**
- Always use `--plain` flag with backlog commands for AI-friendly output
- Think from the perspective of future AI agents when creating tasks
- Ensure task descriptions contain sufficient context for independent work
- Ask clarifying questions when requirements are ambiguous
