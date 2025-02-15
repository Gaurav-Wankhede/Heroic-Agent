export function isGeneralGreeting(message: string): boolean {
  const greetings = [
    'hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon', 
    'good evening', 'hi there', 'hello there'
  ];
  
  const cleanMessage = message.toLowerCase().trim();
  return greetings.some(greeting => cleanMessage.includes(greeting));
} 