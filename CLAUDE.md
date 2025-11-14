  # CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Speckit-based feature development repository that uses a structured workflow for specification, planning, and implementation of features. The project follows a strict phased approach with custom slash commands that orchestrate the entire feature development lifecycle.

## Speckit Workflow Commands

The repository uses custom slash commands to manage feature development. These commands MUST be executed in sequence:

### 1. Feature Specification
```bash
/speckit.specify [feature description]
```
Creates a new feature branch and generates a comprehensive specification document. The command:
- Automatically determines the next available feature number
- Creates branch as `{number}-{short-name}` (e.g., `1-user-auth`)
- Generates `specs/{number}-{short-name}/spec.md` with user stories, requirements, and success criteria
- Validates specification quality with automated checklist
- May ask clarification questions (max 3) for critical ambiguities

**Output**: Feature branch, spec.md, and requirements checklist

### 2. Clarification (Optional but Recommended)
```bash
/speckit.clarify
```
Identifies and resolves ambiguities in the specification before planning. The command:
- Scans spec for underspecified areas across 10+ categories (scope, data model, UX flow, security, etc.)
- Asks up to 5 targeted questions, one at a time
- Provides recommended answers based on best practices
- Updates spec incrementally after each answer
- Creates a `## Clarifications` section with dated session records

**When to use**: Always run before `/speckit.plan` unless doing an exploratory spike

### 3. Implementation Planning
```bash
/speckit.plan
```
Executes the planning workflow to generate technical design artifacts. The command:
- Loads spec.md and constitution.md
- Fills Technical Context (language, dependencies, platform, constraints)
- Validates against constitution principles
- Phase 0: Generates research.md (resolves all NEEDS CLARIFICATION)
- Phase 1: Creates data-model.md, contracts/, quickstart.md
- Updates agent context files

**Output**: plan.md, research.md, data-model.md, contracts/, quickstart.md

### 4. Task Generation
```bash
/speckit.tasks
```
Generates an actionable, dependency-ordered task list from design artifacts. The command:
- Requires plan.md and spec.md (data-model.md, contracts/, research.md optional)
- Organizes tasks by user story priority (P1, P2, P3)
- Each user story becomes independently testable phase
- Tasks follow strict checklist format: `- [ ] [T###] [P] [US#] Description with file path`
- Marks parallelizable tasks with `[P]`
- Creates dependency graph and parallel execution examples

**Output**: tasks.md with phased implementation plan

### 5. Quality Analysis
```bash
/speckit.analyze
```
READ-ONLY analysis of consistency across spec.md, plan.md, and tasks.md. The command:
- Detects duplications, ambiguities, coverage gaps, constitution violations
- Assigns severity (CRITICAL/HIGH/MEDIUM/LOW)
- Generates findings table and coverage metrics
- Never modifies files
- Offers remediation suggestions

**When to use**: After `/speckit.tasks` before `/speckit.implement`

### 6. Implementation Execution
```bash
/speckit.implement
```
Executes all tasks from tasks.md in dependency order. The command:
- Validates all checklists are complete (asks user to override if incomplete)
- Creates/verifies ignore files (.gitignore, .dockerignore, etc.) based on tech stack
- Executes tasks phase-by-phase
- Respects parallel markers `[P]` for concurrent execution
- Marks completed tasks as `[X]` in tasks.md
- Halts on non-parallel task failures

**Prerequisites**: All checklists complete (or user override)

### Additional Commands

```bash
/speckit.constitution
# Creates or updates project constitution from principle inputs

/speckit.checklist
# Generates custom checklist for current feature
```

## Speckit File Structure

```
specs/{number}-{short-name}/
├── spec.md              # Feature specification (user stories, requirements)
├── plan.md              # Implementation plan (tech stack, architecture)
├── research.md          # Technical research and decisions
├── data-model.md        # Entity definitions and relationships
├── quickstart.md        # Integration test scenarios
├── contracts/           # API specifications (OpenAPI/GraphQL)
├── tasks.md             # Actionable task breakdown
└── checklists/          # Quality validation checklists
    └── requirements.md  # Spec quality checklist
```

## Constitution-Driven Development

The project follows principles defined in `.specify/memory/constitution.md`. Constitution violations are CRITICAL in analysis and must be justified in the Complexity Tracking section of plan.md.

Key enforcement points:
- Constitution Check runs during `/speckit.plan` (before and after design)
- `/speckit.analyze` flags constitution violations as CRITICAL severity
- All PRs must verify compliance

## PowerShell Scripts

Scripts in `.specify/scripts/powershell/` orchestrate the workflow:

