import Footer from '../components/footer';

class AboutPage {
  async render() {
    // Add view transition name
    document.querySelector('main').style.viewTransitionName = 'main';
    
    return `
      <div class="container">
        <div class="about-wrapper">
          <div class="about-content" data-transition="fade">
            <h1>Story App Journey</h1>
            
            <p class="about-description">
              Selamat! Anda telah menyelesaikan setengah perjalanan di kelas ini. 
              Sejauh ini, Anda telah belajar hal-hal berikut.
            </p>
            
            <div class="feature-list">
              <div class="feature-item">
                <i class="fas fa-universal-access"></i>
                <h2>Web Accessibility</h2>
                <p>Merancang aksesibilitas yang sesuai dengan standar Web Content Accessibility Guidelines (WCAG).</p>
              </div>
              
              <div class="feature-item">
                <i class="fas fa-route"></i>
                <h2>Page Transitions</h2>
                <p>Merancang transisi halaman yang halus dan sesuai dengan konteks pengguna.</p>
              </div>
              
              <div class="feature-item">
                <i class="fas fa-camera"></i>
                <h2>Hardware Access</h2>
                <p>Mengembangkan akses hardware terkait media, seperti kamera dan mikrofon.</p>
              </div>
              
              <div class="feature-item">
                <i class="fas fa-map-marked-alt"></i>
                <h2>Digital Mapping</h2>
                <p>Merancang aplikasi peta digital yang memanfaatkan perangkat global positioning system (GPS).</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      ${await Footer.render()}
    `;
  }

  async afterRender() {
    // Add transition class after render
    const content = document.querySelector('.about-content');
    requestAnimationFrame(() => {
      content.classList.add('fade-in');
    });
  }
}

export default AboutPage;