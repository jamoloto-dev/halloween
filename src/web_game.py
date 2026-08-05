from flask import Flask, render_template_string, request, jsonify, session, redirect, url_for, send_from_directory
import json
import os
import random
from datetime import datetime
import time
import subprocess
import platform
import threading
import shutil
import importlib

# Configure Flask to serve static files from the project's assets/static directory
STATIC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../assets/static'))
app = Flask(__name__, static_folder=STATIC_DIR, static_url_path='/static')
app.secret_key = 'halloween2025'  # Required for session management

# HTML template with CSS for styling (styles/scripts loaded from assets/static)
TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Halloween Quiz 🎃</title>
    <link rel="icon" href="/static/favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="/static/style.css">
</head>
<body>
    <div class="container">
        <header class="header">
          <div class="branding">
            <div class="logo"><img src="/static/logo.svg" alt="Halloween logo" style="width:56px;height:56px;border-radius:12px;display:block"></div>
            <div>
              <h1>Halloween Quiz</h1>
              <p>Sharpen your spooky knowledge — fast, fun, social.</p>
            </div>
          </div>
          <div class="investor-badge">Pitch Ready</div>
        </header>

        <section class="hero">
          <div class="left">
            {% if not session.get('game_started') %}
                <div class="question-card">
                  <h2>Welcome to the Halloween Quiz! 👻</h2>
                  <p style="color:var(--muted);margin-top:8px">Enter your name and choose difficulty to begin.</p>
                  <form method="POST" action="/start" style="margin-top:14px">
                      <input type="text" name="player_name" placeholder="Enter your name" required>
                      <br><br>
                      <select name="difficulty" class="option">
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                      </select>
                      <br><br>
                      <div class="categories">
                          {% for cat_id, cat_name in categories.items() %}
                          <div>
                              <input type="checkbox" name="category" value="{{ cat_id }}"
                                     id="cat_{{ cat_id }}" class="category-checkbox" checked>
                              <label for="cat_{{ cat_id }}" class="category-label">{{ cat_name }}</label>
                          </div>
                          {% endfor %}
                      </div>
                      <br>
                      <button class="option" type="submit">Start Game</button>
                  </form>
                </div>
            {% elif session.get('game_over') %}
                <div class="question-card">
                  <h2>Game Over! 🎃</h2>
                  <div class="score">Final Score: {{ session.get('score', 0) }}</div>
                  <br>
                  <form method="GET" action="/">
                      <button class="option" type="submit">Play Again</button>
                  </form>
                </div>
            {% else %}
                <div class="question-card">
                  <div class="timer-box">
                      <div class="timer" id="timer" role="status" aria-live="polite" aria-atomic="true">{{ session.get('timer', 30) }}</div>
                      <div class="progress-wrap" aria-hidden="true">
                          <div class="progress"><i id="timer-progress" style="width:100%"></i></div>
                      </div>
                  </div>
                  <div id="timer-announcer" class="sr-only" aria-live="assertive" aria-atomic="true"></div>
                  <div class="score">Score: {{ session.get('score', 0) }}</div>
                  <div class="question">{{ question }}</div>
                  <form class="options" method="POST" action="/answer">
                      {% for option in options %}
                          <button class="option card" type="submit" name="answer" value="{{ loop.index0 }}" data-option-index="{{ loop.index0 }}" aria-label="Answer {{ loop.index }}: {{ option }}">
                              <span class="index">{{ loop.index }}</span>
                              <span>{{ option }}</span>
                          </button>
                      {% endfor %}
                  </form>
                </div>
            {% endif %}
          </div>
          <aside class="right">
            <div class="question-card">
              <h3 style="margin-top:0">Quick Stats</h3>
              <ul style="color:var(--muted);line-height:1.6">
                <li>10 questions per game</li>
                <li>3 difficulty levels</li>
                <li>Keyboard-first accessibility</li>
              </ul>
              <div style="margin-top:12px"><button class="option">Share</button></div>
            </div>
          </aside>
        </section>

    </div>

    <!-- Client-side audio elements -->
    {% if start_filename %}
    <audio id="audio-start" src="/sounds/{{ start_filename }}" preload="auto"></audio>
    {% endif %}
    {% if background_filename %}
    <audio id="audio-background" src="/sounds/{{ background_filename }}" preload="auto" loop></audio>
    {% endif %}
    {% if congrats_filename %}
    <audio id="audio-congrats" src="/sounds/{{ congrats_filename }}" preload="auto"></audio>
    {% endif %}
    {% if correct_filename %}
    <audio id="audio-correct" src="/sounds/{{ correct_filename }}" preload="auto"></audio>
    {% endif %}
    {% if incorrect_filename %}
    <audio id="audio-incorrect" src="/sounds/{{ incorrect_filename }}" preload="auto"></audio>
    {% endif %}

    <script>
        (function() {
            const feedback = "{{ feedback | default('') }}";
            const playStart = {{ 'true' if play_start else 'false' }};
            const playCongrats = {{ 'true' if play_congrats else 'false' }};
            const playBackground = {{ 'true' if play_background else 'false' }};
            try {
                if (playStart) {
                    const a = document.getElementById('audio-start'); if (a) { a.play().catch(()=>{}); }
                }
                if (playBackground) {
                    const b = document.getElementById('audio-background'); if (b) { b.play().catch(()=>{}); }
                }
                if (feedback === 'correct') { const el = document.getElementById('audio-correct'); if(el) el.play().catch(()=>{}); }
                else if (feedback === 'incorrect') { const el = document.getElementById('audio-incorrect'); if(el) el.play().catch(()=>{}); }
                if (playCongrats) {
                    const c = document.getElementById('audio-congrats'); if (c) { c.play().catch(()=>{}); }
                    const b = document.getElementById('audio-background'); if (b) { try { b.pause(); b.currentTime = 0; } catch(e){} }
                }
            } catch (e) { }
        })();
    </script>

    <script>
        window.GAME_CONFIG = {
            playStart: {{ 'true' if play_start else 'false' }},
            playBackground: {{ 'true' if play_background else 'false' }},
            playCongrats: {{ 'true' if play_congrats else 'false' }},
            feedback: "{{ feedback | default('') }}",
            timer: {{ session.get('timer', 30) }},
            startFilename: "{{ start_filename or '' }}",
            backgroundFilename: "{{ background_filename or '' }}",
            congratsFilename: "{{ congrats_filename or '' }}",
            correctFilename: "{{ correct_filename or '' }}",
            incorrectFilename: "{{ incorrect_filename or '' }}"
        };
    </script>
    <script src="/static/ui.js"></script>
