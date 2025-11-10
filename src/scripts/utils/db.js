const DATABASE_NAME = 'story-app-db';
const DATABASE_VERSION = 1;
const OBJECT_STORE_NAME = 'stories';

// Perbaikan cara penggunaan IDB
const dbPromise = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

dbPromise.onupgradeneeded = (event) => {
  const db = event.target.result;
  if (!db.objectStoreNames.contains(OBJECT_STORE_NAME)) {
    db.createObjectStore(OBJECT_STORE_NAME, { keyPath: 'id' });
  }
};

const StoryIdb = {
  async getStories() {
    const db = await (await dbPromise).result;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(OBJECT_STORE_NAME, 'readonly');
      const store = transaction.objectStore(OBJECT_STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  },

  async getStory(id) {
    return (await dbPromise).get(OBJECT_STORE_NAME, id);
  },

  async putStory(story) {
    const db = await (await dbPromise).result;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(OBJECT_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(OBJECT_STORE_NAME);
      const request = store.put(story);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  },

  async deleteStory(id) {
    const db = await (await dbPromise).result;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(OBJECT_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(OBJECT_STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  },

  async searchStories(query) {
    const stories = await this.getStories();
    return stories.filter(story => 
      story.description.toLowerCase().includes(query.toLowerCase()) ||
      story.name.toLowerCase().includes(query.toLowerCase())
    );
  },

  async putPendingStory(story) {
    story.isPending = true;
    return this.putStory(story);
  },

  async getPendingStories() {
    const stories = await this.getStories();
    return stories.filter(story => story.isPending);
  }
};

export default StoryIdb;