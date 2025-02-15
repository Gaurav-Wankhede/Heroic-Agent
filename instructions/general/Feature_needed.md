# Instructions

During your interaction with the user, if you find anything reusable in this project (e.g. version of a library, model name), especially about a fix to a mistake you made or a correction you received, you should take note in the `Lessons` section in the `.cursorrules` file so you will not make the same mistake again. 

You should also use the `Feature_needed.md` file as a Scratchpad to organize your thoughts. Especially when you receive a new task, you should first review the content of the Scratchpad, clear old different task if necessary, first explain the task, and plan the steps you need to take to complete the task. You can use todo markers to indicate the progress, e.g.
[X] Task 1
[ ] Task 2

Also update the progress of the task in the Scratchpad when you finish a subtask.
Especially when you finished a milestone, it will help to improve your depth of task accomplishment to use the Scratchpad to reflect and plan.
The goal is to help you maintain a big picture as well as the progress of the task. Always refer to the Scratchpad when you plan the next step.

# Current Progress

[X] Code Organization
    - Split types into separate files
    - Remove duplicate declarations
    - Fix import conflicts
    - Add proper type guards
    - Improve code maintainability

[X] Error Handling
    - Custom error types
    - Error logging
    - User-friendly messages
    - Error recovery strategies
    - Validation checks

[X] Pipeline Service
    - Separate service implementation
    - Clean interface design
    - Efficient data processing
    - Proper caching
    - Resource management

[X] Type System Improvements
    - Move pipeline types to dedicated files
    - Remove duplicate type declarations
    - Update imports to use new type locations
    - Add proper type guards
    - Improve type safety

[X] Service Layer Optimization
    - Split pipeline service into components
    - Create dedicated search service
    - Create dedicated grounding service
    - Create dedicated latest info service
    - Create latest info pipeline

# Next Steps

[ ] Testing Infrastructure
    - Add unit tests for services
    - Add integration tests for pipeline
    - Add performance tests
    - Add error scenario tests
    - Improve test coverage

[ ] Documentation
    - Add JSDoc comments
    - Create README files
    - Document error codes
    - Document configuration options
    - Add troubleshooting guide

[ ] Performance Optimization
    - Add caching strategies
    - Implement request batching
    - Add performance monitoring
    - Optimize resource usage
    - Add load balancing

# Feature needed

[X] Code Organization
    - Split types into separate files
    - Remove duplicate declarations
    - Fix import conflicts
    - Add proper type guards
    - Improve code maintainability

[X] Error Handling
    - Custom error types
    - Error logging
    - User-friendly messages
    - Error recovery strategies
    - Validation checks

[X] Pipeline Service
    - Separate service implementation
    - Clean interface design
    - Efficient data processing
    - Proper caching
    - Resource management

[ ] Citation Integration
    - Link Citation component with Message
    - Format citations properly
    - Add relevance scoring
    - Include metadata
    - Handle empty states

[ ] Latest Info Feature
    - Domain-specific queries
    - Real-time updates
    - Source validation
    - Content formatting
    - Citation linking

[ ] Testing & Documentation
    - Unit tests
    - Integration tests
    - API documentation
    - Usage examples
    - Performance metrics

## Current Focus
- Resolving import conflicts in pipeline service
- Improving citation integration
- Enhancing latest info responses
- Maintaining code quality

## Next Steps
1. Move pipeline types to dedicated files
2. Update citation component integration
3. Enhance error handling
4. Improve documentation

## Prompt Handling

[X] Query Processing
    - Parse and validate user queries
    - Extract domain information
    - Identify query type (code, info, etc.)
    - Handle query parameters
    - Support query history

[X] Code Response
    - Format code blocks
    - Add syntax highlighting
    - Include comments
    - Handle multiple languages
    - Support code snippets

[X] Information Response
    - Format latest information
    - Include timestamps
    - Sort by relevance
    - Filter duplicates
    - Support pagination

