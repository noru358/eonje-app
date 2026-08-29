function seoulDate(date) {
  return new Intl.DateTimeFormat('en-CA', {
    year:'numeric', month:'2-digit', day:'2-digit', timeZone:'Asia/Seoul'
  }).format(date);
}

const baseSlots = [
  ['18:00', 28, 20, 0, 3.4, 29, 48, 2, '약간 붐빔'],
  ['19:00', 26, 20, 0, 2.5, 25, 42, 0, '보통'],
  ['20:00', 25, 25, 0, 2.0, 24, 40, 0, '보통'],
  ['21:00', 24, 55, 0.1, 1.7, 26, 44, 0, '보통'],
  ['22:00', 23, 75, 0.8, 1.5, 29, 48, 0, '약간 붐빔'],
  ['23:00', 23, 80, 1.4, 1.4, 31, 50, 0, '보통']
];

const variations = {
  yeouido: { crowdShift: 0, tempShift: 0, rainShift: 0, event: 0 },
  banpo: { crowdShift: 1, tempShift: 0, rainShift: 0, event: -2 },
  ttukseom: { crowdShift: 0, tempShift: 1, rainShift: 0, event: 0 },
  mangwon: { crowdShift: -1, tempShift: 0, rainShift: -5, event: 1 },
  jamsil: { crowdShift: 1, tempShift: 1, rainShift: 5, event: -2 },
  ichon: { crowdShift: -1, tempShift: 0, rainShift: 0, event: 0 }
};

const crowdLevels = ['여유', '보통', '약간 붐빔', '붐빔'];
function shiftCrowd(level, shift) {
  const i = crowdLevels.indexOf(level);
  return crowdLevels[Math.max(0, Math.min(crowdLevels.length - 1, i + shift))];
}

export function mockCityData(placeId, now = new Date()) {
  const v = variations[placeId] ?? variations.yeouido;
  const baseDate = seoulDate(now);
  const iso = (hm) => `${baseDate}T${hm}:00+09:00`;
  const slots = baseSlots.map(([time, temp, rainChance, precipitation, wind, pm25, pm10, uv, crowd], i) => ({
    time: iso(time),
    temp: temp + v.tempShift,
    rainChance: Math.max(0, Math.min(100, rainChance + v.rainShift)),
    precipitation,
    wind,
    pm25,
    pm10,
    uv,
    crowd: shiftCrowd(crowd, i < 6 ? v.crowdShift : 0),
    eventImpact: i >= 2 && i <= 4 ? v.event : 0
  }));
  return {
    mode: 'demo',
    updatedAt: now.toISOString(),
    nowTime: now.toISOString(),
    sunset: iso('19:07'),
    slots
  };
}
