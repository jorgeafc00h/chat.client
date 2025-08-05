# FusionHit Chat Client

A modern React TypeScript chat application with real-time messaging capabilities using SignalR. This client is designed to integrate with the FusionHit Chat API for enterprise chat functionality with document citations and AI assistance.

## Features

- **Real-time Messaging** - SignalR integration for instant message delivery
- **Document Citations** - Display source documents with confidence scores
- **Session Management** - Create and manage multiple chat sessions
- **Typing Indicators** - Real-time typing status
- **Responsive Design** - Built with Tailwind CSS for mobile and desktop
- **TypeScript** - Full type safety and better development experience
- **Modern UI** - Clean, professional interface with custom styling

## Technology Stack

- **React 19** with TypeScript
- **SignalR** for real-time communication
- **Tailwind CSS** for styling
- **Microsoft SignalR Client** for WebSocket connections

## Getting Started

### Prerequisites

- Node.js 16+ (Note: Some dependencies require Node 18+)
- npm or yarn
- FusionHit Chat API running (typically on https://localhost:7265)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/jorgeafc00h/chat.client.git
   cd chat.client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env.local` file in the root directory:
   ```env
   REACT_APP_API_BASE_URL=https://localhost:7265
   REACT_APP_USER_ID=demo-user
   ```

4. Start the development server:
   ```bash
   npm start
   ```

   The application will open at `http://localhost:3000`

## Project Structure

```
src/
├── components/           # React components
│   ├── ChatInterface.tsx    # Main chat container
│   ├── MessageList.tsx      # Message display
│   ├── MessageInput.tsx     # Message input form
│   ├── ChatSidebar.tsx      # Session management
│   ├── CitationDisplay.tsx  # Document citations
│   └── ...
├── services/            # API and SignalR services
│   ├── signalRService.ts    # Real-time communication
│   └── apiService.ts        # REST API calls
├── types/               # TypeScript type definitions
│   └── chat.ts             # Chat-related interfaces
└── ...
```

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
