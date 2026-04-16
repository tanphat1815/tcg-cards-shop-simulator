import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

// Cấu hình đường dẫn
const SOURCE_REPO = 'F:\\Phatnt-sources\\Pokemon\\cards-database\\data';
const DB_PATH = 'public/data/cards.sqlite';

console.log('--- PHƯỞNG: ROBUST SQLITE BUILDER ---');

// Đảm bảo thư mục đích tồn tại
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Xóa DB cũ nếu có để rebuild sạch
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
}

const db = new Database(DB_PATH);

// Khởi tạo bảng
db.exec(`
  CREATE TABLE series (
    id TEXT PRIMARY KEY,
    name TEXT
  );

  CREATE TABLE sets (
    id TEXT PRIMARY KEY,
    name TEXT,
    serieId TEXT,
    cardCount INTEGER,
    FOREIGN KEY(serieId) REFERENCES series(id)
  );

  CREATE TABLE cards (
    id TEXT PRIMARY KEY,
    name TEXT,
    supertype TEXT,
    subtypes TEXT,
    hp TEXT,
    types TEXT,
    evolveFrom TEXT,
    stage TEXT,
    description TEXT,
    abilities TEXT,
    attacks TEXT,
    weaknesses TEXT,
    resistances TEXT,
    retreatCost INTEGER,
    rarity TEXT,
    number TEXT,
    artist TEXT,
    set_id TEXT,
    set_name TEXT,
    series_id TEXT,
    series_name TEXT,
    image TEXT,
    pricing TEXT,
    tcgplayer_id TEXT,
    FOREIGN KEY(set_id) REFERENCES sets(id),
    FOREIGN KEY(series_id) REFERENCES series(id)
  );
  CREATE INDEX idx_set ON cards(set_id);
  CREATE INDEX idx_series ON cards(series_id);
`);

const insertSeries = db.prepare(`INSERT OR IGNORE INTO series (id, name) VALUES (?, ?)`);
const insertSet = db.prepare(`INSERT OR IGNORE INTO sets (id, name, serieId, cardCount) VALUES (?, ?, ?, ?)`);

