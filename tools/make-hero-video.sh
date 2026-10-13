#!/usr/bin/env bash
# 히어로 영상(assets/hero.mp4) 생성 스크립트
# 목욕탕 외관 2컷 → 목욕탕 내부 3컷을 Ken Burns 줌 + 크로스페이드로 이어 붙입니다.
# 사용법: bash tools/make-hero-video.sh   (ffmpeg, curl 필요 / upload.wikimedia.org 접속 가능해야 함)
# 직접 촬영하거나 구한 영상이 있다면 assets/hero.mp4 로 저장하기만 하면 사이트가 자동으로 재생합니다.
set -euo pipefail
cd "$(dirname "$0")/.."

SHOTS=(
  "Dogo onsen honkan long exposure.jpg"
  "Night in Ginzan Onsen town January 2022 A.jpg"
  "The view from BANDAI in Japanese SENTO 番台からの眺め 01.jpg"
  "Inside Goshono-yu Kinosaki Onsen.jpg"
  'Matsushima Onsen "ICHINOBŌ" Indoor-bath.JPG'
)
DUR=5      # 컷당 초
FADE=1     # 크로스페이드 초
FPS=30
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

urlencode() { python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1].replace(" ","_")))' "$1"; }

inputs=()
for i in "${!SHOTS[@]}"; do
  f="$TMP/$i.jpg"
  curl -fsSL -A "AI_JACUZZI-site/1.0" -o "$f" \
    "https://commons.wikimedia.org/wiki/Special:FilePath/$(urlencode "${SHOTS[$i]}")?width=2400"
  # 컷별 Ken Burns 클립
  frames=$(( (DUR + FADE) * FPS ))
  if (( i % 2 == 0 )); then zexpr="min(1.0+0.0009*on,1.15)"; else zexpr="max(1.15-0.0009*on,1.0)"; fi
  ffmpeg -v error -y -loop 1 -i "$f" -vf \
    "scale=3840:2160:force_original_aspect_ratio=increase,crop=3840:2160,zoompan=z='$zexpr':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=$frames:s=1920x1080:fps=$FPS,eq=contrast=1.04:saturation=1.05,format=yuv420p" \
    -t $((DUR + FADE)) "$TMP/clip$i.mp4"
  inputs+=(-i "$TMP/clip$i.mp4")
done

# 크로스페이드 체인
filter="" prev="[0:v]" offset=$DUR
for ((i = 1; i < ${#SHOTS[@]}; i++)); do
  out="[v$i]"
  filter+="${prev}[$i:v]xfade=transition=fade:duration=$FADE:offset=$offset${out};"
  prev=$out
  offset=$((offset + DUR))
done
filter=${filter%;}

mkdir -p assets
ffmpeg -v error -y "${inputs[@]}" -filter_complex "$filter" -map "$prev" \
  -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -movflags +faststart -an assets/hero.mp4
echo "완료: assets/hero.mp4"
