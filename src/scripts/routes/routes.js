import HomePage from '../pages/home.js';
import AboutPage from '../pages/about.js';
import LoginPage from '../pages/login.js';
import RegisterPage from '../pages/register.js';
import AddStoryPage from '../pages/add-story.js';
import SavedStoriesPage from '../pages/saved-stories.js';

const routes = {
  '/': new HomePage(),
  '/about': new AboutPage(),
  '/login': new LoginPage(),
  '/register': new RegisterPage(),
  '/add': new AddStoryPage(),
  '/saved': new SavedStoriesPage(),  // TAMBAHKAN ROUTE UNTUK SAVED STORIES
};

export default routes;
