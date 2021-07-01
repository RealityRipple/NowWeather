var nowweather_page = {
 _Prefs: Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService).getBranch('extensions.nowweather.'),
 init: function()
 {
  let url = window.arguments[0];
  document.getElementById('fraLogin').setAttribute('src', url);
 },
 resizeWindow: function(ev)
 {
  nowweather_page._Prefs.setIntPref('websiteWidth', window.outerWidth);
  nowweather_page._Prefs.setIntPref('websiteHeight', window.outerHeight);
 },
 closeWindow: function(ev)
 {
  window.close();
 }
};
window.addEventListener('deactivate', nowweather_page.closeWindow, false);
window.addEventListener('resize', nowweather_page.resizeWindow, false);