"""Regression checks for the canonical sampled-audio mapping."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP_JS = ROOT / "src" / "halloween_quiz" / "web" / "static" / "app.js"
INDEX_HTML = ROOT / "src" / "halloween_quiz" / "web" / "templates" / "index.html"

RUNTIME_ASSETS = {
    "spooky-master-main.mp3",
    "ui-click.wav",
    "category-select.wav",
    "quiz-start.wav",
    "answer-correct.wav",
    "answer-incorrect.wav",
    "achievement-earned.wav",
    "diamond-earned.wav",
    "stage-complete.wav",
    "round-complete.wav",
}


def test_canonical_audio_assets_exist_and_are_centrally_mapped() -> None:
    """Every sampled event resolves to a copied permanent sound asset."""
    app_js = APP_JS.read_text(encoding="utf-8")
    index_html = INDEX_HTML.read_text(encoding="utf-8")

    assert "const AUDIO_EVENTS = Object.freeze" in app_js
    assert 'url: "/sounds/spooky-master-main.mp3"' in app_js
    assert 'src="/sounds/spooky-master-main.mp3"' in index_html

    for filename in RUNTIME_ASSETS:
        assert (ROOT / "assets" / "sounds" / filename).is_file()
        assert f'"/sounds/{filename}"' in app_js or filename == "spooky-master-main.mp3"


def test_audio_failures_use_web_audio_fallback_and_timer_keeps_a_short_tick() -> None:
    """A missing sampled file must degrade to synthesis without blocking play."""
    app_js = APP_JS.read_text(encoding="utf-8")

    assert "audio.play().catch(() => this.playSynthFallback(fallback))" in app_js
    assert 'timer_warning: { url: null, level: 0.40, fallback: "tick" }' in app_js
    assert 'this.sound.play("timer_warning")' in app_js


def test_runtime_code_does_not_depend_on_the_temporary_source_library() -> None:
    """The temporary library can be removed after copied assets are present."""
    runtime_files = [APP_JS, INDEX_HTML, ROOT / "src" / "halloween_quiz" / "web" / "app.py"]
    forbidden_paths = ("music&sound", "music and sound", "music%20and%20sound")

    for runtime_file in runtime_files:
        content = runtime_file.read_text(encoding="utf-8").lower()
        assert not any(path in content for path in forbidden_paths)
