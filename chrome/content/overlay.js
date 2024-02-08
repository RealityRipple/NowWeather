Components.utils.import('resource://nowweather/weather.jsm');
var nowweather =
{
 _locale: Components.classes['@mozilla.org/intl/stringbundle;1'].getService(Components.interfaces.nsIStringBundleService).createBundle('chrome://nowweather/locale/overlay.properties'),
 _Prefs: Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService).getBranch('extensions.nowweather.'),
 init: function()
 {
  nowweather_shared.register();
  if (document.getElementById('nowWeather-tb') === null)
   return;
  document.getElementById('nowWeather-tb').addEventListener('click', nowweather._onclick);
  document.getElementById('nowWeather-tb').addEventListener('dragover', nowweather._ondragover);
  document.getElementById('nowWeather-tb').addEventListener('drop', nowweather._ondrop);
  nowweather.displayWeather();
 },
 unload: function()
 {
  nowweather_shared.unregister();
 },
 _onclick: function(ev)
 {
  if (ev.button === 0)
   nowweather.openWebsite();
  if (ev.button === 1)
   setTimeout(nowweather_shared.initiateWeather, 250);
 },
 _ondragover: function(ev)
 {
  if (!ev.dataTransfer)
   return;
  if ((ev.dataTransfer.types.contains('text/x-moz-url') && ev.dataTransfer.getData('text/x-moz-url').length) ||
      (ev.dataTransfer.types.contains('text/x-moz-text-internal') && ev.dataTransfer.getData('text/x-moz-text-internal').length) ||
      (ev.dataTransfer.types.contains('text/plain') && ev.dataTransfer.getData('text/plain').length))
  {
   ev.preventDefault();
   ev.dataTransfer.dropEffect = 'link';
  }
 },
 _ondrop: function(ev)
 {
  if (!ev.dataTransfer)
   return;
  if (ev.dataTransfer.types.contains('text/x-moz-url'))
  {
   let lines = ev.dataTransfer.getData('text/x-moz-url').split('\n');
   nowweather._Prefs.setCharPref('websiteUrl', lines[0]);
  }
  else if (ev.dataTransfer.types.contains('text/plain'))
  {
   let txt = ev.dataTransfer.getData('text/plain');
   let lines = txt.split('\n').filter(function(line){return line.length > 0;});
   nowweather._Prefs.setCharPref('websiteUrl', lines[0]);
  }
  else if (ev.dataTransfer.types.contains('text/x-moz-text-internal'))
  {
   let lines = ev.dataTransfer.getData('text/x-moz-text-internal').split('\n');
   nowweather._Prefs.setCharPref('websiteUrl', lines[0]);
  }
 },
 displayWeather: function()
 {
  if (document.getElementById('nowWeather-tb') === null)
   return;
  if (nowweather_shared.current_weather == 'Error')
  {
   document.getElementById('nowWeather-icon').setAttribute('src', 'chrome://nowweather/skin/na.jpg');
   document.getElementById('nowWeather-temp').innerHTML = '. . . ';
   return true;
  }
  document.getElementById('nowWeather-temp').innerHTML = '. . .';
  document.getElementById('nowWeather-icon').setAttribute('src', 'chrome://nowweather/skin/na.jpg');
  let nowUT = new Date();
  let nowEH = Math.floor(nowUT.valueOf() / (1000 * 60 * 60));
  let bestT = -1;
  let report = "";
  for (t in nowweather_shared.current_weather)
  {
   if (Math.abs(t - nowEH) < Math.abs(bestT - nowEH))
    bestT = t;
  }
  if (bestT > -1)
  {
   report += nowweather_shared.current_weather[bestT].temp.toString() + " Now";
   if (nowweather_shared.current_weather[bestT].hasOwnProperty('icon'))
    document.getElementById('nowWeather-icon').setAttribute('src', nowweather_shared.current_weather[bestT].icon);
   else
    document.getElementById('nowWeather-icon').setAttribute('src', 'chrome://nowweather/skin/na.jpg');
  }

  let tempDate = new Date();
  tempDate.setHours(0,0,0,0);
  const days = [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" ];
  let currentDay = tempDate.getDay();
  let currentStart = tempDate.getTime() / (1000 * 60 * 60);
  for (let i=0; i<8; i++) {
   let currentEnd = currentStart + 24;
   let low = 200;
   let high = -200;
   for (t in nowweather_shared.current_weather)
   {
    let degrees = parseInt(nowweather_shared.current_weather[t].temp.toString().split('°')[0]);
    if (t >= currentStart && t <= currentEnd)
    {
     if (degrees < low)
      low = degrees;
     if (degrees > high)
      high = degrees;
    }
   }

   report += " / " + high + ' ' + days[currentDay] + ' Hi';
   report += " / " + low + ' ' + days[currentDay] + ' Lo';
   currentDay++;
   currentDay%=7;
   currentStart = currentEnd;
  }
  
  document.getElementById('nowWeather-temp').innerHTML = report;
  return true;
 },
 openWebsite: async function()
 {
  let lastWidth = 730;
  let lastHeight = 580;
  if (nowweather._Prefs.prefHasUserValue('websiteWidth'))
   lastWidth = nowweather._Prefs.getIntPref('websiteWidth');
  if (nowweather._Prefs.prefHasUserValue('websiteHeight'))
   lastHeight = nowweather._Prefs.getIntPref('websiteHeight');
  if (lastWidth < 400)
   lastWidth = 400;
  if (lastHeight < 200)
   lastHeight = 200;
  let tb = document.getElementById('nowWeather-tb');
  let x = 0;
  if (tb.boxObject.screenX > Math.floor(screen.width / 2))
   x = tb.boxObject.screenX - lastWidth;
  else
   x = tb.boxObject.screenX + tb.boxObject.width;
  let y = 0;
  if (tb.boxObject.screenY > Math.floor(screen.height / 2))
   y = tb.boxObject.screenY - lastHeight;
  else
   y = tb.boxObject.screenY + tb.boxObject.height;
  if (x > screen.width - lastWidth)
   x = screen.width - lastWidth;
  if (y > screen.height - lastHeight)
   y = screen.height - lastHeight;
  if (x < 0)
   x = 0;
  if (y < 0)
   y = 0;

  let defPrefs = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService).getDefaultBranch('extensions.nowweather.');
  let url = defPrefs.getCharPref('websiteUrl');
  if (nowweather._Prefs.prefHasUserValue('websiteUrl'))
   url = nowweather._Prefs.getCharPref('websiteUrl');

  if (url.includes('%LATITUDE%') || url.includes('%LONGITUDE%'))
  {
   if (nowweather_shared.prefGeo)
   {
    url = url.replace('%LATITUDE%', nowweather_shared.geoLatitude);
    url = url.replace('%LONGITUDE%', nowweather_shared.geoLongitude);
   }
   else if (nowweather_shared.prefLatitude != 199.0 && nowweather.prefLongitude != 199.0)
   {
    url = url.replace('%LATITUDE%', nowweather_shared.prefLatitude);
    url = url.replace('%LONGITUDE%', nowweather_shared.prefLongitude);
   }
   else
    return;
  }
  window.openDialog('chrome://nowweather/content/page.xul', 'nowWeatherPage', 'chrome,dialog,resizable=yes,scrollbars=yes,top=' + y + ',left=' + x + ',outerWidth=' + lastWidth + ',outerHeight=' + lastHeight + ',alwaysRaised', url);
 }
};

window.addEventListener('load', function() { nowweather.init(); } , false);
window.addEventListener('unload', function() { nowweather.unload(); } , false);
