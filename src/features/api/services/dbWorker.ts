import initSqlJs from 'sql.js';

let db: any = null;

async function initDB() {
  try {
    const SQL = await initSqlJs({
      locateFile: () => `/sql-wasm.wasm`
    });

    const response = await fetch('/data/cards.sqlite');
    const arrayBuffer = await response.arrayBuffer();
    
    db = new SQL.Database(new Uint8Array(arrayBuffer));
    console.log('📦 Database Worker: SQLite initialized successfully');
    
    self.postMessage({ type: 'INIT_SUCCESS' });
  } catch (error: any) {
    console.error('❌ Database Worker: Initialization failed', error);
    self.postMessage({ type: 'INIT_ERROR', error: error.message });
  }
}

self.onmessage = async (event) => {
  const { type, sql, params, id } = event.data;

  if (type === 'INIT') {
    await initDB();
    return;
  }

  if (!db) {
    self.postMessage({ id, type: 'ERROR', error: 'Database not initialized' });
    return;
  }

  if (type === 'QUERY') {
    try {
      const stmt = db.prepare(sql);
      stmt.bind(params || []);
      
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();

      self.postMessage({ id, type: 'QUERY_SUCCESS', results });
    } catch (error: any) {
      console.error('❌ Database Worker: Query failed', error);
      self.postMessage({ id, type: 'QUERY_ERROR', error: error.message });
    }
  }
};
