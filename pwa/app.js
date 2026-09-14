// Google Analytics helper
const GA_ID = 'G-PLACEHOLDER'; // Set via environment variable or build config
function initGoogleAnalytics() {
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
  
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_ID);
}

function trackGameStart(category) {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', 'game_start', { 'category': category });
  }
}

function trackAnswer(isCorrect, category) {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', 'answer_submitted', { 'correct': isCorrect, 'category': category });
  }
}

function trackGameEnd(score, total) {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', 'game_completed', { 'score': score, 'total': total });
  }
}

// Quiz game state
let gameState = {
  quiz: null,
  currentQuestion: 0,
  score: 0,
  playerName: '',
  difficulty: 'medium',
  selectedCategories: [],
  musicEnabled: true,
  timeRemaining: 30,
  timerInterval: null,
  gameStarted: false,
  gameOver: false,
  bgmAudio: null,
  answerLocked: false,
  advanceTimeout: null,
};

function shuffleInPlace(items) {
  for (let index = items.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

// Load questions from JSON with resilient fallback paths
async function loadQuestions() {
  const candidateUrls = [
    'questions.json',
    './questions.json',
    '/pwa/questions.json',
    '../assets/questions.json',
    '/assets/questions.json'
  ];
  for (const url of candidateUrls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        gameState.quiz = await response.json();
        return;
      }
    } catch (e) {}
  }
  console.error('Failed to load questions from all candidate URLs');
}

// Get random questions based on difficulty and categories
function getQuestionsForGame(difficulty) {
  if (!gameState.quiz) return [];
  
  let allQuestions = [];
  gameState.selectedCategories.forEach((cat) => {
    if (gameState.quiz[cat]) {
      const catQuestions = gameState.quiz[cat].filter(
        (q) => q.difficulty === difficulty || !q.difficulty
      );
      allQuestions.push(...catQuestions);
    }
  });
  
  // Each question gets its own Fisher–Yates answer order.  Correctness is
  // still determined by the answer text, never by a displayed position.
  return shuffleInPlace([...allQuestions]).slice(0, 10).map((question) => ({
    ...question,
    displayOptions: shuffleInPlace([...question.options]),
  }));
}

// Initialize background music
function initBackgroundMusic() {
  if (gameState.musicEnabled && !gameState.bgmAudio) {
    gameState.bgmAudio = new Audio('/sounds/horror-ambience.mp3');
    gameState.bgmAudio.loop = true;
    gameState.bgmAudio.volume = 0.25;
    gameState.bgmAudio.addEventListener('error', () => {
      gameState.musicEnabled = false;
    });
  }
}

// Play background music
function playBackgroundMusic() {
  if (gameState.bgmAudio && gameState.musicEnabled && gameState.bgmAudio.paused) {
    gameState.bgmAudio.play().catch(() => {
      console.log('Autoplay blocked; music will play after user interaction.');
    });
  }
}

// Stop background music
function stopBackgroundMusic() {
  if (gameState.bgmAudio) {
    gameState.bgmAudio.pause();
    gameState.bgmAudio.currentTime = 0;
  }
}

// Start the game
function startGame() {
  const playerName = document.getElementById('playerName').value.trim();
  const difficulty = document.getElementById('difficulty').value;
  const checkboxes = document.querySelectorAll('input[name="category"]:checked');
  
  if (!playerName) {
    alert('Please enter your name!');
    return;
  }
  
  if (checkboxes.length === 0) {
    alert('Please select at least one category!');
    return;
  }
  
  gameState.playerName = playerName;
  gameState.difficulty = difficulty;
  gameState.selectedCategories = Array.from(checkboxes).map((cb) => cb.value);
  gameState.musicEnabled = document.getElementById('musicToggle').checked;
  
  // Track game start in analytics
  trackGameStart(gameState.selectedCategories.join(','));
  
  const questions = getQuestionsForGame(difficulty);
  if (questions.length === 0) {
    alert('No questions found for selected categories and difficulty.');
    return;
  }
  
  gameState.quiz = { ...gameState.quiz, _questions: questions };
  gameState.currentQuestion = 0;
  gameState.score = 0;
  gameState.gameStarted = true;
  gameState.gameOver = false;
  gameState.answerLocked = false;
  if (gameState.timerInterval) clearInterval(gameState.timerInterval);
  if (gameState.advanceTimeout) clearTimeout(gameState.advanceTimeout);
  
  initBackgroundMusic();
  playBackgroundMusic();
  render();
}

// Handle answer selection
function setOptionButtonsDisabled(disabled) {
  document.querySelectorAll('#options button').forEach((button) => {
    button.disabled = disabled;
  });
}

function advanceQuestion() {
  gameState.currentQuestion++;
  gameState.answerLocked = false;
  if (gameState.currentQuestion >= gameState.quiz._questions.length) {
    gameState.gameOver = true;
    stopBackgroundMusic();
    trackGameEnd(gameState.score, gameState.quiz._questions.length);
  } else {
    gameState.timeRemaining = 30;
  }
  render();
}

