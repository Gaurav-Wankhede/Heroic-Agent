export class AIError extends Error {
  constructor(message: string, public readonly code: string = 'AI_ERROR') {
    super(message);
    this.name = 'AIError';
  }
}

export class DomainError extends Error {
  constructor(message: string, public readonly domain: string) {
    super(message);
    this.name = 'DomainError';
  }
} 