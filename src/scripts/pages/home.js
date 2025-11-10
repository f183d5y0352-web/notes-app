import StoryAPI from '../data/story-api';
import NotificationAPI from '../data/notification-api';
import Footer from '../components/footer';
import StoryIdb from '../data/story-idb.js';
import IdbHelper from '../utils/idb-helper.js';

class HomePage {
  #map = null;
  #markers = new L.LayerGroup();
  #stories = [];
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
            <select id="location-filter" aria-label="Filter stories by location">
              <option value="">All Locations</option>
            </select>
          </div>
          <div class="header-actions">
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

    // Set new highlight and open popup
    this.#markers.eachLayer((layer) => {
      if (layer.options.storyId === storyId) {
        layer.setIcon(this.#getHighlightedIcon());
        layer.openPopup(); // This will show the popup automatically
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
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const { listStory } = await response.json();
      
      // Save stories to IndexedDB
      await Promise.all(listStory.map(story => StoryIdb.saveStory(story)));
      this.#stories = listStory;
    } catch (error) {
      console.log('Loading from IndexedDB due to:', error);
      // Load from IndexedDB if network fails
      this.#stories = await StoryIdb.getAllStories();
    }
    this.#renderStories();
  }

  #renderStories() {
    const storyList = document.getElementById('story-list');
    storyList.innerHTML = '';

    // Clear existing markers
    this.#markers.clearLayers();

    this.#stories.forEach(story => {
      const storyElement = document.createElement('article');
      storyElement.className = 'story-item';
      // Add data attribute for story ID
      storyElement.dataset.storyId = story.id;
      
      storyElement.innerHTML = `
        <img src="${story.photoUrl}" alt="${story.description}">
        <div class="story-item-content">
          <h2>${story.name}</h2>
          <p>${story.description}</p>
          <div class="story-meta">
            <span class="story-date">${new Date(story.createdAt).toLocaleDateString()}</span>
            ${story.lat && story.lon ? `
              <span class="story-location">
                <i class="fas fa-map-marker-alt"></i>
                ${story.lat.toFixed(2)}, ${story.lon.toFixed(2)}
              </span>
            ` : ''}
          </div>
          <button class="delete-story" data-id="${story.id}">
            <i class="fas fa-trash"></i> Delete
          </button>
        </div>
      `;

      // Add markers for stories with locations
      if (story.lat && story.lon) {
        const marker = L.marker([story.lat, story.lon], {
          icon: this.#getDefaultIcon(),
          storyId: story.id
        });

        // Add popup content with simpler design
        marker.bindPopup(`
          <div class="map-popup">
            <h3>${story.name}</h3>
            <img src="${story.photoUrl}" alt="${story.description}">
            <div class="popup-date">
              <i class="far fa-calendar"></i> ${new Date(story.createdAt).toLocaleDateString()}
            </div>
          </div>
        `).openPopup();

        marker.addTo(this.#markers);
      }

      // Add click handler for the whole story item
      storyElement.addEventListener('click', (e) => {
        // Ignore if delete button was clicked
        if (e.target.closest('.delete-story')) return;
        
        if (story.lat && story.lon) {
          // First center map on story location
          this.#map.setView([story.lat, story.lon], 13);
          
          // Then highlight marker and show popup
          this.#highlightMarker(story.id);
          
          // Add active class to story item
          document.querySelectorAll('.story-item').forEach(item => {
            item.classList.remove('active');
          });
          storyElement.classList.add('active');
        }
      });

      // Enhanced delete handler
      const deleteButton = storyElement.querySelector('.delete-story');
      deleteButton.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        try {
          const storyId = deleteButton.dataset.id;
          
          // Show confirmation dialog
          const isConfirmed = confirm('Are you sure you want to delete this story?');
          if (!isConfirmed) return;

          // Disable button and show loading state
          deleteButton.disabled = true;
          deleteButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
          
          // Add deleting animation class
          storyElement.classList.add('deleting');

          // Delete from IndexedDB
          await StoryIdb.deleteStory(storyId);
          
          // Try to delete from API if online
          if (navigator.onLine) {
            try {
              const response = await fetch(`https://story-api.dicoding.dev/v1/stories/${storyId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
              });

              if (!response.ok) {
                throw new Error('Failed to delete from API');
              }
            } catch (error) {
              console.warn('Failed to delete from API:', error);
              // Continue since we've already deleted from IndexedDB
            }
          }

          // Remove from local array
          this.#stories = this.#stories.filter(s => s.id !== storyId);
          
          // Remove marker if exists
          this.#markers.eachLayer((layer) => {
            if (layer.options.storyId === storyId) {
              this.#markers.removeLayer(layer);
            }
          });

          // Show success notification
          this.#showNotification('Success', 'Story deleted successfully!', 'success');

          // Remove element after animation
          setTimeout(() => {
            storyElement.remove();
          }, 500);

        } catch (error) {
          console.error('Failed to delete story:', error);
          this.#showNotification('Error', 'Failed to delete story. Please try again.', 'error');
          
          // Reset button state
          deleteButton.disabled = false;
          deleteButton.innerHTML = '<i class="fas fa-trash"></i> Delete';
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
    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.placeholder = 'Search stories...';
    searchInput.className = 'story-search';
    
    const filterContainer = document.querySelector('.story-filters');
    filterContainer.prepend(searchInput);

    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        try {
          const query = e.target.value.trim();
          if (query) {
            this.#stories = await IdbHelper.searchStories(query);
          } else {
            // If search is empty, load all stories
            await this.#loadStories();
          }
          this.#renderStories();
        } catch (error) {
          console.error('Search error:', error);
          this.#showNotification('Error', 'Failed to search stories', 'error');
        }
      }, 300); // Debounce search for better performance
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
}

export default HomePage;