function selectAnswer(selectedAnswer) {
  if (!gameState.gameStarted || gameState.gameOver || gameState.answerLocked) return;
  gameState.answerLocked = true;
  if (gameState.timerInterval) {
    clearInterval(gameState.timerInterval);
    gameState.timerInterval = null;
  }
  setOptionButtonsDisabled(true);
  
  const questions = gameState.quiz._questions;
  const currentQ = questions[gameState.currentQuestion];
  const isCorrect = selectedAnswer === currentQ.correct_answer;
  const message = document.getElementById('message');
  
  if (isCorrect) {
    gameState.score += { easy: 1, medium: 2, hard: 3 }[gameState.difficulty] || 1;
    message.textContent = '✨ Correct!';
    message.className = 'message success';
    trackAnswer(true, currentQ.category || 'unknown');
  } else {
    message.textContent = `👻 Wrong! Correct answer: ${currentQ.correct_answer}`;
    message.className = 'message error';
    trackAnswer(false, currentQ.category || 'unknown');
  }
  
  gameState.advanceTimeout = setTimeout(advanceQuestion, 2000);
}

// Timer logic
function startTimer() {
  if (gameState.timerInterval) clearInterval(gameState.timerInterval);
  
  gameState.timeRemaining = 30;
  gameState.timerInterval = setInterval(() => {
    gameState.timeRemaining--;
    updateTimerUI();
    
    if (gameState.timeRemaining <= 0 && !gameState.answerLocked) {
      gameState.answerLocked = true;
      clearInterval(gameState.timerInterval);
      gameState.timerInterval = null;
      setOptionButtonsDisabled(true);
      const message = document.getElementById('message');
      message.textContent = '⏰ Time\'s up!';
      message.className = 'message warning';
      
      gameState.advanceTimeout = setTimeout(advanceQuestion, 2000);
    }
  }, 1000);
}

function updateTimerUI() {
  const timerEl = document.getElementById('timer');
  const progressEl = document.getElementById('progressFill');
  if (timerEl) {
    timerEl.textContent = gameState.timeRemaining;
  }
  if (progressEl) {
    progressEl.style.width = (gameState.timeRemaining / 30) * 100 + '%';
  }
}

// Play again
function playAgain() {
  gameState.currentQuestion = 0;
  gameState.score = 0;
  gameState.gameStarted = false;
  gameState.gameOver = false;
  gameState.playerName = '';
  gameState.selectedCategories = [];
  gameState.timeRemaining = 30;
  gameState.answerLocked = false;
  if (gameState.timerInterval) clearInterval(gameState.timerInterval);
  if (gameState.advanceTimeout) clearTimeout(gameState.advanceTimeout);
  stopBackgroundMusic();
  render();
}

// Render the UI
function render() {
  const setupEl = document.getElementById('setup');
  const gameEl = document.getElementById('game');
  
  if (!gameState.gameStarted) {
    setupEl.classList.add('active');
    gameEl.classList.remove('active');
    renderSetup();
  } else if (gameState.gameOver) {
    setupEl.classList.remove('active');
    gameEl.classList.add('active');
    renderGameOver();
  } else {
    setupEl.classList.remove('active');
    gameEl.classList.add('active');
    renderGame();
  }
}

function renderSetup() {
  const categoriesEl = document.getElementById('categories');
  if (!gameState.quiz || Object.keys(gameState.quiz).length === 0) {
    categoriesEl.innerHTML = '<p>Loading categories...</p>';
    return;
  }
  
  categoriesEl.innerHTML = '';
  Object.entries(gameState.quiz).forEach(([catId, catQuestions]) => {
    if (catId !== '_questions') {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.name = 'category';
      input.value = catId;
      input.checked = true;
      label.appendChild(input);
      label.appendChild(document.createTextNode(catId.toUpperCase()));
      categoriesEl.appendChild(label);
    }
  });
}

function renderGame() {
  const questions = gameState.quiz._questions;
  if (!questions || gameState.currentQuestion >= questions.length) {
    gameState.gameOver = true;
    render();
    return;
  }
  
  const currentQ = questions[gameState.currentQuestion];
  gameState.answerLocked = false;
  document.getElementById('score').textContent = `Score: ${gameState.score}`;
  document.getElementById('timer').textContent = gameState.timeRemaining;
  document.getElementById('progressFill').style.width = (gameState.timeRemaining / 30) * 100 + '%';
  document.getElementById('question').textContent = currentQ.question;
  
  const optionsEl = document.getElementById('options');
  optionsEl.innerHTML = '';
  currentQ.displayOptions.forEach((option, index) => {
    const btn = document.createElement('button');
    btn.textContent = `${String.fromCharCode(65 + index)}. ${option}`;
    btn.onclick = () => selectAnswer(option);
    optionsEl.appendChild(btn);
  });
  
  document.getElementById('message').textContent = '';
  
  if (!gameState.timerInterval) {
    startTimer();
  }
}

function renderGameOver() {
  document.getElementById('finalScore').textContent = `🎃 Final Score: ${gameState.score} 🎃`;
  document.getElementById('playAgainBtn').onclick = playAgain;
}

// Service Worker registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/pwa/sw.js').catch((error) => {
    console.log('Service Worker registration failed:', error);
  });
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', async () => {
  await loadQuestions();
  render();
});
