import Footer from '../components/footer';

class RegisterPage {
  async render() {
    return `
      <div class="container">
        <div class="login-form">
          <h2>Register</h2>
          <form id="registerForm">
            <div class="form-group">
              <label for="name">Name</label>
              <input type="text" id="name" name="name" required>
            </div>
            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" name="email" required>
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input type="password" id="password" name="password" required minlength="8">
            </div>
            <button type="submit">Register</button>
            <p>Sudah punya akun? <a href="#/login">Login</a></p>
          </form>
        </div>
      </div>
      ${await Footer.render()}
    `;
  }

  async afterRender() {
    const form = document.getElementById('registerForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
      };

      try {
        const response = await fetch('https://story-api.dicoding.dev/v1/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        const responseJson = await response.json();
        
        if (!responseJson.error) {
          alert('Registration successful! Please login.');
          window.location.hash = '#/login';
        } else {
          alert(responseJson.message);
        }
      } catch (error) {
        alert('Error during registration');
      }
    });
  }
}

export default RegisterPage;