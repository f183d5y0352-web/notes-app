const IdbHelper = {
  DATABASE_NAME: 'story-app-db',
  DATABASE_VERSION: 1,
  OBJECT_STORE_NAME: 'stories',
  SYNC_STORE_NAME: 'pending-stories',

  async openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DATABASE_NAME, this.DATABASE_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create stories store
        if (!db.objectStoreNames.contains(this.OBJECT_STORE_NAME)) {
          db.createObjectStore(this.OBJECT_STORE_NAME, { keyPath: 'id' });
        }

        // Create pending stories store
        if (!db.objectStoreNames.contains(this.SYNC_STORE_NAME)) {
          db.createObjectStore(this.SYNC_STORE_NAME, { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  },

  async getAllStories() {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.OBJECT_STORE_NAME, 'readonly');
      const store = transaction.objectStore(this.OBJECT_STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  },

  async saveStory(story) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.OBJECT_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.OBJECT_STORE_NAME);
      const request = store.put(story);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  },

  async deleteStory(id) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.OBJECT_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.OBJECT_STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  },

  async savePendingStory(story) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.SYNC_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.SYNC_STORE_NAME);
      const request = store.add({ ...story, timestamp: Date.now() });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  },

  async getPendingStories() {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.SYNC_STORE_NAME, 'readonly');
      const store = transaction.objectStore(this.SYNC_STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  },

  async deletePendingStory(id) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.SYNC_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.SYNC_STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  },

  async searchStories(query) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.OBJECT_STORE_NAME, 'readonly');
      const store = transaction.objectStore(this.OBJECT_STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const stories = request.result;
        const filteredStories = stories.filter(story => 
          story.description.toLowerCase().includes(query.toLowerCase()) ||
          story.name.toLowerCase().includes(query.toLowerCase())
        );
        resolve(filteredStories);
      };
    });
  },

  async hasStory(id) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.OBJECT_STORE_NAME, 'readonly');
      const store = tx.objectStore(this.OBJECT_STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => reject(req.error);
    });
  },
};

export default IdbHelper;