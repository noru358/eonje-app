export const PLACES = [
  { id: 'yeouido', name: '여의도한강공원', shortName: '여의도', accent: 'river', lat:37.5284, lon:126.9349 },
  { id: 'banpo', name: '반포한강공원', shortName: '반포', accent: 'bridge', lat:37.5100, lon:126.9956 },
  { id: 'ttukseom', name: '뚝섬한강공원', shortName: '뚝섬', accent: 'park', lat:37.5293, lon:127.0682 },
  { id: 'mangwon', name: '망원한강공원', shortName: '망원', accent: 'sunset', lat:37.5524, lon:126.8991 },
  { id: 'jamsil', name: '잠실한강공원', shortName: '잠실', accent: 'city', lat:37.5173, lon:127.0860 },
  { id: 'ichon', name: '이촌한강공원', shortName: '이촌', accent: 'calm', lat:37.5178, lon:126.9705 }
];

export const getPlace = (id) => PLACES.find((p) => p.id === id) ?? PLACES[0];
