/// <reference path="../pb_data/types.d.ts" />

onMailerRecordPasswordResetSend((e) => {
  // Route the default users email to the SPA and keep the reset token out of request URLs.
  e.message.html = e.message.html.replaceAll("/_/#/auth/confirm-password-reset/", "/reset-password#token=")
  e.message.text = e.message.text.replaceAll("/_/#/auth/confirm-password-reset/", "/reset-password#token=")
  e.next()
}, "users")
