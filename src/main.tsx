import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css';

import { sfx } from './sfx'

// טוענים את הסאונדים ששמת ב-public/sfx
sfx.preload({
  turn:  '/sfx/turn1.wav',
  raise: '/sfx/poker_chips1-87592.mp3', // גם ל-ALL-IN
});

// פותחים autoplay אחרי אינטראקציה ראשונה
window.addEventListener('pointerdown', () => sfx.unlockOnce(), { once: true });

createRoot(document.getElementById('root')!).render(<App />)
