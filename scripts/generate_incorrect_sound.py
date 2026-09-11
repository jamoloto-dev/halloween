#!/usr/bin/env python3
"""
Generate a short 'incorrect' WAV sound and write to assets/sounds/incorrect.wav
"""
import math
import os
import struct
import wave


def write_beep(path, freq=880.0, duration=0.22, volume=0.5, rate=44100):
    n_samples = int(rate * duration)
    amplitude = int(32767 * volume)
    frames = bytearray()
    for i in range(n_samples):
        t = float(i) / rate
        # simple envelope: quick attack and decay
        env = 1.0
        # make it a short plucked sound using exponential decay
        env = math.exp(-5.0 * t)
        sample = int(amplitude * env * math.sin(2.0 * math.pi * freq * t))
        frames += struct.pack('<h', sample)

    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(frames)

if __name__ == '__main__':
    out_dir = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sounds')
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, 'incorrect.wav')
    write_beep(out_path, freq=700.0, duration=0.25, volume=0.6)
    print('Wrote', out_path)
