# Hooks Directory

This directory contains agent hooks that automate workflows during development.

## What are Hooks?

Hooks are automated triggers that run agent actions based on IDE events:
- **File events**: Run actions when files are created, edited, or deleted
- **Agent events**: Run actions before/after tool use or task execution
- **Manual triggers**: User-initiated hook execution

## Hooks Used in This Project

Add your hook JSON files here. Examples:

### Example: Lint on Save
```json
{
  "name": "Lint TypeScript Files",
  "version": "1.0.0",
  "description": "Run ESLint when TypeScript files are saved",
  "when": {
    "type": "fileEdited",
    "patterns": ["*.ts", "*.tsx"]
  },
  "then": {
    "type": "runCommand",
    "command": "npm run lint"
  }
}
```

### Example: Test Before Commit
```json
{
  "name": "Run Tests",
  "version": "1.0.0",
  "description": "Run test suite before committing",
  "when": {
    "type": "userTriggered"
  },
  "then": {
    "type": "runCommand",
    "command": "npm test"
  }
}
```

## How Hooks Improved Development

Document here how hooks automated your workflow:
- Automatic linting on save
- Pre-commit test validation
- Code quality checks
- Build verification
