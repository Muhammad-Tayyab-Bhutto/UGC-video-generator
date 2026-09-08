import subprocess
import os
import math
import struct
import wave
from PIL import Image, ImageDraw, ImageFont

os.makedirs('public/renders', exist_ok=True)
os.makedirs('public/assets', exist_ok=True)

# 1. Ensure sample assets exist
bg = Image.new('RGB', (1080, 1920), color=(20, 24, 33))
draw = ImageDraw.Draw(bg)
for y in range(1920):
    r = int(20 + (y / 1920) * 40)
    g = int(24 + (y / 1920) * 30)
    b = int(33 + (y / 1920) * 60)
    draw.line([(0, y), (1080, y)], fill=(r, g, b))
draw.ellipse([240, 660, 840, 1260], fill=(45, 85, 185), outline=(100, 150, 255), width=8)
bg.save('public/assets/sample_bg.jpg', quality=95)

# Generate 7-second WAV audio
with wave.open('public/assets/sample_audio.wav', 'w') as wav_file:
    wav_file.setnchannels(1)
    wav_file.setsampwidth(2)
    wav_file.setframerate(44100)
    for i in range(int(7.0 * 44100)):
        t = float(i) / 44100
        val = int(16000 * math.sin(2.0 * math.pi * 440.0 * t))
        wav_file.writeframesraw(struct.pack('<h', val))

# 2. Render 210 frames (1080x1920 @ 30 fps) using Pillow matching Composition.tsx
tmp_frames_dir = 'tmp/frames'
os.makedirs(tmp_frames_dir, exist_ok=True)

print("Rendering 210 frames locally...")
for frame in range(210):
    img = bg.copy()
    d = ImageDraw.Draw(img)
    
    # Sticker at frame >= 30
    if frame >= 30:
        d.rounded_rectangle([780, 140, 960, 320], radius=20, fill=(255, 46, 147), outline=(255, 255, 255), width=4)
        d.text((810, 210), "⚡ HOT!", fill=(255, 255, 255))
        
    # Text overlays based on timing
    if frame < 75:
        # Hook text
        d.rounded_rectangle([140, 860, 940, 1060], radius=24, fill=(255, 230, 0))
        d.text((200, 930), "CALORIES TRACKED FROM A PHOTO.", fill=(0, 0, 0))
    elif frame >= 60 and frame < 150:
        # Body text
        d.rounded_rectangle([120, 860, 960, 1060], radius=28, fill=(245, 245, 245))
        d.text((160, 930), "Snap your meal & get full breakdown.", fill=(13, 13, 13))
    elif frame >= 135:
        # CTA text
        d.rounded_rectangle([200, 860, 880, 1060], radius=50, fill=(255, 46, 147))
        d.text((340, 930), "TRY CALAI FREE", fill=(255, 255, 255))
        
    img.save(f"{tmp_frames_dir}/frame_{frame:04d}.png")

print("Assembling MP4 via FFmpeg...")
cmd = [
    'ffmpeg', '-y',
    '-framerate', '30',
    '-i', f'{tmp_frames_dir}/frame_%04d.png',
    '-i', 'public/assets/sample_audio.wav',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192000',
    '-shortest',
    'public/renders/output.mp4'
]
subprocess.run(cmd, check=True)
print("LOCAL MP4 RENDER COMPLETE!")