[X] Similarity Calculation
    - Implement similarity algorithms
    - Optimize performance
    - Handle edge cases
    - Support multiple metrics
    - Cache results

## File Operations

[X] File Handler Implementation
    - Comprehensive file operations support
    - File type validation
    - Path security checks
    - Error handling integration
    - File metadata handling
    - Directory operations

## Error Handling

[X] Error Handler Implementation
    - Custom error types for different scenarios
    - Error severity levels
    - Error logging with metadata
    - User-friendly error messages
    - Proper TypeScript error handling
    - Integration with pipeline service

## CITATION

[X] Citation Component Implementation
    - Modern, responsive design
    - Relevance indicators
    - Interactive hover and selection states
    - Expandable descriptions
    - Accessibility support
    - Dark mode support
    - Integration with Message component
    - Fixed type issues with WebSearchSource

## Link Validation

[X] Link Validator Implementation
    - Comprehensive link validation
    - Protocol validation
    - Domain whitelisting/blacklisting
    - robots.txt compliance checking
    - HTTP response validation
    - Redirect handling
    - Canonical URL checking
    - Response time monitoring
    - Scoring system
    - Detailed issue reporting
    - Caching for robots.txt
    - Comprehensive test suite

## Content Validation

[X] Content Validator Implementation
    - Comprehensive content validation
    - Readability scoring (Flesch-Kincaid)
    - Quality checks and spam detection
    - Domain relevance calculation
    - Metadata extraction
    - Configurable validation options
    - Detailed issue reporting
    - Integration with pipeline service

## Web Validation

[X] Web Validator Implementation
    - Comprehensive web page validation
    - Integration with Link Validator
    - Integration with Content Validator
    - Security validation (CSP, HSTS, etc.)
    - Accessibility validation (WCAG)
    - SEO validation
    - Performance validation
    - Structure validation
    - Metadata extraction
    - Detailed issue reporting
    - Scoring system
    - Comprehensive test suite

## Pipeline

[X] Pipeline Service Implementation
    - Link scraping and validation
    - Web scraping and validation
    - Content scraping and validation
    - Latest information fetching
    - File operations handling
    - Error handling
    - Response formatting
    - Citation integration
    - Caching mechanism
    - Retry logic
    - Concurrency control
    - Duplicate filtering
    - Result sorting
    - Comprehensive test suite
    - Fixed type issues and linter errors
    - Improved type definitions
    - Added proper error handling
    - Enhanced caching mechanism
    - Added progress tracking
    - Improved documentation
    - Split types into separate files
    - Fixed import conflicts
    - Added proper type guards
    - Enhanced error handling
    - Improved code organization

## Response Handler

[X] Response Handler Enhancement
    - Improved response formatting
    - Structured data support
    - Citation service integration
    - Enhanced error handling
    - Caching support
    - Retry logic
    - Progress tracking
    - Cancellation support
    - Comprehensive test suite
    - Split citation logic into separate service
    - Proper TypeScript types
    - JSDoc documentation
    - Singleton pattern
    - Unit tests with mocking

## Documentation

[X] Documentation Enhancement
    - Added JSDoc comments
    - Created README files
    - Added usage examples
    - Documented error codes
    - Documented configuration options
    - Documented best practices
    - Added troubleshooting guide
    - Updated type definitions
    - Improved code organization
    - Enhanced readability

## Integration Tests

[X] Integration Tests Implementation
    - Test full pipeline flow
    - Test error scenarios
    - Test performance
    - Test edge cases
    - Test concurrency
    - Test caching
    - Test retry logic
    - Test cancellation
    - Added comprehensive test coverage
    - Improved test organization
    - Enhanced test readability
    - Added performance benchmarks
    - Fixed test flakiness

# Lessons

## User Specified Lessons

