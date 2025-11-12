import IdbHelper from '../utils/idb-helper.js';

class SavedStoriesPage {
  #stories = [];
  #map = null;
  #markers = new L.LayerGroup();
  #activeMarkerId = null;

  async render() {
    return `
      <div class="container">
        <div class="saved-header">
          <h1 class="page-title">⭐ Saved Stories</h1>
          <a href="#/" class="back-to-home" aria-label="Back to home">
            <i class="fas fa-arrow-left"></i> Back to Home
          </a>
        </div>

        <div class="saved-filters">
          <input 
            type="search" 
            id="searchInput" 
            class="story-search" 
            placeholder="Search saved stories..."
            aria-label="Search saved stories"
          >
        </div>

        <div class="saved-content-wrapper">
          <div id="map" class="saved-map" role="application" aria-label="Saved story locations"></div>
          <div id="story-list" class="saved-story-list" role="feed"></div>
        </div>
      </div>
    `;
  }

  async afterRender() {
    this.#initializeMap();
    await this.#loadSavedStories();
    this.#renderStories();
    this.#setupSearch();
  }

  #initializeMap() {
    this.#map = L.map('map').setView([-2.5489, 118.0149], 4);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.#map);
    
    this.#markers.addTo(this.#map);
  }

  async #loadSavedStories() {
    try {
      this.#stories = await IdbHelper.getAllStories();
      console.log('Saved stories loaded:', this.#stories.length);
      
      if (this.#stories.length === 0) {
        this.#showNotification('Info', 'Belum ada story yang disimpan', 'info');
      }
    } catch (error) {
      console.error('Load error:', error);
      this.#showNotification('Error', 'Gagal memuat saved stories', 'error');
    }
  }

  #renderStories() {
    const storyList = document.getElementById('story-list');
    storyList.innerHTML = '';

    if (this.#stories.length === 0) {
      storyList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <p>Belum ada story yang disimpan</p>
          <a href="#/" class="back-to-home-btn">Kembali ke Home</a>
        </div>
      `;
      return;
    }

    this.#markers.clearLayers();

    this.#stories.forEach(story => {
      // Add markers
      if (story.lat && story.lon) {
        const marker = L.marker([story.lat, story.lon], {
          icon: this.#getDefaultIcon(),
          storyId: story.id
        });

        marker.bindPopup(`
          <div class="map-popup">
            <h3>${story.name}</h3>
            <img src="${story.photoUrl}" alt="${story.description}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px; margin-bottom: 8px;">
            <small style="color: #666;">📅 ${new Date(story.createdAt).toLocaleDateString()}</small>
          </div>
        `);

        marker.addTo(this.#markers);
      }

      // Render story item
      const storyElement = document.createElement('article');
      storyElement.className = 'saved-story-item';
      storyElement.dataset.storyId = story.id;

      storyElement.innerHTML = `
        <img src="${story.photoUrl || ''}" alt="${story.description || ''}" class="saved-story-image">
        <div class="saved-story-content">
          <h2>${story.name || 'No name'}</h2>
          <p class="description">${story.description || ''}</p>
          <div class="story-meta">
            <span class="story-date">📅 ${new Date(story.createdAt).toLocaleDateString()}</span>
            ${story.lat && story.lon ? `<span class="story-location">📍 ${story.lat.toFixed(2)}, ${story.lon.toFixed(2)}</span>` : ''}
          </div>
          <div class="saved-story-actions">
            <button class="remove-story" data-id="${story.id}" aria-label="Remove from saved">
              <i class="fas fa-trash-alt"></i> Hapus dari Favorit
            </button>
          </div>
        </div>
      `;

      const removeBtn = storyElement.querySelector('.remove-story');
      removeBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        
        if (!confirm('Hapus story ini dari favorit?')) return;
        
        removeBtn.disabled = true;
        removeBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Menghapus...`;

        try {
          await IdbHelper.deleteStory(story.id);
          storyElement.remove();
          this.#showNotification('Removed', 'Story dihapus dari favorit', 'success');
          
          if (document.querySelectorAll('.saved-story-item').length === 0) {
            this.#renderStories();
          }
        } catch (err) {
          console.error('Delete error:', err);
          this.#showNotification('Error', 'Gagal menghapus story', 'error');
          removeBtn.disabled = false;
          removeBtn.innerHTML = `<i class="fas fa-trash-alt"></i> Hapus dari Favorit`;
        }
      });

      storyElement.addEventListener('click', (e) => {
        if (e.target.closest('.remove-story')) return;
        
        if (story.lat && story.lon) {
          this.#map.flyTo([story.lat, story.lon], 13, {
            duration: 3,
            easeLinearity: 0.25
          });
          this.#highlightMarker(story.id);
          
          document.querySelectorAll('.saved-story-item').forEach(item => item.classList.remove('active'));
          storyElement.classList.add('active');
        }
      });

      storyList.appendChild(storyElement);
    });
  }

  #highlightMarker(storyId) {
    if (this.#activeMarkerId) {
      this.#markers.eachLayer((layer) => {
        if (layer.options.storyId === this.#activeMarkerId) {
          layer.setIcon(this.#getDefaultIcon());
          layer.closePopup();
        }
      });
    }

    this.#markers.eachLayer((layer) => {
      if (layer.options.storyId === storyId) {
        layer.setIcon(this.#getHighlightedIcon());
        setTimeout(() => {
          layer.openPopup();
        }, 500);
      }
    });

    this.#activeMarkerId = storyId;
  }

  #getDefaultIcon() {
    return L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
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

  #setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    let timeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        const query = e.target.value.trim();
        if (query) {
          this.#stories = await IdbHelper.searchStories(query);
        } else {
          await this.#loadSavedStories();
        }
        this.#renderStories();
      }, 300);
    });
  }

  #showNotification(title, message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `<h4>${title}</h4><p>${message}</p>`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

export default SavedStoriesPage;