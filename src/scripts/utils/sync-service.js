import IdbHelper from './idb-helper.js';

const SyncService = {
  async syncPendingStories() {
    if (!navigator.onLine) return;

    try {
      const pendingStories = await IdbHelper.getPendingStories();
      
      for (const story of pendingStories) {
        try {
          const formData = new FormData();
          formData.append('description', story.description);
          formData.append('photo', story.photo);
          if (story.lat && story.lon) {
            formData.append('lat', story.lat);
            formData.append('lon', story.lon);
          }

          const response = await fetch('https://story-api.dicoding.dev/v1/stories', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
          });

          if (!response.ok) throw new Error('Sync failed');

          // Delete from pending store after successful sync
          await IdbHelper.deletePendingStory(story.id);
          
          // Show notification
          this.showNotification('Sync Success', 'Story uploaded successfully!');
        } catch (error) {
          console.error('Failed to sync story:', error);
          this.showNotification('Sync Failed', 'Failed to upload story. Will retry later.', 'error');
        }
      }
    } catch (error) {
      console.error('Sync error:', error);
    }
  },

  showNotification(title, message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <h4>${title}</h4>
      <p>${message}</p>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
};

// Setup online/offline listeners
window.addEventListener('online', () => {
  SyncService.syncPendingStories();
  SyncService.showNotification('Online', 'Connection restored, syncing stories...');
});

window.addEventListener('offline', () => {
  SyncService.showNotification('Offline', 'You are now offline. Changes will be synced when online.', 'info');
});

export default SyncService;