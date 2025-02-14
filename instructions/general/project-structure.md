# Project Structure

```plaintext
src/
├── app/ # App Router directory
│ ├── api/ # API routes
│ ├── domains/ # Domain-specific pages
│ ├── features/ # Features page
│ ├── testimonials/ # Testimonials page
│ ├── globals.css # Global styles
│ ├── favicon.ico # Site favicon
│ ├── layout.tsx # Root layout
│ ├── page.tsx # Landing page
│ └── page-layout.tsx # Shared page layout component
├── components/ # Shared components
│ ├── chat/ # Chat-specific components
│ ├── domains/ # Domain-specific components
│ ├── landing/ # Landing page components
│ │ ├── Footer.tsx
│ │ ├── Header.tsx
│ │ └── Hero.tsx
│ ├── donate-button/ # Donation components
│ ├── ui/ # Reusable UI components
│ ├── LatestTestimonials.tsx # Testimonials display component
│ ├── TestimonialForm.tsx # Testimonial submission form
│ ├── theme-provider.tsx # Theme context provider
│ └── theme-toggle.tsx # Theme switching component
├── lib/ # Utility functions and services
│ ├── ai.ts # AI-related functionality
│ ├── db.ts # Database configuration
│ ├── seed.ts # Database seeding utilities
│ └── utils.ts # Common utility functions
└── types/ # TypeScript types
    └── chat.ts # Chat-related type definitions
```

## Directory Descriptions

### `/app`
- Root directory for Next.js App Router
- Contains page layouts and route components
- Includes API routes under `/api`
- Global styles and assets
- Organized by feature domains

### `/components`
- Shared components used across multiple pages
- Organized by feature/functionality
- Includes both domain-specific and generic UI components
- Theme management components
- Form and display components for testimonials

### `/lib`
- Core functionality and utilities
- AI service integration (`ai.ts`)
- Database configuration and management
- Seeding utilities for development
- Common helper functions

### `/types`
- TypeScript type definitions
- Currently includes chat-related types
- Ensures type safety across the application

## Key Features
1. Next.js 13+ App Router architecture
2. Feature-based organization
3. Clear separation of concerns
4. Modular component structure
5. Centralized utility functions
6. Type-safe development with TypeScript

## Best Practices
1. Component reusability through shared UI components
2. Consistent file naming conventions
3. Logical grouping of related functionality
4. Separation of business logic in `/lib`
5. Global state management via theme provider
6. Maintainable and scalable structure