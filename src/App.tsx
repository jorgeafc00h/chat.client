import React from 'react';
import { ChatInterface } from './components/ChatInterface';
import './App.css';

function App() {
  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'https://localhost:7247';
  const userId = process.env.REACT_APP_USER_ID || 'demo-user';

  return (
    <div className="App h-screen">
      <ChatInterface 
        apiBaseUrl={apiBaseUrl}
        userId={userId}
      />
    </div>
  );
}

export default App;
