class NotificationAPI {
  // VAPID public key dari API documentation
  // Pastikan key ini valid dan sesuai dengan yang ada di server
  static #VAPID_PUBLIC_KEY = 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';
  static #BASE_URL = 'https://story-api.dicoding.dev/v1/notifications';

  static async subscribe() {
    try {
      // Check if service worker is supported
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker tidak didukung oleh browser ini');
      }

      // Get existing service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Check if notification API is supported
      if (!('PushManager' in window)) {
        throw new Error('Push Notification tidak didukung oleh browser ini');
      }

      // Check notification permission
      if (Notification.permission === 'denied') {
        throw new Error('Izin notifikasi telah ditolak');
      }

      // Request notification permission if not granted
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          throw new Error('Izin notifikasi ditolak pengguna');
        }
      }

      // Get push subscription
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Create new subscription with better error handling
        try {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: this.#urlBase64ToUint8Array(this.#VAPID_PUBLIC_KEY)
          });
        } catch (error) {
          console.error('❌ Error saat subscribe ke PushManager:', error);
          
          // Jika error karena VAPID key, coba tanpa applicationServerKey
          // (beberapa server support ini)
          if (error.message.includes('applicationServerKey')) {
            console.warn('⚠️ Mencoba subscribe tanpa applicationServerKey...');
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true
            });
          } else {
            throw error;
          }
        }
      }

      // Send subscription to server
      const response = await fetch(`${this.#BASE_URL}/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: this.#arrayBufferToBase64(subscription.getKey('p256dh')),
            auth: this.#arrayBufferToBase64(subscription.getKey('auth'))
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Server error: ${errorData.message || 'Gagal mendaftar push notification'}`);
      }

      const result = await response.json();
      console.log('✅ Berhasil subscribe push notification:', result);
      return result;
    } catch (error) {
      console.error('❌ Error subscribing to push notification:', error);
      throw error;
    }
  }

  static async unsubscribe() {
    try {
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker tidak didukung');
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        console.log('Tidak ada subscription yang aktif');
        return;
      }

      // Get endpoint from subscription
      const endpoint = subscription.endpoint;

      // Unsubscribe from push manager
      await subscription.unsubscribe();

      // Notify server about unsubscription
      const response = await fetch(`${this.#BASE_URL}/subscribe`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          endpoint: endpoint
        })
      });

      if (!response.ok) {
        throw new Error('Gagal membatalkan push notification di server');
      }

      console.log('Berhasil unsubscribe push notification');
      return await response.json();
    } catch (error) {
      console.error('Error unsubscribing from push notification:', error);
      throw error;
    }
  }

  static async isSubscribed() {
    try {
      if (!('serviceWorker' in navigator)) {
        console.warn('⚠️ Service Worker tidak didukung');
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return subscription !== null;
    } catch (error) {
      console.error('❌ Error checking subscription status:', error);
      return false;
    }
  }

  // Helper methods
  static #urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  static #arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

export default NotificationAPI;
