import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSeoulXml } from '../src/seoul-xml.mjs';
import { normalizeSeoulCityData } from '../src/seoul-adapter.mjs';

const successXml = `<?xml version="1.0" encoding="UTF-8"?>
<SeoulRtd.citydata>
  <list_total_count>1</list_total_count>
  <RESULT><RESULT.CODE>INFO-000</RESULT.CODE><RESULT.MESSAGE>정상 처리되었습니다</RESULT.MESSAGE></RESULT>
  <CITYDATA>
    <AREA_NM>여의도한강공원</AREA_NM>
    <LIVE_PPLTN_STTS><LIVE_PPLTN_STTS>
      <AREA_CONGEST_LVL>약간 붐빔</AREA_CONGEST_LVL>
      <PPLTN_TIME>2026-08-28 18:00</PPLTN_TIME>
      <FCST_PPLTN><FCST_PPLTN><FCST_TIME>2026-08-28 19:00</FCST_TIME><FCST_CONGEST_LVL>보통</FCST_CONGEST_LVL></FCST_PPLTN></FCST_PPLTN>
    </LIVE_PPLTN_STTS></LIVE_PPLTN_STTS>
    <WEATHER_STTS><WEATHER_STTS>
      <TEMP>28</TEMP><WIND_SPD>2.5</WIND_SPD><PM25>21</PM25><PM10>39</PM10><UV_INDEX>1</UV_INDEX><SUNSET>19:07</SUNSET><WEATHER_TIME>2026-08-28 18:00</WEATHER_TIME>
      <FCST24HOURS>
        <FCST24HOURS><FCST_DT>202608281900</FCST_DT><TEMP>26</TEMP><PRECIPITATION>0</PRECIPITATION><RAIN_CHANCE>20</RAIN_CHANCE></FCST24HOURS>
        <FCST24HOURS><FCST_DT>202608282000</FCST_DT><TEMP>25</TEMP><PRECIPITATION>0</PRECIPITATION><RAIN_CHANCE>30</RAIN_CHANCE></FCST24HOURS>
      </FCST24HOURS>
    </WEATHER_STTS></WEATHER_STTS>
  </CITYDATA>
</SeoulRtd.citydata>`;

test('parses official Seoul XML shape and feeds normalizer', () => {
  const payload = parseSeoulXml(successXml);
  assert.equal(payload['SeoulRtd.citydata'].RESULT['RESULT.CODE'], 'INFO-000');
  const result = normalizeSeoulCityData(payload, { referenceDate: new Date('2026-08-28T09:00:00Z') });
  assert.equal(result.slots.length, 2);
  assert.equal(result.slots[0].temp, 26);
  assert.equal(result.slots[0].crowd, '보통');
});

test('surfaces Seoul XML RESULT errors as readable errors', () => {
  const xml = '<RESULT><CODE-?>ignored</CODE-?><RESULT.CODE>ERROR-301</RESULT.CODE><RESULT.MESSAGE>INVALID KEY</RESULT.MESSAGE></RESULT>';
  assert.throws(() => parseSeoulXml(xml), /ERROR-301.*INVALID KEY/);
});
