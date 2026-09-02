export const PLACES = [
  {
    id: 'yeouido', name: '여의도한강공원', shortName: '여의도', accent: 'river', lat:37.5284, lon:126.9349,
    signature: '넓은 수변 · 물빛광장 · 도심 이벤트',
    sceneCue: '탁 트인 잔디와 수변, 여의도 도심 스카이라인, 물빛광장 계열의 개방감',
    seasonalCue: { spring:'봄꽃축제는 이벤트 테마일 때만 강조', summer:'넓은 잔디와 청량한 수변', autumn:'황금빛 잔디와 선선한 도심 수변', winter:'넓은 하늘과 차가운 도심 야경' }
  },
  {
    id: 'banpo', name: '반포한강공원', shortName: '반포', accent: 'bridge', lat:37.5100, lon:126.9956,
    signature: '잠수교 · 세빛섬 · 달빛무지개분수',
    sceneCue: '잠수교와 반포대교, 세빛섬이 한눈에 읽히는 도시적 수변',
    seasonalCue: { spring:'서래섬의 봄 산책', summer:'분수와 푸른 수변', autumn:'잠수교와 황금빛 저녁', winter:'세빛섬과 선명한 야경' }
  },
  {
    id: 'ttukseom', name: '뚝섬한강공원', shortName: '뚝섬', accent: 'park', lat:37.5293, lon:127.0682,
    signature: '자벌레(한강플플) · 액티브 수변',
    sceneCue: '자벌레 구조물의 곡선과 넓은 잔디, 자전거·수상레저가 느껴지는 활기',
    seasonalCue: { spring:'연두빛 잔디와 산책', summer:'수상레저와 짙은 초록', autumn:'자벌레와 금빛 잔디', winter:'구조물 실루엣과 차가운 강빛' }
  },
  {
    id: 'mangwon', name: '망원한강공원', shortName: '망원', accent: 'sunset', lat:37.5524, lon:126.8991,
    signature: '넓은 잔디 · 망원정 · 마포나루',
    sceneCue: '낮은 시야의 넓은 잔디와 산책로, 성산대교 방향 수변과 마포 로컬 분위기',
    seasonalCue: { spring:'산책로의 연둣빛과 가벼운 꽃', summer:'짙은 잔디와 수상레저', autumn:'억새·금빛 잔디와 낮은 노을', winter:'넓은 둔치와 맑은 수평선' }
  },
  {
    id: 'jamsil', name: '잠실한강공원', shortName: '잠실', accent: 'city', lat:37.5173, lon:127.0860,
    signature: '롯데월드타워 · 잠실 수중보 · 도시 스카이라인',
    sceneCue: '롯데월드타워가 분명한 동쪽 스카이라인, 잠실 수중보와 생활체육 분위기',
    seasonalCue: { spring:'가족 산책과 야생화', summer:'선명한 타워와 푸른 수변', autumn:'타워 뒤 금빛 하늘과 갈대', winter:'도시 야경과 차가운 강 반사' }
  },
  {
    id: 'ichon', name: '이촌한강공원', shortName: '이촌', accent: 'calm', lat:37.5178, lon:126.9705,
    signature: '갈대·억새 · 조용한 생활형 산책로',
    sceneCue: '갈대와 억새가 이어지는 호안, 조용한 산책·조깅 중심의 생활형 한강',
    seasonalCue: { spring:'잔잔한 초록과 산책', summer:'무성한 수변 녹지', autumn:'억새·코스모스 중심의 가을 산책', winter:'마른 갈대와 정적인 수변' }
  }
];

export const getPlace = (id) => PLACES.find((p) => p.id === id) ?? PLACES[0];
