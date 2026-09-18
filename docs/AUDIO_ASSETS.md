# Spooky Master Audio Assets

The canonical web app serves these assets from `assets/sounds/` at `/sounds/`.
The files were copied (never moved) from the temporary `music&sound/` source
library on 2026-09-18. Runtime JavaScript and templates do not reference that
temporary directory.

## Runtime Mapping

| Game event | Runtime file | Original source file | Purpose |
| --- | --- | --- | --- |
| Main background music | `/sounds/spooky-master-main.mp3` | `soundgallerybydmitrytaras-halloween-music-400868.mp3` | Default looping home and quiz atmosphere |
| UI click | `/sounds/ui-click.wav` | `mixkit-opening-software-interface-2578.wav` | Lightweight non-gameplay button feedback |
| Category select | `/sounds/category-select.wav` | `mixkit-select-click-1109.wav` | Category cards, Select All, and Clear |
| Quiz start | `/sounds/quiz-start.wav` | `mixkit-page-forward-single-chime-1107.wav` | Successful quiz launch |
| Correct answer | `/sounds/answer-correct.wav` | `mixkit-correct-answer-notification-947.wav` | Immediate positive answer feedback |
| Incorrect answer / timeout | `/sounds/answer-incorrect.wav` | `mixkit-click-error-1110.wav` | Gentle error feedback; timeout uses a lower event gain |
| Achievement | `/sounds/achievement-earned.wav` | `mixkit-correct-positive-notification-957.wav` | Badge and cosmetic reward feedback |
| Booster activation | `/sounds/achievement-earned.wav` | `mixkit-correct-positive-notification-957.wav` | A distinct lower-gain reward cue without adding another source file |
| Diamond earned | `/sounds/diamond-earned.wav` | `mixkit-correct-answer-fast-notification-953.wav` | Community reward claim |
| Stage complete | `/sounds/stage-complete.wav` | `mixkit-correct-answer-reward-952.wav` | Campaign stage completion |
| Round complete | `/sounds/round-complete.wav` | `mixkit-correct-answer-tone-2870.wav` | Non-campaign round completion |

`AUDIO_EVENTS` in `src/halloween_quiz/web/static/app.js` is the sole event-to-file
mapping. `AVAILABLE_TRACKS` is the sole music-track mapping. All short effects
are preloaded; the larger main music file remains `preload="none"` and begins
only following user interaction. It continues between screens and modals, then
restarts with a fade when the player chooses Play Again after a completed round.

## Source-library Inventory

No player was available in the audit environment, and `ffprobe`/`ffmpeg` were
not installed. Selection used filenames, container metadata, duration, and
measured PCM peak/RMS for WAV effects; it does not claim subjective audition.
MP3 durations below are CBR estimates from the reported 256 kbps streams.

| Source file | Format / size | Duration / technical details | Disposition |
| --- | --- | --- | --- |
| `idoberg-creepy-halloween-bell-trap-melody-247720.mp3` | MP3, 366,968 B | ~11.47 s, 44.1 kHz joint stereo | Not selected: too long for a timer tick without editing; procedural tick retained |
| `mfcc-halloween-halloween-music-597345.mp3` | MP3, 680,437 B | ~21.26 s, 44.1 kHz joint stereo | Not selected: short loop, less suitable than selected 92.9 s music |
| `mfcc-halloween-halloween-music-597345 (1).mp3` | MP3, 680,437 B | ~21.26 s, 44.1 kHz joint stereo | Rejected duplicate: identical SHA-256 to the file above |
| `mixkit-click-error-1110.wav` | WAV, 195,766 B | 1.109 s, 44.1 kHz stereo, 16-bit; peak -4.0 dBFS, RMS -23.4 dBFS | Selected: incorrect/timeout |
| `mixkit-correct-answer-fast-notification-953.wav` | WAV, 198,136 B | 1.123 s, 44.1 kHz stereo, 16-bit; peak -0.3 dBFS, RMS -15.6 dBFS | Selected: diamond reward at reduced event gain |
| `mixkit-correct-answer-notification-947.wav` | WAV, 187,192 B | 1.061 s, 44.1 kHz stereo, 16-bit; peak -2.1 dBFS, RMS -20.5 dBFS | Selected: correct answer |
| `mixkit-correct-answer-reward-952.wav` | WAV, 434,512 B | 2.463 s, 44.1 kHz stereo, 16-bit; peak -1.0 dBFS, RMS -20.4 dBFS | Selected: stage completion |
| `mixkit-correct-answer-tone-2870.wav` | WAV, 345,970 B | 1.960 s, 44.1 kHz stereo, 16-bit; peak -2.0 dBFS, RMS -22.8 dBFS | Selected: round completion |
| `mixkit-correct-positive-answer-949.wav` | WAV, 188,500 B | 1.068 s, 44.1 kHz stereo, 16-bit; peak -0.3 dBFS, RMS -16.7 dBFS | Not selected: similar role and louder than selected correct sound |
| `mixkit-correct-positive-notification-957.wav` | WAV, 331,688 B | 1.880 s, 44.1 kHz stereo, 16-bit; peak -2.0 dBFS, RMS -22.7 dBFS | Selected: achievement |
| `mixkit-opening-software-interface-2578.wav` | WAV, 201,764 B | 1.144 s, 44.1 kHz stereo, 16-bit; peak -0.3 dBFS, RMS -22.3 dBFS | Selected: UI click at low event gain |
| `mixkit-page-forward-single-chime-1107.wav` | WAV, 297,956 B | 1.689 s, 44.1 kHz stereo, 16-bit; peak -5.0 dBFS, RMS -22.8 dBFS | Selected: quiz start |
| `mixkit-select-click-1109.wav` | WAV, 195,014 B | 1.104 s, 44.1 kHz stereo, 16-bit; peak -4.0 dBFS, RMS -23.2 dBFS | Selected: category selection |
| `placidplace-spooky-halloween-effects-with-thunder-121665.mp3` | MP3, 3,842,716 B | ~120.09 s, 44.1 kHz joint stereo | Not selected: filename indicates a long effects bed; not used without audition |
| `soulfuljamtracks-halloween-ghost-586107.mp3` | MP3, 1,779,456 B | ~55.61 s, 48 kHz joint stereo | Not selected: role unclear without audition |
| `soundgallerybydmitrytaras-halloween-116010.mp3` | MP3, 3,571,043 B | ~111.60 s, 44.1 kHz joint stereo | Not selected: retained in source; optional alternate track would add unverified choice |
| `soundgallerybydmitrytaras-halloween-music-400868.mp3` | MP3, 2,973,361 B | ~92.92 s, 44.1 kHz joint stereo | Selected: main background music based on clear name and longest music-specific candidate |

## Volume and Resilience

- Music defaults to 25% and is controlled by the existing persisted profile setting.
- Event gains are multiplied by the existing SFX volume: UI/category 30%, timer
  warning 40%, answer feedback 48–60%, achievements 65%, and major completion
  70–75%.
- Important sampled effects duck background music to 35% for 0.85–2.2 seconds;
  audio riddles retain the existing deeper 15% duck.
- When a sampled effect fails to preload or play, `SoundEngine` falls back to
  the existing procedural Web Audio sound. Timer warning intentionally retains
  its procedural tick because no short source tick was available.

## Retained Legacy Runtime Files

The old `horror-ambience.mp3`, `start.mp3`, `correct.mp3`, `incorrect.mp3`,
`congrats.mp3`, and WAV variants remain in `assets/sounds/` as untouched
rollback assets. They are not referenced by the canonical SPA after this
upgrade; procedural Web Audio is the active failure fallback.