- When implementing components that rely on types from other parts of the codebase, always check and ensure the type definitions are complete and match the actual data structure being used.
- When adding new fields to existing types, make them optional to maintain backward compatibility.
- Use singleton pattern for services and utilities to ensure consistent state and resource management.
- Implement comprehensive error handling with proper error types and user-friendly messages.
- Add proper TypeScript types and interfaces for all components and functions.
- Write comprehensive tests covering various scenarios and edge cases.
- Use proper dependency injection and avoid tight coupling between components.
- Implement proper caching mechanisms to improve performance.
- Add proper logging and monitoring for debugging and maintenance.
- Follow security best practices for web scraping and validation.
- Split type definitions into separate files to avoid import conflicts.
- Use proper type imports to avoid type conflicts.
- Add proper type guards to handle edge cases.
- Improve code organization by splitting functionality into separate files.
- Use proper error handling with custom error types.
- Add proper documentation with JSDoc comments.
- Use proper naming conventions for files and components.
- Follow best practices for code organization and maintainability.

## Cursor learned

- Fixed linter errors in Message.tsx by updating WebSearchSource type to include missing fields (date, relevanceScore, snippet)
- Made new fields optional to maintain backward compatibility with existing code
- Added Jest and JSDOM dependencies for testing web validation
- Created comprehensive test suites for validators
- Implemented singleton pattern for validators
- Used TypeScript enums for better type safety
- Added detailed error messages and suggestions
- Implemented caching for performance optimization
- Added proper error handling and validation
- Added comprehensive test coverage
- Fixed import conflicts in pipeline service
- Added proper type definitions for all components
- Implemented proper error handling in pipeline service
- Added caching and retry logic in pipeline service
- Added concurrency control in pipeline service
- Added proper validation and error handling in validators
- Added proper documentation and comments
- Split citation logic into separate service for better maintainability
- Used proper mocking in tests to isolate components
- Improved test coverage with more edge cases
- Added proper JSDoc documentation for better code understanding
- Fixed type conflicts by using proper type imports
- Separated type definitions into dedicated files
- Used NonNullable utility type for better type safety
- Added proper error handling for edge cases
- Improved code organization and readability
- Split pipeline service into separate files for better maintainability
- Fixed import conflicts by using proper type imports
- Added proper type guards for better type safety
- Enhanced error handling with custom error types
- Improved code organization by splitting functionality

# Scratchpad

Current Task: Code Organization and Type Safety

Progress:
[X] Initial analysis of existing code structure
[X] Review of pipeline.ts implementation
[X] Review of webScraper.ts implementation
[X] Create Citation Component
[X] Implement Error Handler
[X] Fix Type Definitions
[X] Enhance Similarity Calculation
[X] Create Content Validator
[X] Create Link Validator
[X] Create Web Validator
[X] Create Pipeline Service
[X] Create Comprehensive Tests
[X] Enhance Response Handler
[X] Add Documentation
[X] Add Integration Tests
[X] Fix Linter Errors
[X] Improve Type Safety
[X] Enhance Code Organization
[X] Split Pipeline Service Types
[X] Fix Import Conflicts
[X] Add Type Guards
[X] Improve Error Handling

Current Status:
1. Pipeline Service:
   - Fixed type conflicts
   - Separated type definitions
   - Improved error handling
   - Enhanced caching mechanism
   - Added progress tracking
   - Improved documentation
   - Split into separate files
   - Fixed import conflicts
   - Added type guards
   - Enhanced error handling

2. Type Definitions:
   - Created dedicated types file
   - Fixed import conflicts
   - Added proper interfaces
   - Used utility types
   - Improved type safety
   - Added proper type guards
   - Enhanced error handling

Next Steps:
[X] 1. Code Organization
    - Separate concerns
    - Improve modularity
    - Enhance readability
    - Split into separate files
    - Fix import conflicts
    - Add type guards
    - Improve error handling

[X] 2. Type Safety
    - Fix remaining type issues
    - Add proper type guards
    - Improve error handling
    - Split type definitions
    - Fix import conflicts
    - Add proper interfaces
    - Use utility types

Priority Order:
1. Code Organization (Maintainability)
2. Type Safety (Reliability)



