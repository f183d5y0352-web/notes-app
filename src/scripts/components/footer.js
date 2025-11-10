class Footer {
  static async render() {
    return `
      <footer class="main-footer">
        <div class="footer-content">
          <p class="copyright">
            <i class="fas fa-code"></i> with <i class="fas fa-heart"></i> by Story App © ${new Date().getFullYear()}
          </p>
          <div class="social-links">
            <a href="#" aria-label="GitHub">
              <i class="fab fa-github"></i>
            </a>
            <a href="#" aria-label="LinkedIn">
              <i class="fab fa-linkedin"></i>
            </a>
          </div>
        </div>
      </footer>
    `;
  }
}

export default Footer;