# Steering Directory

This directory contains steering documents that provide context and guidelines to Kiro.

## What are Steering Docs?

Steering documents are markdown files that give Kiro additional context about:
- Project conventions and standards
- Architecture decisions
- Team preferences
- Domain-specific knowledge

## Steering Docs in This Project

Add your steering markdown files here. Examples:

### Example: project-standards.md
```markdown
---
inclusion: auto
---

# Project Standards

## Code Style
- Use TypeScript strict mode
- Prefer functional components with hooks
- Use Tailwind CSS for styling
- Follow shadcn/ui component patterns

## File Organization
- Components in `src/components/`
- Pages in `src/pages/`
- Utilities in `src/lib/`
- Types co-located with components
```

### Example: elevenlabs-integration.md
```markdown
---
inclusion: fileMatch
fileMatchPattern: "**/elevenlabs*"
---

# ElevenLabs Integration Guidelines

## API Usage
- Always handle API errors gracefully
- Cache voice lists to reduce API calls
- Use streaming for real-time audio
- Implement retry logic for failed requests

## Voice Selection
- Provide voice preview functionality
- Allow users to customize voice settings
- Store user voice preferences
```

## How Steering Improved Development

Document here how steering docs helped:
- Consistent code style across features
- Better context for Kiro's suggestions
- Reduced back-and-forth clarifications
- Maintained project conventions
