import Footer from '../components/footer';
import IdbHelper from '../utils/idb-helper.js';
import SyncService from '../utils/sync-service.js';

class AddStoryPage {
  #map = null;
  #marker = null;
  #selectedLocation = null;
  #mediaStream = null;

  async render() {
    return `
      <div class="container">
        <div class="add-story-form">
          <h1>Add New Story</h1>
          <form id="addStoryForm" novalidate>
            <div class="form-group">
              <label for="description" class="required-label">Description</label>
              <textarea 
                id="description" 
                name="description"
                required 
                minlength="10"
                placeholder="Tell your story (min. 10 characters)"
                aria-describedby="description-error"
              ></textarea>
              <span class="error-message" id="description-error" role="alert"></span>
            </div>

            <fieldset class="form-group">
              <legend class="required-label">Photo</legend>
              <!-- EXPLICIT label associated with file input -->
              <label for="photo" class="sr-only">Upload photo</label>
              <div class="photo-input-container">
                <input 
                  type="file" 
                  id="photo" 
                  name="photo"
                  accept="image/*"
                  required
                  aria-describedby="photo-error"
                >
                <button 
                  type="button" 
                  id="openCamera" 
                  class="camera-button"
                  aria-label="Take photo using camera"
                >
                  <span class="icon" aria-hidden="true">📸</span> Take Photo
                </button>
              </div>
              
              <div id="cameraContainer" class="camera-container" hidden>
                <video 
                  id="cameraPreview" 
                  autoplay 
                  playsinline
                  aria-label="Camera preview"
                ></video>
                <div class="camera-controls">
                  <button 
                    type="button" 
                    id="capturePhoto" 
                    class="capture-button"
                    aria-label="Capture photo"
                  >
                    Capture Photo
                  </button>
                  <button 
                    type="button" 
                    id="closeCamera" 
                    class="close-button"
                    aria-label="Close camera"
                  >
                    Close Camera
                  </button>
                </div>
              </div>

              <div 
                id="photoPreview" 
                class="photo-preview" 
                role="img" 
                aria-label="Preview of selected photo"
              ></div>
              <span class="error-message" id="photo-error" role="alert"></span>
            </fieldset>

            <fieldset class="form-group">
              <legend class="required-label">Location</legend>
              <label for="map" class="sr-only">Select location on map</label>
              <p class="map-instruction">Click on map to set location</p>
              <div 
                id="map" 
                class="location-map" 
                style="height: 300px;"
                tabindex="0"
                aria-label="Interactive map for selecting location"
              ></div>
              <div 
                id="selectedLocation" 
                class="selected-location"
                aria-live="polite"
              ></div>
              <span class="error-message" id="location-error" role="alert"></span>
            </fieldset>

            <div 
              id="form-status" 
              class="form-status" 
              role="status" 
              aria-live="polite"
            ></div>
            
            <button 
              type="submit" 
              id="submitButton"
              class="submit-button"
            >
              Share Story
            </button>
          </form>
        </div>
      </div>
      ${await Footer.render()}
    `;
  }

  async afterRender() {
    this.#initializeMap();
    this.#initializeForm();
    this.#initializeCamera();
  }

  #initializeCamera() {
    const openCameraBtn = document.getElementById('openCamera');
    const closeCameraBtn = document.getElementById('closeCamera');
    const captureBtn = document.getElementById('capturePhoto');
    const video = document.getElementById('cameraPreview');
    const cameraContainer = document.getElementById('cameraContainer');

