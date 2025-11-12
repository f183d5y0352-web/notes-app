const IdbHelper = {
  DB_NAME: 'story-app-db',
  STORE_NAME: 'stories',
  VERSION: 1,

  async openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object stores jika belum ada
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('pending-stories')) {
          db.createObjectStore('pending-stories', { keyPath: 'id' });
        }
      };
    });
  },

  async saveStory(story) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      // Pastikan story punya semua field yang diperlukan
      const storyData = {
        id: story.id,
        name: story.name,
        description: story.description,
        photoUrl: story.photoUrl,
        lat: story.lat,
        lon: story.lon,
        createdAt: story.createdAt,
        savedAt: new Date().toISOString() // Tambahkan timestamp
      };

      const request = store.put(storyData);
      
      request.onsuccess = () => {
        console.log('Story saved to IndexedDB:', storyData);
        resolve(storyData);
      };
      
      request.onerror = () => {
        console.error('Error saving story:', request.error);
        reject(request.error);
      };
    });
  },

  async deleteStory(id) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('Story deleted from IndexedDB:', id);
        resolve();
      };
      
      request.onerror = () => {
        console.error('Error deleting story:', request.error);
        reject(request.error);
      };
    });
  },

  async getAllStories() {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_NAME, 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        console.log('All stories retrieved from IndexedDB:', request.result);
        resolve(request.result);
      };
      
      request.onerror = () => {
        console.error('Error getting stories:', request.error);
        reject(request.error);
      };
    });
  },

  async getStory(id) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_NAME, 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => reject(request.error);
    });
  },

  async searchStories(query) {
    const db = await this.openDB();
    const allStories = await this.getAllStories();
    
    return allStories.filter(story =>
      story.name.toLowerCase().includes(query.toLowerCase()) ||
      story.description.toLowerCase().includes(query.toLowerCase())
    );
  },

  async hasStory(id) {
    const story = await this.getStory(id);
    return !!story;
  },

  async savePendingStory(story) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('pending-stories', 'readwrite');
      const store = transaction.objectStore('pending-stories');
      const request = store.put({
        id: `pending-${Date.now()}`,
        ...story,
        createdAt: new Date().toISOString()
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async getPendingStories() {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('pending-stories', 'readonly');
      const store = transaction.objectStore('pending-stories');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  async deletePendingStory(id) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('pending-stories', 'readwrite');
      const store = transaction.objectStore('pending-stories');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};

export default IdbHelper;