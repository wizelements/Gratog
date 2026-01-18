#!/bin/bash
# Extract audio snippets for music psychology integration

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MUSIC_DIR="$PROJECT_DIR/public/music"
MASTERS_DIR="$MUSIC_DIR/masters"
SNIPPETS_DIR="$MUSIC_DIR/snippets"

echo "========================================"
echo "Music Snippet Extraction Tool"
echo "========================================"
echo ""

# Check for ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "Error: ffmpeg not found. Installing..."
    apt-get update -qq 2>/dev/null || pkg update -y 2>/dev/null
    apt-get install -y ffmpeg 2>/dev/null || pkg install -y ffmpeg 2>/dev/null
fi

# Convert WAV to MP3
echo "Converting audio to MP3 (320kbps)..."
for file in "$MASTERS_DIR"/*.wav; do
    if [ -f "$file" ]; then
        output="${file%.*}.mp3"
        echo "  Converting: $(basename "$file")"
        ffmpeg -i "$file" -q:a 0 -b:a 320k "$output" -y 2>/dev/null || echo "  (skipped)"
    fi
done

echo ""
echo "Extracting snippets..."
echo ""

# FROM "THAT GRATITUDE"
echo "▶ That Gratitude"
ffmpeg -i "$MASTERS_DIR/that-gratitude.mp3" -ss 0 -t 30 -q:a 0 -b:a 320k "$SNIPPETS_DIR/that-gratitude/intro_0-30s.mp3" -y 2>/dev/null && echo "  ✓ intro (0-30s)"
ffmpeg -i "$MASTERS_DIR/that-gratitude.mp3" -ss 180 -t 60 -q:a 0 -b:a 320k "$SNIPPETS_DIR/that-gratitude/processing_3-4min.mp3" -y 2>/dev/null && echo "  ✓ processing (3-4 min)"
ffmpeg -i "$MASTERS_DIR/that-gratitude.mp3" -ss 480 -t 120 -q:a 0 -b:a 320k "$SNIPPETS_DIR/that-gratitude/climax_8-10min.mp3" -y 2>/dev/null && echo "  ✓ climax (8-10 min)"
ffmpeg -i "$MASTERS_DIR/that-gratitude.mp3" -ss 180 -t 600 -q:a 0 -b:a 192k "$SNIPPETS_DIR/that-gratitude/ambient_loop_10min.mp3" -y 2>/dev/null && echo "  ✓ ambient loop (10 min)"

echo ""
echo "▶ Can't Let It Go"
ffmpeg -i "$MASTERS_DIR/cant-let-it-go.mp3" -ss 0 -t 120 -q:a 0 -b:a 320k "$SNIPPETS_DIR/cant-let-it-go/struggle_0-2min.mp3" -y 2>/dev/null && echo "  ✓ struggle (0-2 min)"
ffmpeg -i "$MASTERS_DIR/cant-let-it-go.mp3" -ss 420 -t 60 -q:a 0 -b:a 320k "$SNIPPETS_DIR/cant-let-it-go/acceptance_7-8min.mp3" -y 2>/dev/null && echo "  ✓ acceptance (7-8 min)"
ffmpeg -i "$MASTERS_DIR/cant-let-it-go.mp3" -ss 600 -t 60 -q:a 0 -b:a 320k "$SNIPPETS_DIR/cant-let-it-go/victory_10-11min.mp3" -y 2>/dev/null && echo "  ✓ victory (10-11 min)"
ffmpeg -i "$MASTERS_DIR/cant-let-it-go.mp3" -ss 240 -t 420 -q:a 0 -b:a 192k "$SNIPPETS_DIR/cant-let-it-go/journey_4-11min.mp3" -y 2>/dev/null && echo "  ✓ journey loop (7 min)"

echo ""
echo "▶ Under the Covers"
ffmpeg -i "$MASTERS_DIR/under-covers.mp3" -ss 0 -t 90 -q:a 0 -b:a 320k "$SNIPPETS_DIR/under-covers/opening_0-1m.mp3" -y 2>/dev/null && echo "  ✓ opening (0-1:30)"
ffmpeg -i "$MASTERS_DIR/under-covers.mp3" -ss 120 -t 180 -q:a 0 -b:a 320k "$SNIPPETS_DIR/under-covers/vulnerability_2-5min.mp3" -y 2>/dev/null && echo "  ✓ vulnerability (2-5 min)"
ffmpeg -i "$MASTERS_DIR/under-covers.mp3" -ss 360 -t 120 -q:a 0 -b:a 320k "$SNIPPETS_DIR/under-covers/warmth_6-8min.mp3" -y 2>/dev/null && echo "  ✓ warmth (6-8 min)"
ffmpeg -i "$MASTERS_DIR/under-covers.mp3" -ss 120 -t 480 -q:a 0 -b:a 192k "$SNIPPETS_DIR/under-covers/contemplative_loop_8min.mp3" -y 2>/dev/null && echo "  ✓ contemplative loop (8 min)"

echo ""
echo "========================================"
echo "✓ Snippet extraction complete!"
echo "========================================"
echo ""
du -sh "$SNIPPETS_DIR"
echo "Total snippets created"
