import StoryAPI from '../data/story-api';
import NotificationAPI from '../data/notification-api';
import Footer from '../components/footer';
import StoryIdb from '../data/story-idb.js';
import IdbHelper from '../utils/idb-helper.js';

class HomePage {
  #map = null;
  #markers = new L.LayerGroup();
  #stories = [];
  #allStories = []; // TAMBAHKAN: simpan data asli
  #activeMarkerId = null;
  
  async render() {
    if (!localStorage.getItem('token')) {
      window.location.hash = '#/login';
      return;
    }

    const isSubscribed = await NotificationAPI.isSubscribed();
    const notificationIcon = isSubscribed ? 'fa-bell' : 'fa-bell-slash';
    const notificationTitle = isSubscribed ? 'Disable Notifications' : 'Enable Notifications';

    return `
      <div class="container">
        <h1 class="page-title">Story List</h1>
        
        <div class="story-header">
          <div class="story-filters">
            <!-- TAMBAHKAN: Search input -->
            <input 
              type="search" 
              id="searchInput" 
              class="story-search" 
              placeholder="Search stories..."
              aria-label="Search stories"
            >
            
            <select id="location-filter" aria-label="Filter stories by location">
              <option value="">All Locations</option>
            </select>
          </div>
          <div class="header-actions">
            <!-- TAMBAHKAN: Saved Stories link -->
            <a href="#/saved" class="saved-button" role="button" aria-label="View saved stories">
              <i class="fas fa-star"></i> Saved Stories
            </a>
            
            <button id="notification-toggle" class="notification-button" title="${notificationTitle}" aria-label="${notificationTitle}">
              <i class="fas ${notificationIcon}"></i>
            </button>
            <a href="#/add" class="add-button" role="button">+ Add Story</a>
            <button class="logout-button" id="logoutButton">
              <i class="fas fa-sign-out-alt"></i> Logout
            </button>
          </div>
        </div>
        
        <div class="content-wrapper">
          <div id="map" role="application" aria-label="Story locations map"></div>
          <div class="story-list" id="story-list" role="feed"></div>
        </div>
      </div>
      ${await Footer.render()}
    `;
  }

  async afterRender() {
    if (!localStorage.getItem('token')) {
      return;
    }

    // Initialize map
    this.#initializeMap();
    this.#markers.addTo(this.#map);

    // Setup logout button
    document.getElementById('logoutButton').addEventListener('click', () => {
      localStorage.removeItem('token');
      window.location.hash = '#/login';
    });

    // Setup notification toggle button
    this.#setupNotificationButton();

    // Force map to update its size
    setTimeout(() => {
      this.#map.invalidateSize();
    }, 100);

    try {
      await this.#loadStories();
      this.#renderStories();
      this.#setupFilters();
    } catch (error) {
      if (error.message === 'Unauthorized') {
        localStorage.removeItem('token');
        window.location.hash = '#/login';
      }
    }

    // Setup search functionality
    this.#setupSearch();
  }

  #initializeMap() {
    this.#map = L.map('map').setView([-2.548926, 118.014863], 5)
    
