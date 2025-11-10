class HomePresenter {
  #view = null;
  #model = null;

  constructor({ view, model }) {
    this.#view = view;
    this.#model = model;
  }

  async init() {
    const data = await this.#model.getData();
    this.#view.render(data);
  }
}

export default HomePresenter;