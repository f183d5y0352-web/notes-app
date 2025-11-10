const router = async () => {
  if (document.startViewTransition) {
    await document.startViewTransition(async () => {
      // Your existing router code
    }).finished;
  } else {
    // Your existing router code
  }
};