- `create-new-feature.ps1`: Creates feature branch and initializes spec
- `setup-plan.ps1`: Initializes planning environment
- `check-prerequisites.ps1`: Validates feature context and available documents
- `update-agent-context.ps1`: Updates AI agent context files with tech stack
- `common.ps1`: Shared utility functions

All scripts support `-Json` flag for structured output parsing.

## Task Format Requirements

Tasks in tasks.md MUST follow this exact format:
```
- [ ] [T###] [P] [US#] Description with file/path/here.ext
```

Components:
- `- [ ]`: Markdown checkbox (becomes `[X]` when complete)
- `[T###]`: Sequential task ID (T001, T002, ...)
- `[P]`: Optional parallel marker (different files, no dependencies)
- `[US#]`: User story label (US1, US2, ...) for story phases only
- Description must include absolute file path

## Feature Branch Workflow

1. `/speckit.specify` creates numbered branch (e.g., `5-analytics-dashboard`)
2. Feature numbers are auto-incremented by scanning:
   - Remote branches: `git ls-remote --heads origin`
   - Local branches: `git branch`
   - Spec directories: `specs/` folder
3. Highest number found determines next available number
4. Branch is checked out immediately after creation

## Specification Quality Standards

Specifications must be:
- **Technology-agnostic**: No mention of frameworks, languages, databases
- **User-focused**: Written for business stakeholders, not developers
- **Testable**: Requirements have clear acceptance criteria
- **Measurable**: Success criteria include specific metrics
- **Unambiguous**: Max 3 NEEDS CLARIFICATION markers

Success criteria examples:
- Good: "Users can complete checkout in under 3 minutes"
- Bad: "API response time is under 200ms" (too technical)

## User Story Organization

User stories in spec.md must be:
- **Prioritized**: P1, P2, P3 (P1 is most critical)
- **Independently testable**: Each story is a standalone MVP slice
- **Deliverable**: Can be developed, tested, deployed independently

Each story requires:
- Brief title
- Priority justification
- Independent test description
- Acceptance scenarios (Given/When/Then format)

## Implementation Phases

From tasks.md:
1. **Phase 1: Setup** - Project initialization
2. **Phase 2: Foundational** - Blocking prerequisites for all stories
3. **Phase 3+: User Stories** - One phase per story (P1, P2, P3)
4. **Final Phase: Polish** - Cross-cutting concerns

Within each user story phase:
- Tests first (if TDD approach requested)
- Models
- Services
- Endpoints/UI
- Integration

## Templates

All templates are in `.specify/templates/`:
- `spec-template.md`: Feature specification structure
- `plan-template.md`: Implementation plan structure
- `tasks-template.md`: Task breakdown structure
- `checklist-template.md`: Quality checklist structure
- `agent-file-template.md`: Agent context file structure

## Clarification Workflow

When `/speckit.clarify` runs:
1. Scans spec across taxonomy (scope, data model, UX, security, performance, etc.)
2. Prioritizes by Impact × Uncertainty
3. Asks one question at a time (max 5 total)
4. Provides recommended answer with reasoning
5. Updates spec after each accepted answer
6. Creates `## Clarifications` section with `### Session YYYY-MM-DD`

Question format:
- Multiple choice: Max 5 options, must be mutually exclusive
- Short answer: Max 5 words constraint

## Ignore Files Management

During `/speckit.implement`, ignore files are created/verified based on detected tech stack:
- `.gitignore`: Always (if git repo exists)
- `.dockerignore`: If Dockerfile exists or Docker in plan.md
- `.eslintignore`: If .eslintrc* exists
- `.prettierignore`: If .prettierrc* exists
- `.npmignore`: If package.json exists (for publishing)
- `.terraformignore`: If *.tf files exist
- `.helmignore`: If helm charts present

## Best Practices

1. **Always run commands in sequence**: specify → clarify → plan → tasks → analyze → implement
2. **Never skip clarification** unless doing exploratory spike
3. **Run analyze before implement** to catch issues early
4. **Use parallel markers [P]** for tasks that can run concurrently
5. **Mark tasks complete immediately** during implementation (don't batch)
6. **Respect constitution principles** - violations require justification
7. **Keep specs technology-agnostic** - implementation details go in plan.md only

## Error Handling

If a Speckit command fails:
- Check prerequisites: Feature branch checked out, previous phases complete
- Verify file paths are absolute (not relative)
- Run `check-prerequisites.ps1 -Json` to validate environment
- Review error messages for missing NEEDS CLARIFICATION markers
- Ensure constitution gates pass before proceeding

## Global User Instructions

Per user's global CLAUDE.md preferences:
- Avoid using em dash in all generated content
- Don't put 'generated by Sonnet 4.5 or any LLM'
