# Heroic Agent 🦸‍♂️

Your AI-powered coding assistant with domain-specific expertise and real-time chat capabilities.

[![Next.js](https://img.shields.io/badge/Next.js-Latest-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Latest-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-Latest-38B2AC)](https://tailwindcss.com/)

## 🌟 Features

- **Real-time AI Chat**: 
  - Intelligent conversations with domain-specific expertise
  - Real-time streaming responses
  - Code block syntax highlighting
  - Copy code functionality
  - Message editing capabilities
  - Citation support with source tracking

- **Multi-Domain Support**: 
  - Domain-specific context awareness
  - Specialized knowledge bases
  - Contextual code suggestions
  - Best practices recommendations

- **Smart Features**:
  - Semantic search and context awareness
  - Web search integration for up-to-date information
  - Code suggestions and optimization
  - Error detection and solutions
  - Citation-based responses with source verification

- **Modern UI/UX**:
  - Responsive design
  - Dark/Light mode support
  - Real-time chat interface with message streaming
  - Code block syntax highlighting
  - Smooth animations and transitions
  - Mobile-friendly interface
  - Keyboard shortcuts

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Gaurav-Wankhede/Heroic-Agent.git
cd heroic-agent
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file in the root directory:
```env
GEMINI_API_KEY=your_google_api_key
MONGODB_URI=your_mongodb_connection_string
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 💡 Usage

### Chat Interface

- Use `Ctrl/Cmd + Enter` to send messages
- Use `Del` to clear chat history
- Use `Esc` to cancel editing
- Use `Enter` for new line

### Keyboard Shortcuts

- Send message: `Ctrl/Cmd + Enter`
- New line: `Enter`
- Cancel edit: `Esc`
- Clear chat: `Del`

### Features

1. **Code Handling**
   - Syntax highlighting for multiple languages
   - Copy code with one click
   - Language detection and display
   - Code block formatting

2. **Message Management**
   - Edit messages
   - Delete messages
   - Clear chat history
   - Timestamp display
   - Persistent chat history (last 10 conversations)

3. **UI Features**
   - Dark/Light mode toggle
   - Responsive design
   - Mobile-friendly interface
   - Smooth animations
   - Scroll to bottom button

4. **Citations & Sources**
   - Web search integration
   - Source verification
   - Relevance scoring
   - Citation display
   - Source linking

## 🛠️ Technical Architecture

### Frontend
- Next.js 15+ with App Router
- TypeScript for type safety
- Tailwind CSS for styling
- Lucide icons
- Real-time streaming responses
- Prism for code highlighting

### Backend
- Next.js API routes
- Google's Gemini AI integration
- Real-time response streaming
- Chat history management
- Stores last 10 conversations
- Automatic cleanup of older chats
- Web search integration

### Key Components
- Real-time chat interface
- Domain-specific processing
- Code block handling
- Citation system
- Theme management

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Google's Gemini AI for the language model
- Tailwind CSS for the styling system
- All contributors who have helped shape this project

## 📧 Contact

For questions, feedback, or support:
- Create an issue in the repository
- Contact the maintainers through the provided social links

---

Made with ❤️ by <a href="https://gaurav-wankhede.vercel.app/">Gaurav Wankhede</a>
