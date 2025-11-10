const DATABASE_NAME = 'story-app-db';
const DATABASE_VERSION = 1;
const OBJECT_STORE_NAME = 'stories';

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(OBJECT_STORE_NAME)) {
        db.createObjectStore(OBJECT_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

const StoryIdb = {
  async deleteStory(id) {
    try {
      const db = await openDB();
      const tx = db.transaction(OBJECT_STORE_NAME, 'readwrite');
      const store = tx.objectStore(OBJECT_STORE_NAME);
      
      return new Promise((resolve, reject) => {
        const request = store.delete(id);
        
        request.onsuccess = () => {
          console.log('Story deleted successfully');
          resolve(true);
        };
        
        request.onerror = () => {
          console.error('Error deleting story:', request.error);
          reject(request.error);
        };

        // Complete transaction
        tx.oncomplete = () => {
          db.close();
        };
      });
    } catch (error) {
      console.error('Failed to delete story:', error);
      throw error;
    }
  },

  async getAllStories() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(OBJECT_STORE_NAME, 'readonly');
      const store = transaction.objectStore(OBJECT_STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  },

  async getStoryById(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(OBJECT_STORE_NAME, 'readonly');
      const store = transaction.objectStore(OBJECT_STORE_NAME);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  },

  async saveStory(story) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(OBJECT_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(OBJECT_STORE_NAME);
      const request = store.put(story);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  },
};

export default StoryIdb;