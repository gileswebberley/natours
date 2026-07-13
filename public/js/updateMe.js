import axios from '/js/axios.js';
import { showAlert } from './alerts.js';

//photo is now taken care of by the multer middleware in userController so we don't need to handle it here, we just send the name and if a photo has been uploaded it will be added to the req.body as the photo property - not quite, we actually need to send the form data as a FormData object so that the file can be sent as well, but we don't need to handle it here, we just send the name and if a photo has been uploaded it will be added to the req.body as the photo property
async function updateMe(form) {
  //   const bodyObj = { name };
  try {
    const res = await axios.patch(`/api/v1/users/updateMe`, form);
    showAlert(
      'success',
      'You have successfully updated your user settings',
      1800,
    );
    //wait for a moment and then reload to update the header and user photo if it was changed
    window.setTimeout(() => {
      window.location.reload();
    }, 2000);
  } catch (error) {
    const message =
      error.response?.data?.message || 'Something unexpected went wrong';
    showAlert('error', message);
  }
}

document
  .querySelector('#form-user-data')
  .addEventListener('submit', async (e) => {
    e.preventDefault();
    // upload of image can take a while so give some UI response to the button
    const btn = document.querySelector('#btn-settings');
    btn.textContent = 'Updating...';
    btn.disabled = true;
    //because we are dealing with the photo upload we need to create a multipart/form-data request, so we will use FormData to create the request body instead of a simple object. This will allow us to send the file as well as the name in the same request
    const form = new FormData();
    form.append('name', document.getElementById('name').value);
    const photoInput = document.getElementById('photo');
    if (photoInput && photoInput.files.length > 0) {
      form.append('photo', photoInput.files[0]);
    }

    await updateMe(form);
    btn.textContent = 'Save settings';
    btn.disabled = false;
  });
