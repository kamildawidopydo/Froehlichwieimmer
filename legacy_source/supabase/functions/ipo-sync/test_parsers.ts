import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import {
  parseEuronextHtml,
  parseEuronextDate,
  buildExternalKey,
  deriveStatus,
} from './euronextParser.ts';
import { parseStockAnalysisHtmlForTest } from './stockAnalysisParser.ts';
import {
  parseNasdaqPriceRange,
  parseNasdaqJsonForTest,
} from './nasdaqParser.ts';
import { parseYahooHtml } from './yahooParser.ts';
import { decodeHtmlEntities, stripHtml } from './htmlUtils.ts';

Deno.test('parseEuronextDate', () => {
  assertEquals(parseEuronextDate('14/07/2026'), '2026-07-14');
  assertEquals(parseEuronextDate('invalid'), null);
});

Deno.test('buildExternalKey prefers ISIN', () => {
  assertEquals(
    buildExternalKey('euronext', 'FR0014018Y10', 'ALLSF', '2026-07-14'),
    'isin:FR0014018Y10',
  );
});

Deno.test('parseEuronextHtml extracts rows', () => {
  const html = `
    <table>
      <tr><td>Date</td><td>Company name</td><td>Ticker</td><td>ISIN code</td><td>Location</td><td>Market</td></tr>
      <tr><td>14/07/2026</td><td>LE SLIP FRANCAIS</td><td>ALLSF</td><td>FR0014018Y10</td><td>Paris</td><td>Euronext Growth</td></tr>
    </table>
  `;
  const rows = parseEuronextHtml(html);
  assertEquals(rows.length, 1);
  assertEquals(rows[0].companyName, 'LE SLIP FRANCAIS');
  assertEquals(rows[0].ipoDate, '2026-07-14');
});

Deno.test('deriveStatus marks old IPOs as listed', () => {
  const old = new Date();
  old.setDate(old.getDate() - 60);
  const iso = old.toISOString().slice(0, 10);
  assertEquals(deriveStatus(iso), 'listed');
});

Deno.test('parseYahooHtml returns array', () => {
  const rows = parseYahooHtml('<html></html>');
  assertEquals(Array.isArray(rows), true);
});

Deno.test('parseStockAnalysis calendar html', () => {
  const html = `
    <table><tr><td>IPO Date</td><td>Symbol</td><td>Company</td><td>Exchange</td><td>Price Range</td></tr>
    <tr><td>Jul 1, 2026</td><td>BSP</td><td>Bending Spoons</td><td>NASDAQ</td><td>$26.00 - $28.00</td></tr>
    </table>
  `;
  const rows = parseStockAnalysisHtmlForTest(html, 'calendar');
  assertEquals(rows.length, 1);
  assertEquals(rows[0].tickerProposed, 'BSP');
  assertEquals(rows[0].priceRangeLow, 26);
});

Deno.test('decodeHtmlEntities fixes scraped company names', () => {
  assertEquals(
    decodeHtmlEntities('Sunshine Silver Mining &amp; Refining Company'),
    'Sunshine Silver Mining & Refining Company',
  );
  assertEquals(stripHtml('<td>Soci&eacute;t&eacute; G&eacute;n&eacute;rale</td>'), 'Société Générale');
  assertEquals(stripHtml('Jersey Mike&#8217;s Subs'), "Jersey Mike\u2019s Subs");
});

Deno.test('parseEuronextHtml decodes entities in company names', () => {
  const html = `
    <table>
      <tr><td>14/07/2026</td><td>Foo &amp; Bar SA</td><td>FOOB</td><td>FR0014018Y10</td><td>Paris</td><td>Euronext Growth</td></tr>
    </table>
  `;
  const rows = parseEuronextHtml(html);
  assertEquals(rows.length, 1);
  assertEquals(rows[0].companyName, 'Foo & Bar SA');
});

Deno.test('parseNasdaqPriceRange', () => {
  assertEquals(parseNasdaqPriceRange('28.00 - 32.00'), { low: 28, high: 32 });
  assertEquals(parseNasdaqPriceRange('$22.00'), { low: 22, high: 22 });
});

Deno.test('parseNasdaqJsonForTest priced bucket', () => {
  const json = {
    data: {
      priced: {
        rows: [
          {
            companyName: 'Acme Corp',
            proposedTickerSymbol: 'ACME',
            proposedExchange: 'NASDAQ',
            proposedSharePrice: '18.00 - 20.00',
            pricedDate: '07/15/2026',
          },
        ],
      },
    },
  };
  const rows = parseNasdaqJsonForTest(json, 'priced');
  assertEquals(rows.length, 1);
  assertEquals(rows[0].companyName, 'Acme Corp');
  assertEquals(rows[0].priceRangeLow, 18);
  assertEquals(rows[0].autoStatus, 'priced');
});