    // Base layers
    const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    });

    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri'
    });

    const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenTopoMap'
    });

    const baseMaps = {
      "Streets": streets,
      "Satellite": satellite, 
      "Topography": topo
    };

    streets.addTo(this.#map);
    L.control.layers(baseMaps).addTo(this.#map);
  }

  #highlightMarker(storyId) {
    // Remove previous highlight and close previous popup
    if (this.#activeMarkerId) {
      this.#markers.eachLayer((layer) => {
        if (layer.options.storyId === this.#activeMarkerId) {
          layer.setIcon(this.#getDefaultIcon());
          layer.closePopup();
        }
      });
    }

    // Set new highlight and open popup with smooth animation
    this.#markers.eachLayer((layer) => {
      if (layer.options.storyId === storyId) {
        // Add animation class to marker
        const markerElement = layer.getElement();
        if (markerElement) {
          markerElement.classList.add('marker-highlight');
        }

        // Smooth fly to location (3 second animation)
        this.#map.flyTo(layer.getLatLng(), 13, {
          duration: 3, // 3 detik untuk animasi
          easeLinearity: 0.25
        });

        // Open popup after a brief delay for smoother effect
        setTimeout(() => {
          layer.openPopup();
        }, 500);

        layer.setIcon(this.#getHighlightedIcon());
      }
    });

    this.#activeMarkerId = storyId;
  }

  #getDefaultIcon() {
    return L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41]
    });
  }

  #getHighlightedIcon() {
    return L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
  }

  async #loadStories() {
    try {
      const response = await fetch('https://story-api.dicoding.dev/v1/stories', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      this.#allStories = data.listStory || []; // SIMPAN data asli
      this.#stories = [...this.#allStories]; // Copy untuk display
      
      console.log('Stories loaded:', this.#stories.length);
    } catch (error) {
      // fallback: load saved stories from IndexedDB only when network fails
      this.#stories = await IdbHelper.getAllStories();
      this.#allStories = [...this.#stories];
    }
  }

  async #renderStories() {
    const storyList = document.getElementById('story-list');
    storyList.innerHTML = '';

    // Ambil semua saved stories dari IndexedDB
    const savedStories = await IdbHelper.getAllStories();
    const savedIds = new Set(savedStories.map(s => String(s.id)));

    this.#markers.clearLayers();

    this.#stories.forEach(story => {
      // Add markers to map
      if (story.lat && story.lon) {
        const marker = L.marker([story.lat, story.lon], {
          icon: this.#getDefaultIcon(),
          storyId: story.id
        });

        marker.bindPopup(`
          <div class="map-popup">
            <h3>${story.name}</h3>
            <img src="${story.photoUrl}" alt="${story.description}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 4px; margin-bottom: 8px;">
            <small style="color: #666;">📅 ${new Date(story.createdAt).toLocaleDateString()}</small>
          </div>
        `);

        marker.addTo(this.#markers);
      }

      // Render story item
      const storyElement = document.createElement('article');
      storyElement.className = 'story-item';
      storyElement.dataset.storyId = story.id;
      
      // CEK: apakah story ini sudah disimpan di IndexedDB
      const isSaved = savedIds.has(String(story.id));

      storyElement.innerHTML = `
        <img src="${story.photoUrl || ''}" alt="${story.description || ''}">
        <div class="story-item-content">
          <h2>${story.name || 'No name'}</h2>
          <p>${story.description || ''}</p>
          <div class="story-meta">
            <span class="story-date">📅 ${new Date(story.createdAt || Date.now()).toLocaleDateString()}</span>
            ${story.lat && story.lon ? `<span class="story-location">📍 ${story.lat.toFixed(2)}, ${story.lon.toFixed(2)}</span>` : ''}
          </div>
          <div class="story-actions" role="group">
            <button class="save-story" data-id="${story.id}">
              <span class="icon">💾</span><span class="text">${isSaved ? 'Saved' : 'Save'}</span>
            </button>
            ${isSaved ? `<button class="delete-story" data-id="${story.id}"><span class="icon">🗑️</span><span class="text">Hapus</span></button>` : ''}
          </div>
        </div>
      `;

      const saveBtn = storyElement.querySelector('.save-story');
      
      // Set initial state: jika sudah disimpan
      if (isSaved) {
        saveBtn.classList.add('saved');
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<span class="icon">✔</span><span class="text">Saved</span>`;
      }

      // SAVE HANDLER
      saveBtn.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        if (saveBtn.disabled) return;
        
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<span class="icon">⏳</span><span class="text">Saving...</span>`;

        try {
          await IdbHelper.saveStory({
            id: story.id,
            name: story.name,
            description: story.description,
            photoUrl: story.photoUrl,
            lat: story.lat,
            lon: story.lon,
            createdAt: story.createdAt
          });

          // Update UI setelah save berhasil
          saveBtn.classList.add('saved');
          saveBtn.innerHTML = `<span class="icon">✔</span><span class="text">Saved</span>`;
          
          // TAMBAHKAN tombol Delete SETELAH save berhasil
          const storyActions = storyElement.querySelector('.story-actions');
          if (!storyElement.querySelector('.delete-story')) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-story';
            deleteBtn.dataset.id = story.id;
            deleteBtn.innerHTML = `<span class="icon">🗑️</span><span class="text">Hapus</span>`;
            storyActions.appendChild(deleteBtn);
            
            // Attach delete handler ke tombol yang baru dibuat
            this.#attachDeleteHandler(deleteBtn, story.id, storyElement, saveBtn);
          }
          
          this.#showNotification('Saved', 'Story disimpan ke favorit', 'success');
        } catch (err) {
          console.error('Save failed:', err);
          this.#showNotification('Error', 'Gagal menyimpan story', 'error');
          saveBtn.disabled = false;
          saveBtn.innerHTML = `<span class="icon">💾</span><span class="text">Save</span>`;
        }
      });

      // DELETE HANDLER (hanya jika sudah disimpan)
      const deleteBtn = storyElement.querySelector('.delete-story');
      if (deleteBtn) {
        this.#attachDeleteHandler(deleteBtn, story.id, storyElement, saveBtn);
      }

      // Click to highlight on map
      storyElement.addEventListener('click', (e) => {
        if (e.target.closest('.save-story') || e.target.closest('.delete-story')) return;
        if (story.lat && story.lon) {
          this.#map.flyTo([story.lat, story.lon], 13, {
            duration: 3,
            easeLinearity: 0.25
          });
          this.#highlightMarker(story.id);
          
          document.querySelectorAll('.story-item').forEach(item => item.classList.remove('active'));
          storyElement.classList.add('active');
        }
      });

      storyList.appendChild(storyElement);
    });
  }

  #setupFilters() {
    const filter = document.getElementById('location-filter');
    const locations = [...new Set(this.#stories
      .filter(s => s.lat && s.lon)
      .map(s => `${s.lat},${s.lon}`))];
    
    locations.forEach(location => {
      const [lat, lon] = location.split(',');
      const option = document.createElement('option');
      option.value = location;
      option.textContent = `Location (${lat.slice(0,6)}, ${lon.slice(0,6)})`;
      filter.appendChild(option);
    });

    filter.addEventListener('change', (e) => {
      if (e.target.value) {
        const [lat, lon] = e.target.value.split(',');
        this.#map.flyTo([lat, lon], 13);
      } else {
        this.#map.setView([-2.548926, 118.014863], 5);
      }
    });
  }

  #setupNotificationButton() {
    const notificationBtn = document.getElementById('notification-toggle');
    if (!notificationBtn) return;

    notificationBtn.addEventListener('click', async () => {
      try {
        const isSubscribed = await NotificationAPI.isSubscribed();

        if (isSubscribed) {
          // Unsubscribe
          await NotificationAPI.unsubscribe();
          alert('Push notification telah dimatikan');
        } else {
          // Subscribe
          await NotificationAPI.subscribe();
          alert('Push notification telah diaktifkan');
        }

        // Update UI
        this.#updateNotificationButton(notificationBtn);
      } catch (error) {
        console.error('Error toggling notification:', error);
        alert(`Error: ${error.message}`);
      }
    });
  }

  async #updateNotificationButton(btn) {
    const isSubscribed = await NotificationAPI.isSubscribed();
    const icon = btn.querySelector('i');
    const newIcon = isSubscribed ? 'fa-bell' : 'fa-bell-slash';
    const newTitle = isSubscribed ? 'Disable Notifications' : 'Enable Notifications';

    icon.className = `fas ${newIcon}`;
    btn.title = newTitle;
    btn.setAttribute('aria-label', newTitle);
  }

  async #handleOfflineSubmission(storyData) {
    await StoryIdb.putPendingStory(storyData);
    
    // Setup background sync when online
    window.addEventListener('online', async () => {
      const pendingStories = await StoryIdb.getPendingStories();
      
      for (const story of pendingStories) {
        try {
          const response = await fetch('https://story-api.dicoding.dev/v1/stories', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(story)
          });

          if (response.ok) {
            await StoryIdb.deleteStory(story.id);
          }
        } catch (error) {
          console.error('Failed to sync story:', error);
        }
      }

      await this.#loadStories();
      this.#renderStories();
    });
  }

  #setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    let searchTimeout;

    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value.trim().toLowerCase();

      // Debounce: tunggu 300ms sebelum search
      searchTimeout = setTimeout(() => {
        if (query === '') {
          // Reset ke semua stories
          this.#stories = [...this.#allStories];
        } else {
          // Filter dari data asli
          this.#stories = this.#allStories.filter(story =>
            story.name.toLowerCase().includes(query) ||
            story.description.toLowerCase().includes(query)
          );
        }
        this.#renderStories();
      }, 300);
    });
  }

  #showNotification(title, message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <h4>${title}</h4>
        <p>${message}</p>
      </div>
    `;

    // Add to document
    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  #attachDeleteHandler(deleteBtn, storyId, storyElement, saveBtn) {
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      
      if (!confirm('Hapus story ini dari favorit?')) return;
      
      deleteBtn.disabled = true;
      deleteBtn.innerHTML = `<span class="icon">⏳</span><span class="text">Menghapus...</span>`;

      try {
        await IdbHelper.deleteStory(storyId);
        
        // HAPUS tombol Delete setelah berhasil
        deleteBtn.remove();
        
        // RESET save button
        saveBtn.classList.remove('saved');
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<span class="icon">💾</span><span class="text">Save</span>`;
        
        this.#showNotification('Deleted', 'Story dihapus dari favorit', 'success');
      } catch (err) {
        console.error('Delete error:', err);
        this.#showNotification('Error', 'Gagal menghapus story', 'error');
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = `<span class="icon">🗑️</span><span class="text">Hapus</span>`;
      }
    });
  }
}

export default HomePage;