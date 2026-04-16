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
    abilities TEXT,
    attacks TEXT,
    weaknesses TEXT,
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
    raw_data TEXT,
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
    id, name, supertype, subtypes, hp, types, evolveFrom, 
    abilities, attacks, weaknesses, retreatCost, rarity, 
    number, artist, set_id, set_name, series_id, series_name, 
    image, pricing, tcgplayer_id, raw_data
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

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
  const regex = new RegExp(`${fieldName}:\\s*\\[([\\s\\S]*?)\\]`, 'i');
  const match = content.match(regex);
  if (!match) return [];
  
  return match[1]
    .split(',')
    .map(v => v.trim().replace(/^["']|["']$/g, ''))
    .filter(v => v && !v.includes('{')); // Chỉ lấy string đơn giản
}

function extractComplexField(content: string, fieldName: string): string | null {
  // Tìm block [...] hoặc {...} của field
  const regex = new RegExp(`${fieldName}:\\s*(\\[[\\s\\S]*?\\]|\\{[\\s\\S]*?\\})`, 'i');
  const match = content.match(regex);
  if (!match) return null;
  
  let raw = match[1].trim();
  
  // Convert JS object literal-ish string to something closer to JSON
  // Thêm dấu ngoặc kép cho các key phổ biến
  const keys = ['en', 'fr', 'de', 'it', 'es', 'pt', 'nl', 'pl', 'name', 'effect', 'cost', 'damage', 'type', 'value', 'tcgplayer', 'cardmarket', 'id', 'official', 'subtype', 'stamp', 'variants', 'abilities', 'attacks', 'weaknesses'];
  let jsonLike = raw;
  keys.forEach(k => {
    const keyRegex = new RegExp(`(\\s|^|\\{|,)${k}:`, 'g');
    jsonLike = jsonLike.replace(keyRegex, `$1"${k}":`);
  });
  
  // Thay thế nháy đơn bằng nháy kép (cần cẩn thận với nháy đơn bên trong chuỗi)
  // Đây là giải pháp thô, nếu có nháy đơn trong text thì sẽ fail, nhưng dữ liệu này thường dùng nháy kép cho text
  jsonLike = jsonLike.replace(/'/g, '"');
  
  // Loại bỏ dấu phẩy thừa ở cuối array/object (trailing commas)
  jsonLike = jsonLike.replace(/,\s*([\]\}])/g, '$1');

  return jsonLike;
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
      const retreat = content.match(/retreat:\s*(\d+)/i)?.[1] || '0';
      
      const types = JSON.stringify(extractArrayField(content, 'types'));
      const attacks = extractComplexField(content, 'attacks');
      const abilities = extractComplexField(content, 'abilities');
      const weaknesses = extractComplexField(content, 'weaknesses');
      
      const tcgPlayerMatch = content.match(/tcgplayer:\s*(\d+)/i);
      const tcgplayerId = tcgPlayerMatch ? tcgPlayerMatch[1] : null;

      // Xây dựng URL hình ảnh chuẩn theo TCGdex Assets (không kèm đuôi file vì UI tự thêm)
      const imageUrl = `https://assets.tcgdex.net/en/${seriesId}/${setId}/${localId}`;

      insertCard.run(
        cardId,
        name,
        supertype,
        '', // subtypes
        hp,
        types,
        evolveFrom,
        abilities,
        attacks,
        weaknesses,
        parseInt(retreat),
        rarity,
        localId,
        artist,
        setId,
        setNameOrFile,
        seriesId,
        seriesName,
        imageUrl,
        null, // pricing
        tcgplayerId,
        content
      );
      
      totalCards++;
    });
  });
});

console.log(`Hoàn thành! Đã bóc tách ${totalCards} thẻ bài.`);
db.close();