    openCameraBtn.addEventListener('click', async () => {
      try {
        this.#mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' }
        });
        video.srcObject = this.#mediaStream;
        cameraContainer.hidden = false;
        openCameraBtn.hidden = true;
      } catch (error) {
        this.#showStatus('error', 'Cannot access camera. Please use file upload instead.');
      }
    });

    closeCameraBtn.addEventListener('click', () => {
      this.#stopCamera();
      cameraContainer.hidden = true;
      openCameraBtn.hidden = false;
    });

    captureBtn.addEventListener('click', () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        const file = new File([blob], "camera-photo.jpg", { type: "image/jpeg" });
        this.#updatePhotoInput(file);
        this.#showPhotoPreview(file);
      }, 'image/jpeg', 0.8);

      this.#stopCamera();
      cameraContainer.hidden = true;
      openCameraBtn.hidden = false;
    });
  }

  #stopCamera() {
    if (this.#mediaStream) {
      this.#mediaStream.getTracks().forEach(track => track.stop());
      this.#mediaStream = null;
    }
  }

  #updatePhotoInput(file) {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    document.getElementById('photo').files = dataTransfer.files;
  }

  #initializeMap() {
    this.#map = L.map('map').setView([-2.548926, 118.014863], 5);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.#map);

    this.#map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      
      if (this.#marker) {
        this.#map.removeLayer(this.#marker);
      }

      this.#marker = L.marker([lat, lng]).addTo(this.#map);
      this.#selectedLocation = { lat, lng };
      
      document.getElementById('selectedLocation').textContent = 
        `Selected: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    });
  }

  #initializeForm() {
    const form = document.getElementById('addStoryForm');
    const photoInput = document.getElementById('photo');
    const submitButton = document.getElementById('submitButton');
    const description = document.getElementById('description');

    description.addEventListener('input', () => {
      this.#validateDescription(description.value);
    });

    photoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.#validatePhoto(file);
        this.#showPhotoPreview(file);
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      submitButton.disabled = true;
      submitButton.textContent = 'Sharing Story...';
      this.#showStatus('info', 'Uploading your story...');

      if (!this.#validateForm()) {
        submitButton.disabled = false;
        submitButton.textContent = 'Share Story';
        return;
      }

      try {
        const formData = new FormData();
        formData.append('description', description.value);
        formData.append('photo', photoInput.files[0]);
        
        if (this.#selectedLocation) {
          formData.append('lat', this.#selectedLocation.lat);
          formData.append('lon', this.#selectedLocation.lng);
        }

        if (navigator.onLine) {
          const response = await fetch('https://story-api.dicoding.dev/v1/stories', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: formData,
          });

          const result = await response.json();

          if (!result.error) {
            // TAMBAHKAN: Tanyakan user apakah ingin simpan ke offline storage
            const shouldSaveOffline = confirm('Story shared successfully! Save to offline storage?');
            
            if (shouldSaveOffline) {
              const storyData = {
                id: result.data?.addedStory?.id || `story-${Date.now()}`,
                name: description.value.substring(0, 30),
                description: description.value,
                photoUrl: result.data?.addedStory?.photoUrl,
                lat: this.#selectedLocation?.lat,
                lon: this.#selectedLocation?.lng,
                createdAt: new Date().toISOString()
              };
              
              await IdbHelper.saveStory(storyData);
              this.#showStatus('success', 'Story saved to offline storage too!');
            } else {
              this.#showStatus('success', 'Story shared successfully!');
            }
            
            setTimeout(() => {
              window.location.hash = '#/';
            }, 1500);
          } else {
            this.#showStatus('error', `Failed: ${result.message}`);
            submitButton.disabled = false;
            submitButton.textContent = 'Share Story';
          }
        } else {
          // OFFLINE: Simpan ke pending stories (user-controlled nantinya)
          const story = {
            description: description.value,
            photo: photoInput.files[0],
            lat: this.#selectedLocation?.lat,
            lon: this.#selectedLocation?.lng,
            timestamp: Date.now()
          };
          await IdbHelper.savePendingStory(story);
          this.#showStatus('success', 'Story saved offline. Will sync when online.');
          setTimeout(() => {
            window.location.hash = '#/';
          }, 1500);
        }
      } catch (error) {
        console.error('Error:', error);
        this.#showStatus('error', 'Network error. Please try again.');
        submitButton.disabled = false;
        submitButton.textContent = 'Share Story';
      }
    });
  }

  #validateDescription(value) {
    const error = document.getElementById('description-error');
    if (!value) {
      error.textContent = 'Description is required';
      return false;
    }
    if (value.length < 10) {
      error.textContent = 'Description must be at least 10 characters';
      return false;
    }
    error.textContent = '';
    return true;
  }

  #validatePhoto(file) {
    const error = document.getElementById('photo-error');
    if (!file) {
      error.textContent = 'Photo is required';
      return false;
    }
    if (!file.type.startsWith('image/')) {
      error.textContent = 'Please select a valid image file';
      return false;
    }
    if (file.size > 1024 * 1024) {
      error.textContent = 'Photo size must be less than 1MB';
      return false;
    }
    error.textContent = '';
    return true;
  }

  #validateLocation() {
    const error = document.getElementById('location-error');
    if (!this.#selectedLocation) {
      error.textContent = 'Please select a location on the map';
      return false;
    }
    error.textContent = '';
    return true;
  }

  #validateForm() {
    const description = document.getElementById('description');
    const photo = document.getElementById('photo');

    const isDescriptionValid = this.#validateDescription(description.value);
    const isPhotoValid = this.#validatePhoto(photo.files[0]);
    const isLocationValid = this.#validateLocation();

    return isDescriptionValid && isPhotoValid && isLocationValid;
  }

  #showStatus(type, message) {
    const statusDiv = document.getElementById('form-status');
    statusDiv.className = `form-status ${type}`;
    statusDiv.textContent = message;
  }

  #showPhotoPreview(file) {
    const preview = document.getElementById('photoPreview');
    preview.innerHTML = '';
    
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.alt = 'Preview of selected photo';
    preview.appendChild(img);
  }
}

export default AddStoryPage;
