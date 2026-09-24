const dateSelected = document.getElementById('date');
const attendeesInput = document.getElementById('attendees');
//listen for a date being selected and set the maximum of the attendees input as the spaces left for that date
if (dateSelected && attendeesInput) {
  dateSelected.addEventListener('change', (e) => {
    const selected = e.target.options[e.target.selectedIndex];
    const spaces = selected.dataset.spacesLeft;
    attendeesInput.max = spaces;
    //if too many tickets are set for this then change it to the spaces left
    if (parseInt(attendeesInput.value) > parseInt(spaces)) {
      attendeesInput.value = spaces;
    }
  });
}