</body>
</html>
"""

def load_questions():
    """Load questions from the JSON file."""
    questions_file = os.path.join(os.path.dirname(__file__), '../assets/questions.json')
    with open(questions_file, 'r') as f:
        return json.load(f)

class HalloweenQuizWeb:
    def __init__(self):
        self.questions = load_questions()
        self.categories = {
            'spooky': 'Spooky Stories and Urban Legends',
            'costumes': 'Halloween Costumes and Traditions',
            'movies': 'Horror Movies and Characters',
            'history': 'Halloween History and Facts',
            'candy': 'Halloween Candy and Treats',
            'paranormal': 'Paranormal Activity'
        }
        
    def get_questions(self, selected_categories, difficulty):
        """Get questions from selected categories based on difficulty."""
        all_questions = []
        for category in selected_categories:
            if category in self.questions:
                questions = [q for q in self.questions[category] 
                           if q.get('difficulty', 'medium') == difficulty]
                all_questions.extend(questions)
        
        if not all_questions:  # Fallback if no questions for selected difficulty
            for category in selected_categories:
                if category in self.questions:
                    all_questions.extend(self.questions[category])
        
        random.shuffle(all_questions)
        return all_questions[:10]  # 10 questions per game

def play_sound(sound_type):
    """Play sound using python-vlc when available, otherwise fall back to system player.

    This runs playback in a separate thread so it doesn't block the Flask request.
    """
    # Pick .mp3 or .wav if present
    sounds_dir = os.path.join(os.path.dirname(__file__), '../assets/sounds')
    sound_file = None
    for ext in ('.mp3', '.wav'):
        candidate = os.path.join(sounds_dir, f"{sound_type}{ext}")
        if os.path.exists(candidate):
            sound_file = candidate
            break
    if not sound_file:
        return

    def _play_with_vlc(path):
        try:
            import vlc
            player = vlc.MediaPlayer(path)
            # Defensive: MediaPlayer may be None if libVLC isn't usable.
            if player is None:
                return
            player.play()
            # Let it play for the duration of the media in a non-blocking way
            # Sleep for a short while to allow playback to start; player will continue in background
            time.sleep(0.5)
        except Exception:
            # If vlc isn't available or fails, fall back to system player if present
            try:
                if platform.system() == 'Linux' and shutil.which('paplay'):
                    subprocess.Popen(['paplay', path], stderr=subprocess.DEVNULL)
                elif platform.system() == 'Darwin' and shutil.which('afplay'):
                    subprocess.Popen(['afplay', path], stderr=subprocess.DEVNULL)
            except Exception:
                # swallow any errors during fallback playback to avoid crashing the thread
                pass

    # Start playback in a thread so Flask request returns immediately
    t = threading.Thread(target=_play_with_vlc, args=(sound_file,), daemon=True)
    t.start()


@app.route('/sounds/<path:filename>')
def sounds(filename):
    """Serve sound files from assets/sounds for client-side playback."""
    sounds_dir = os.path.join(os.path.dirname(__file__), '../assets/sounds')
    return send_from_directory(sounds_dir, filename)

@app.route('/')
def index():
    session.clear()  # Clear any existing game state
    quiz = HalloweenQuizWeb()
    return render_template_string(TEMPLATE, categories=quiz.categories)

@app.route('/start', methods=['POST'])
def start():
    session['game_started'] = True
    session['player_name'] = request.form['player_name']
    session['difficulty'] = request.form['difficulty']
    session['score'] = 0
    session['timer'] = 30
    session['game_over'] = False
    
    # Get selected categories
    selected_categories = request.form.getlist('category')
    if not selected_categories:  # If none selected, use all
        selected_categories = ['spooky', 'costumes', 'movies', 'history', 'candy', 'paranormal']
    
    # Initialize the quiz and get questions
    quiz = HalloweenQuizWeb()
    session['questions'] = quiz.get_questions(selected_categories, session['difficulty'])
    session['current_question'] = 0
    
    if not session['questions']:  # No questions available
        session['game_over'] = True
        # Determine what sound files exist to inform the template
        sounds_dir = os.path.join(os.path.dirname(__file__), '../assets/sounds')
        def pick_sound(name):
            for ext in ('.mp3', '.wav'):
                p = os.path.join(sounds_dir, f"{name}{ext}")
                if os.path.exists(p):
                    return f"{name}{ext}"
            return None

        start_filename = pick_sound('start')
        congrats_filename = pick_sound('congrats')
        background_filename = pick_sound('background')
        correct_filename = pick_sound('correct') or 'correct.mp3'
        incorrect_filename = pick_sound('incorrect') or 'incorrect.mp3'
        return render_template_string(TEMPLATE, start_filename=start_filename, congrats_filename=congrats_filename, background_filename=background_filename, correct_filename=correct_filename, incorrect_filename=incorrect_filename)
    
    # Determine which sound files exist so the template only embeds
    # audio elements that are present on disk.
    sounds_dir = os.path.join(os.path.dirname(__file__), '../assets/sounds')
    def pick_sound(name):
        for ext in ('.mp3', '.wav'):
            p = os.path.join(sounds_dir, f"{name}{ext}")
            if os.path.exists(p):
                return f"{name}{ext}"
        return None

    start_filename = pick_sound('start')
    congrats_filename = pick_sound('congrats')
    background_filename = pick_sound('background')
    correct_filename = pick_sound('correct') or 'correct.mp3'
    incorrect_filename = pick_sound('incorrect') or 'incorrect.mp3'

    # Get the first question
    question = session['questions'][0]
    # Play start sound and enable background music client-side if available
    return render_template_string(
        TEMPLATE,
        question=question['question'],
        options=question['options'],
        feedback='',
        play_start=True,
        play_background=True,
        play_congrats=False,
        start_filename=start_filename,
        congrats_filename=congrats_filename,
        background_filename=background_filename,
        correct_filename=correct_filename,
        incorrect_filename=incorrect_filename,
    )

@app.route('/answer', methods=['POST'])
def answer():
    if not session.get('game_started') or session.get('game_over'):
        return redirect('/')
        
    current_q = session['questions'][session['current_question']]
    given_answer = request.form.get('answer')
    
    # Check answer and update score
    feedback = ''
    if given_answer is not None:
        given_answer = int(given_answer)
        correct_answer = current_q['options'].index(current_q['correct_answer'])

        if given_answer == correct_answer:
            # Score based on difficulty
            points = {'easy': 1, 'medium': 2, 'hard': 3}
            session['score'] += points.get(session['difficulty'], 1)
            feedback = 'correct'
        else:
            feedback = 'incorrect'
    
    # Move to next question
    session['current_question'] += 1
    session['timer'] = 30  # Reset timer

    # Check if game is over
    if session['current_question'] >= len(session['questions']):
        # Save score
        score_file = os.path.join(os.path.dirname(__file__), '../high_scores.csv')
        with open(score_file, 'a') as f:
            f.write(f"{session['player_name']},{session['score']},{datetime.now()},{session['difficulty']}\n")

        session['game_over'] = True
        # Prepare sound filenames for template: play congrats and stop background
        sounds_dir = os.path.join(os.path.dirname(__file__), '../assets/sounds')
        def pick_sound(name):
            for ext in ('.mp3', '.wav'):
                p = os.path.join(sounds_dir, f"{name}{ext}")
                if os.path.exists(p):
                    return f"{name}{ext}"
            return None

        congrats_filename = pick_sound('congrats')
        background_filename = pick_sound('background')
        correct_filename = pick_sound('correct') or 'correct.mp3'
        incorrect_filename = pick_sound('incorrect') or 'incorrect.mp3'
        return render_template_string(TEMPLATE, feedback=feedback, play_congrats=True, play_background=False, start_filename=None, congrats_filename=congrats_filename, background_filename=background_filename, correct_filename=correct_filename, incorrect_filename=incorrect_filename)

    # Otherwise continue with next question
    question = session['questions'][session['current_question']]
    return render_template_string(TEMPLATE,
                                question=question['question'],
                                options=question['options'],
                                feedback=feedback)


# Demo route for screenshots (does not use session)
@app.route('/demo')
def demo():
    # Pick a representative question from assets/questions.json
    qs = load_questions()
    # Try common categories
    sample = None
    for k in ('spooky','movies','history','candy'):
        if k in qs and len(qs[k])>0:
            sample = qs[k][0]
            break
    if not sample:
        # fallback: any question
        for cat in qs.values():
            if isinstance(cat, list) and cat:
                sample = cat[0]; break
    if not sample:
        sample = { 'question': 'Demo question?', 'options': ['A','B','C','D'] }

    # Render template with play_congrats true to show confetti for visuals
    quiz = HalloweenQuizWeb()
    return render_template_string(TEMPLATE,
                                  categories=quiz.categories,
                                  question=sample.get('question','Demo question'),
                                  options=sample.get('options', ['A','B','C','D']),
                                  feedback='',
                                  play_start=False,
                                  play_background=False,
                                  play_congrats=True,
                                  start_filename=None,
                                  congrats_filename=None,
                                  background_filename=None,
                                  correct_filename=None,
                                  incorrect_filename=None)

if __name__ == '__main__':
    # Ensure the sounds directory exists
    os.makedirs(os.path.join(os.path.dirname(__file__), '../assets/sounds'), exist_ok=True)
    
    # Start the Flask development server
    app.run(debug=True, host='127.0.0.1', port=5000)