export const hideAlert = (animate = true) => {
  //grab any alert that may be in the dom
  const el = document.querySelector('.alert');
  //if there is one climb up to it's parent element and remove it
  if (el) {
    if (!animate) {
      el.parentElement.removeChild(el);
      return;
    }
    //trigger the animation to slide out of screen which is set to take .4s so 400 ms
    el.classList.remove('alert--active');
    window.setTimeout(() => {
      el.parentElement.removeChild(el);
    }, 500);
  }
};

//type = 'success'/'error'
//timeout defaults to 5 seconds
export const showAlert = (type, msg, timeout = 5000) => {
  //hide any previous alerts without the animation because we're creating a new one
  hideAlert(false);
  //create our styled alert with a tiny div
  const markup = `<div class="alert alert--${type}">${msg}</div>`;
  //add it to the beginning of the body element
  document.querySelector('body').insertAdjacentHTML('afterbegin', markup);
  //now it's been added we'll grab it and run the animation
  const newAlert = document.querySelector('.alert');
  //just wait for a moment before accessing the alert's styling
  window.setTimeout(() => {
    if (newAlert) newAlert.classList.add('alert--active');
  }, 10);
  //then make it automatically close after 5 secs
  window.setTimeout(() => {
    hideAlert();
  }, timeout);
};
