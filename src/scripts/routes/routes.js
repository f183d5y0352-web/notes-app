import HomePage from '../pages/home';
import AboutPage from '../pages/about';
import LoginPage from '../pages/login';
import RegisterPage from '../pages/register';
import AddStoryPage from '../pages/add-story';

const routes = {
  '/': new HomePage(),
  '/about': new AboutPage(),
  '/login': new LoginPage(),
  '/register': new RegisterPage(),
  '/add': new AddStoryPage(),
};

export default routes;
