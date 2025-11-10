class StoryAPI {
  #baseUrl = 'https://story-api.dicoding.dev/v1';

  async getAllStories() {
    const token = localStorage.getItem('token');
    
    if (!token) {
      window.location.hash = '#/login';
      return [];
    }

    const response = await fetch(`${this.#baseUrl}/stories`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    const responseJson = await response.json();
    return responseJson.listStory || [];
  }
}

export default StoryAPI;