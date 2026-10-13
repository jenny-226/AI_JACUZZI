# AI JACUZZI · 湯の宿

일본 전통 목조 온천장(목욕탕) 컨셉의 원페이지 웹사이트입니다.
레이아웃과 컬러는 아임웹 "호텔월광" 템플릿을 기준으로 했습니다 — 흰 배경, 연회색 푸터, 핑크 포인트(`#f0466e`).

## 구성
| 섹션 | 내용 |
|---|---|
| HERO | 외관 2 → 내부·노천탕 5 → 대표 상품 6 **슬라이드 13장** (좌우 화살표·점 네비게이션·스와이프, 김 오르는 효과) |
| 01_ ABOUT | 소개 문구 + 사진 3장 |
| 배너 | 콜라보 문구 + 온천 거리 야경 |
| 4가지 특징 | [湯] [食べ物] [お土産] [散歩] |
| 02_ BATH | 사계절 탕 [春][夏][秋][冬] |
| 03_ SOUVENIR | 온천 마을 기념품 갤러리 |
| 04_ RESERVATION | 이용 안내 아코디언 + AGREE 버튼 |
| 05_ LOCATION | 어두운 배경 오시는 길 |
| FOOTER | 사업자 정보, 사진 출처 |

## 폴더 구조
```
index.html
css/style.css
js/main.js
assets/images/
├── hero/exterior-bridge.jpg     목욕탕 외관 (붉은 다리)
├── hero/interior-dragon.jpg     목욕탕 내부 (용머리 탕)
├── hero/souvenir-shop.jpg       기념품 진열대
├── exterior-night.jpg           야경 외관
├── interior-mural.jpg           타일 벽화 내탕
└── souvenir/                    기념품 갤러리 5장
```
내 사진을 추가·교체하려면 `assets/images/`에 파일을 넣고 HTML의 `data-img`에 `assets/images/파일명.jpg`를 적으면 됩니다.

## 사진
`assets/images/`의 내 이미지가 먼저 쓰이고, 비슷한 분위기의 실사 사진(Wikimedia Commons)이 함께 섞여 들어갑니다.
Commons 사진이 열리지 않는 자리는 자동으로 내 이미지로 대체됩니다.
모든 사진은 Wikimedia Commons의 실제 사진입니다(도고온천 본관, 긴잔온천, 센토 내부, 기노사키 고쇼노유, 쿠사츠 유바타케 등).
HTML의 `data-img="파일명"`에 Commons 파일명을 적으면 `js/main.js`가 해당 사진을 불러오고, 푸터의 PHOTO CREDITS에 출처 링크를 자동으로 표시합니다.
사진을 바꾸려면 `data-img` 값만 다른 Commons 파일명으로 바꾸면 됩니다.

- `data-img="사진A.jpg|사진B.jpg|사진C.jpg"`처럼 `|`로 여러 후보를 적으면, 앞의 사진이 열리지 않을 때 다음 사진을 씁니다.
- 사진을 불러오는 동안은 은은하게 반짝이는 로딩 화면이 보입니다.
- 모든 후보가 실패하거나 인터넷이 끊겨 있으면 갈색 그라데이션 + 「湯」 대체 화면이 표시되어 페이지가 깨지지 않습니다.
- 푸터의 PHOTO CREDITS에는 실제로 표시된 사진만 출처로 올라갑니다.

## 히어로 슬라이드
별도 동영상 파일 없이 **HTML·CSS·JavaScript만으로** 재생됩니다.
외관 2컷 → 내부 3컷 실사 사진이 CSS 애니메이션(천천히 확대·이동 + 크로스페이드)으로 이어지고,
JavaScript `<canvas>`로 온천 김이 피어오르는 효과를 그립니다.

## 실행
설치나 빌드 없이 `index.html`을 브라우저(Chrome, Edge 등)로 열면 바로 실행됩니다.

```
index.html      ← 페이지 구조 (HTML)
css/style.css   ← 디자인·색상·애니메이션 (CSS)
js/main.js      ← 영상 시퀀스·김 효과·메뉴·아코디언 (JavaScript)
```
