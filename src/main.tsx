import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css'; // ou './index.css' se você estiver usando esse

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
