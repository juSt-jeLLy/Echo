# Kiro Configuration & Logs

This directory contains all Kiro-related configuration, specs, hooks, steering, and logs for the ElevenLabs x Kiro Hackathon submission.

## Directory Structure

```
.kiro/
├── README.md                          # This file
├── HACKATHON.md                       # Hackathon submission tracking
├── specs/                             # Feature specifications (created as we build)
├── hooks/                             # Agent hooks (created as we automate)
├── steering/                          # Custom steering files (created as needed)
├── settings/                          # Kiro settings like MCP configs
│   └── mcp.json                      # MCP server configurations (if needed)
└── logs/                              # Usage tracking and documentation
    ├── elevenlabs-usage.md           # ElevenLabs power tracking
    ├── vibe-coding.md                # Conversation logs
    ├── mcp-usage.md                  # MCP usage tracking
    ├── powers-usage.md               # Powers usage tracking
    └── hooks-usage.md                # Hooks usage tracking
```

## What Gets Created Here

### Real Kiro Artifacts (Created During Development)
- **specs/** - Actual spec files (requirements.md, design.md, tasks.md) for features we build
- **hooks/** - Actual hook JSON files that automate workflows
- **steering/** - Actual steering markdown files with custom instructions
- **settings/mcp.json** - Actual MCP server configurations (if we add custom ones)

### Documentation (Tracks What We Did)
- **logs/** - Markdown files documenting how we used Kiro features
- **HACKATHON.md** - Tracks hackathon requirements and progress

## For Judges

This `.kiro` directory demonstrates:
- ✅ **Spec-Driven Development**: See `specs/` for actual specifications
- ✅ **Agent Hooks**: See `hooks/` for workflow automation
- ✅ **Steering Docs**: See `steering/` for custom instructions
- ✅ **MCP Integration**: See `settings/mcp.json` and `logs/mcp-usage.md`
- ✅ **Kiro Powers**: See `logs/powers-usage.md` and `logs/elevenlabs-usage.md`
- ✅ **Vibe Coding**: See `logs/vibe-coding.md` for conversation examples

---

*Last Updated: April 21, 2026*
