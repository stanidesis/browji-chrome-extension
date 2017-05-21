$('#splash-screen').fadeOut(function () {
  $('[id^=splash-]').remove()
  if (window.splashScreenCallback) {
    window.splashScreenCallback()
  }
})