const insertCard = db.prepare(`
  INSERT INTO cards (
    id, name, supertype, subtypes, hp, types, evolveFrom, stage, description,
    abilities, attacks, weaknesses, resistances, retreatCost, rarity, 
    number, artist, set_id, set_name, series_id, series_name, 
    image, pricing, tcgplayer_id
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

function getMockPrice(rarity: string | null): number {
  if (!rarity) return 0.99;
  const r = rarity.toLowerCase();
  if (r.includes('secret')) return parseFloat((100 + Math.random() * 400).toFixed(2));
  if (r.includes('ultra') || r.includes('hyper') || r.includes('special')) return parseFloat((40 + Math.random() * 100).toFixed(2));
  if (r.includes('holo')) return parseFloat((5 + Math.random() * 20).toFixed(2));
  if (r.includes('rare')) return parseFloat((1 + Math.random() * 5).toFixed(2));
  if (r.includes('uncommon')) return parseFloat((0.25 + Math.random() * 0.75).toFixed(2));
  return parseFloat((0.05 + Math.random() * 0.20).toFixed(2));
}

function extractField(content: string, fieldName: string): string | null {
  // Tìm field dạng name: "VALUE" hoặc name: { en: "VALUE" }
  const simpleRegex = new RegExp(`${fieldName}:\\s*["'](.+?)["']`, 'i');
  const enRegex = new RegExp(`${fieldName}:\\s*\\{[\\s\\S]*?en:\\s*["'](.+?)["']`, 'i');
  
  const enMatch = content.match(enRegex);
  if (enMatch) return enMatch[1];
  
  const simpleMatch = content.match(simpleRegex);
  if (simpleMatch) return simpleMatch[1];
  
  return null;
}

function extractArrayField(content: string, fieldName: string): string[] {
  const block = extractComplexBlock(content, fieldName);
  if (!block || !block.startsWith('[')) return [];
  
  return block
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map(v => v.trim().replace(/^["']|["']$/g, ''))
    .filter(v => v && !v.includes('{')); // Chỉ lấy string đơn giản
}

/**
 * Thuật toán đếm dấu ngoặc để bóc tách chính xác khối dữ liệu lồng nhau
 */
function extractComplexBlock(content: string, fieldName: string): string | null {
  const startIndex = content.search(new RegExp(`\\b${fieldName}:\\s*[\\{\\[]`, 'i'));
  if (startIndex === -1) return null;
  
  const headerMatch = content.substring(startIndex).match(new RegExp(`^${fieldName}:\\s*([\\{\\[])`, 'i'));
  if (!headerMatch) return null;
  
  const openChar = headerMatch[1];
  const closeChar = openChar === '{' ? '}' : ']';
  
  let count = 0;
  let result = '';
  
  const searchPart = content.substring(startIndex);
  const triggerIndex = searchPart.indexOf(openChar);
  
  for (let i = triggerIndex; i < searchPart.length; i++) {
    const char = searchPart[i];
    if (char === openChar) count++;
    else if (char === closeChar) count--;
    
    result += char;
    if (count === 0) return result;
  }
  
  return null;
}

/**
 * Làm phẳng các object đa ngôn ngữ, ưu tiên Tiếng Anh
 */
function flattenToEnglish(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(item => flattenToEnglish(item));
  }
  if (obj !== null && typeof obj === 'object') {
    if (obj.hasOwnProperty('en')) {
      return obj.en;
    }
    const flattened: any = {};
    for (const key in obj) {
      flattened[key] = flattenToEnglish(obj[key]);
    }
    return flattened;
  }
  return obj;
}

function extractComplexField(content: string, fieldName: string): string | null {
  const raw = extractComplexBlock(content, fieldName);
  if (!raw) return null;

  try {
    const sandbox = {
      Set: { id: '', name: '', serie: '' },
      Serie: { id: '', name: '' }
    };
    
    // Sử dụng Function constructor để eval chuỗi JS thành object
    const fn = new Function('Set', 'Serie', `return ${raw}`);
    const obj = fn(sandbox.Set, sandbox.Serie);
    
    // Làm phẳng sang Tiếng Anh
    const flattened = flattenToEnglish(obj);
    
    return JSON.stringify(flattened);
  } catch (e) {
    return null;
  }
}

const seriesDirs = fs.readdirSync(SOURCE_REPO).filter(f => fs.statSync(path.join(SOURCE_REPO, f)).isDirectory());

let totalCards = 0;

seriesDirs.forEach(seriesName => {
  const seriesPath = path.join(SOURCE_REPO, seriesName);
  
  // 1. Lấy Series ID từ file metadata
  let seriesId = seriesName.toLowerCase().replace(/ /g, '-').replace(/[^-a-z0-9]/g, '');
  let seriesDisplayName = seriesName;
  const seriesMetaFile = path.join(SOURCE_REPO, `${seriesName}.ts`);
  if (fs.existsSync(seriesMetaFile)) {
    const metaContent = fs.readFileSync(seriesMetaFile, 'utf-8');
    const idMatch = metaContent.match(/id:\s*["'](.+?)["']/);
    if (idMatch) seriesId = idMatch[1];
    
    const nameMatch = metaContent.match(/en:\s*["'](.+?)["']/);
    if (nameMatch) seriesDisplayName = nameMatch[1];
  }

  // Insert vào bảng series
  insertSeries.run(seriesId, seriesDisplayName);

  const setDirsOrFiles = fs.readdirSync(seriesPath);
  
  setDirsOrFiles.forEach(setNameOrFile => {
    const setPath = path.join(seriesPath, setNameOrFile);
    if (!fs.existsSync(setPath) || !fs.statSync(setPath).isDirectory()) return;

    // 2. Lấy Set ID từ file metadata
    let setId = setNameOrFile.toLowerCase().replace(/ /g, '-').replace(/[^-a-z0-9]/g, '');
    let setDisplayName = setNameOrFile;
    const setMetaFile = path.join(seriesPath, `${setNameOrFile}.ts`);
    if (fs.existsSync(setMetaFile)) {
      const metaContent = fs.readFileSync(setMetaFile, 'utf-8');
      const idMatch = metaContent.match(/id:\s*["'](.+?)["']/);
      if (idMatch) setId = idMatch[1];
      
      const nameMatch = metaContent.match(/en:\s*["'](.+?)["']/);
      if (nameMatch) setDisplayName = nameMatch[1];
    }

    const cardFiles = fs.readdirSync(setPath).filter(f => f.endsWith('.ts'));
    
    // Insert vào bảng sets
    insertSet.run(setId, setDisplayName, seriesId, cardFiles.length);

    cardFiles.forEach(cardFile => {
      const cardPath = path.join(setPath, cardFile);
      const content = fs.readFileSync(cardPath, 'utf-8');
      
      const localId = cardFile.replace('.ts', '');
      const cardId = `${setId}-${localId}`;
      const name = extractField(content, 'name');
      const rarity = extractField(content, 'rarity');
      const hp = content.match(/hp:\s*(\d+)/i)?.[1] || null;
      const artist = extractField(content, 'illustrator');
      const supertype = extractField(content, 'category');
      const evolveFrom = extractField(content, 'evolveFrom');
      const stage = extractField(content, 'stage');
      const description = extractField(content, 'description') || extractField(content, 'effect');
      const retreat = content.match(/retreat:\s*(\d+)/i)?.[1] || '0';
      
      const types = JSON.stringify(extractArrayField(content, 'types'));
      const attacks = extractComplexField(content, 'attacks');
      const abilities = extractComplexField(content, 'abilities');
      const weaknesses = extractComplexField(content, 'weaknesses');
      const resistances = extractComplexField(content, 'resistances');
      
      // Third Party & Pricing
      const thirdPartyRaw = extractComplexField(content, 'thirdParty');
      let tcgplayerId: string | null = null;
      let pricing = null;

      if (thirdPartyRaw) {
        try {
          const tp = JSON.parse(thirdPartyRaw);
          tcgplayerId = tp.tcgplayer ? Math.floor(Number(tp.tcgplayer)).toString() : null;
        } catch (e) {}
      }

      // Fallback cho tcgplayer_id nếuRegex cũ tìm thấy
      if (!tcgplayerId) {
        const tcgPlayerMatch = content.match(/tcgplayer:\s*(\d+)/i);
        if (tcgPlayerMatch) tcgplayerId = tcgPlayerMatch[1];
      }

      // Luôn tạo giá giả lập để UI trông premium
      const mockMarketPrice = getMockPrice(rarity);
      pricing = {
        tcgplayer: { 
          url: tcgplayerId ? `https://www.tcgplayer.com/product/${tcgplayerId}` : null,
          normal: { marketPrice: mockMarketPrice } 
        },
        cardmarket: { 
          url: `https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=${encodeURIComponent(name || '')}`,
          avg: parseFloat((mockMarketPrice * 0.9).toFixed(2))
        }
      };

      const imageUrl = `https://assets.tcgdex.net/en/${seriesId}/${setId}/${localId}`;

      insertCard.run(
        cardId,
        name,
        supertype,
        '', // subtypes
        hp,
        types,
        evolveFrom,
        stage,
        description,
        abilities,
        attacks,
        weaknesses,
        resistances,
        parseInt(retreat),
        rarity,
        localId,
        artist,
        setId,
        setDisplayName, // Sử dụng tên hiển thị đã bóc tách
        seriesId,
        seriesDisplayName, // Sử dụng tên hiển thị đã bóc tách
        imageUrl,
        JSON.stringify(pricing),
        tcgplayerId
      );
      
      totalCards++;
    });
  });
});

console.log(`Hoàn thành! Đã bóc tách ${totalCards} thẻ bài.`);
db.close();
