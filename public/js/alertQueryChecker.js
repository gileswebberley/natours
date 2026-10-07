import { showAlert } from './alerts.js';
//This is to tie up the alert showing when a booking has been made successfully - Stripe success_url contains the query string ?alert=booking and runs through the middleware checkAlert to add it to the res.locals.alert property which is then injected into the body tag as a data attribute
const alertMsg = document.querySelector('body').dataset.alert;
if (alertMsg) showAlert('success', alertMsg, 7000); //show the alert for 7 seconds
