import Footer from '../components/footer';

class LoginPage {
  async render() {
    return `
      <div class="container">
        <div class="login-form">
          <h2>Login</h2>
          <form id="loginForm">
            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" name="email" required>
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input type="password" id="password" name="password" required>
            </div>
            <button type="submit">Login</button>
            <p>Belum punya akun? <a href="#/register">Register</a></p>
          </form>
        </div>
      </div>
      ${await Footer.render()}
    `;
  }

  async afterRender() {
    const form = document.getElementById('loginForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
      };

      try {
        const response = await fetch('https://story-api.dicoding.dev/v1/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        const responseJson = await response.json();
        
        if (!responseJson.error) {
          localStorage.setItem('token', responseJson.loginResult.token);
          window.location.hash = '#/';
        } else {
          alert(responseJson.message);
        }
      } catch (error) {
        alert('Error during login');
      }
    });
  }
}

export default LoginPage;