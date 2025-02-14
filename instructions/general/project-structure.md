# Project Structure

```plaintext
src/
├── app/                      # App Router directory
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Landing page
│   └── (routes)/           # Route group (won't affect URL)
│       ├── domains/        # Domains section
│       │   ├── page.tsx    # Domains grid
│       │   └── [domain]/   # Dynamic domain routes
│       │       └── page.tsx # Domain chat page
├── components/              # Shared components
│   ├── ui/                 # Reusable UI components
│   └── chat/              # Chat-specific components
├── lib/                    # Shared utilities
│   ├── ai.ts              # AI integration
│   └── utils.ts           # Helper functions
└── types/                 # TypeScript types

```

## Directory Descriptions

### `/app`
- Root directory for Next.js App Router
- Contains layouts and pages
- Uses route groups for better organization

### `/components`
- Shared components used across multiple pages
- Organized by feature/functionality
- Follows atomic design principles

### `/lib`
- Utility functions and shared logic
- Keeps code DRY and maintainable
- Single responsibility per file

### `/types`
- TypeScript type definitions
- Shared interfaces and types

## Key Changes
1. Simplified folder structure
2. Removed duplicate routing folders
3. Organized by feature
4. Clear separation of concerns
5. Follows Next.js 13+ conventions