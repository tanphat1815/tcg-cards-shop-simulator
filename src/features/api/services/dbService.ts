export class DBService {
  private static instance: DBService;
  private worker: Worker | null = null;
  private queryCallbacks: Map<number, { resolve: (val: any) => void; reject: (err: any) => void }> = new Map();
  private queryId = 0;
  private initPromise: Promise<void> | null = null;

  private constructor() {
    this.init();
  }

  public static getInstance(): DBService {
    if (!DBService.instance) {
      DBService.instance = new DBService();
    }
    return DBService.instance;
  }

  private init() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      // Vite special syntax for workers
      this.worker = new Worker(
        new URL('./dbWorker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (event) => {
        const { type, results, error, id, type: eventType } = event.data;

        if (eventType === 'INIT_SUCCESS') {
          console.log('🚀 DB Service: Worker initialized');
          resolve();
          return;
        }

        if (eventType === 'INIT_ERROR') {
          reject(new Error(error));
          return;
        }

        const callback = this.queryCallbacks.get(id);
        if (callback) {
          if (eventType === 'QUERY_SUCCESS') {
            callback.resolve(results);
          } else {
            callback.reject(new Error(error));
          }
          this.queryCallbacks.delete(id);
        }
      };

      this.worker.postMessage({ type: 'INIT' });
    });

    return this.initPromise;
  }

  public async query(sql: string, params: any[] = []): Promise<any[]> {
    await this.initPromise;

    return new Promise((resolve, reject) => {
      const id = ++this.queryId;
      this.queryCallbacks.set(id, { resolve, reject });
      
      this.worker?.postMessage({
        type: 'QUERY',
        sql,
        params,
        id
      });
    });
  }
}

export const dbService = DBService.getInstance();
