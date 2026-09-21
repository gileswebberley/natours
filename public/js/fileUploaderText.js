const textArea = document.getElementById('photoLabel');
document.getElementById('photo').addEventListener('change', function (e) {
  if (this.files && this.files.length > 0) {
    textArea.textContent = this.files[0].name;
  } else {
    textArea.textContent = 'Choose new photo';
  }
});
