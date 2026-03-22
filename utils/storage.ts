export class IDBStorage {
    private dbName = 'mgi-dream-db';
    private storeName = 'store';
    private db: IDBDatabase | null = null;
  
    private async init(): Promise<IDBDatabase> {
      if (this.db) return this.db;
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(this.storeName)) {
            request.result.createObjectStore(this.storeName);
          }
        };
        request.onsuccess = () => {
          this.db = request.result;
          resolve(request.result);
        };
        request.onerror = () => reject(request.error);
      });
    }
  
    async setItem(key: string, value: any): Promise<void> {
      const db = await this.init();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(value, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  
    async getItem(key: string): Promise<any> {
      const db = await this.init();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
  
    async removeItem(key: string): Promise<void> {
      const db = await this.init();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }
  
  export const storageEngine = new IDBStorage();
