var nowweather_options = {
 _Prefs: Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService).getBranch('extensions.nowweather.'),
 geoTimeout: null,
 geoRequester: null,
 init: function()
 {
  document.getElementById('locationAuto').innerHTML = String.fromCodePoint(0x1F4CD);
  let prefIntervalVal = 1;
  if (nowweather_options._Prefs.prefHasUserValue('interval'))
   prefIntervalVal = nowweather_options._Prefs.getIntPref('interval');

  let prefUnittype = 'unittypeStandard';
  if (nowweather_options._Prefs.prefHasUserValue('unittype') && nowweather_options._Prefs.getCharPref('unittype') === 'm')
   prefUnittype = 'unittypeMetric';

  let prefLat = 199.0;
  let prefLon = 199.0;
  if (nowweather_options._Prefs.prefHasUserValue('latitude'))
  {
   prefLat = parseFloat(nowweather_options._Prefs.getCharPref('latitude'));
   if (prefLat > 90.0 || prefLat < -90.0)
    prefLat = 199.0;
  }
  if (nowweather_options._Prefs.prefHasUserValue('longitude'))
  {
   prefLon = parseFloat(nowweather_options._Prefs.getCharPref('longitude'));
   if (prefLon > 180.0 || prefLon < -180.0)
    prefLon = 199.0;
  }

  let prefGeo = false;
  if (nowweather_options._Prefs.prefHasUserValue('geolocate'))
   prefGeo = nowweather_options._Prefs.getBoolPref('geolocate');
  let prefLocation = 'locationCoord';
  if (prefGeo)
   prefLocation = 'locationGeo';

  document.getElementById('locationGroup').selectedItem = document.getElementById(prefLocation);
  document.getElementById('refreshHours').setAttribute('value', prefIntervalVal);
  document.getElementById('unittypeGroup').selectedItem = document.getElementById(prefUnittype);
  setTimeout('window.sizeToContent()', 100);
  if (prefLocation === 'locationGeo')
   nowweather_options.toggleLocation('geo');
  else
  {
   nowweather_options.toggleLocation('coord');
   if (prefLat != 199.0 && prefLon != 199.0)
    nowweather_options.showLocation(prefLat, prefLon);
  }
 },
 toggleLocation: function(enable)
 {
  if (enable === 'geo')
  {
   document.getElementById('locationInput').disabled = true;
   document.getElementById('locationAuto').disabled = true;
  }
  else
  {
   document.getElementById('locationInput').disabled = false;
   document.getElementById('locationAuto').disabled = false;
  }
 },
 getGeoData: function()
 {
  nowweather_options.toggleLocationOptions(false);
  nowweather_options.geoRequester = Components.classes['@mozilla.org/geolocation/provider;1'].getService(Components.interfaces.nsIGeolocationProvider);
  nowweather_options.geoRequester.setHighAccuracy(true);
  let geoResp = new nowweather_options.geoResponse();
  nowweather_options.geoRequester.watch(geoResp);
  nowweather_options.geoRequester.startup();
  return true;
 },
 setNoGeoData: function()
 {
  clearTimeout(nowweather_options.geoTimeout);
  document.getElementById('locationInput').setAttribute('value', '');
  nowweather_options.toggleLocationOptions(true);
 },
 showLocation: async function(latitude, longitude)
 {
  let extrapolatedLocation = false;
  extrapolatedLocation = await nowweather_api.getAddrFromCoords(latitude, longitude);
  if (extrapolatedLocation === false)
   extrapolatedLocation = '';
  document.getElementById('locationInput').value = extrapolatedLocation;
  document.getElementById('locationInput').setAttribute('value', extrapolatedLocation);
 },
 toggleLocationOptions: function(enable)
 {
  if (enable)
  {
   document.getElementById('locationCoord').disabled = false;
   document.getElementById('locationGeo').disabled = false;
   if (document.getElementById('locationGroup').selectedItem == document.getElementById('locationGeo'))
   {
    document.getElementById('locationInput').disabled = true;
    document.getElementById('locationAuto').disabled = true;
   }
   else
   {
    document.getElementById('locationInput').disabled = false;
    document.getElementById('locationAuto').disabled = false;
   }
  }
  else
  {
   document.getElementById('locationCoord').disabled = true;
   document.getElementById('locationGeo').disabled = true;
   document.getElementById('locationInput').disabled = true;
   document.getElementById('locationAuto').disabled = true;
  }
 },
 save: function()
 {
  if (document.getElementById('locationGroup').selectedItem == document.getElementById('locationCoord'))
  {
   nowweather_options.toggleLocationOptions(false);
   setTimeout(nowweather_options.asyncSave, 50);
   return false;
  }
  nowweather_options._Prefs.setCharPref('latitude', '199');
  nowweather_options._Prefs.setCharPref('longitude', '199');
  nowweather_options._Prefs.setBoolPref('geolocate', true);
  nowweather_options._Prefs.setCharPref('unittype', document.getElementById('unittypeGroup').selectedItem.value);
  nowweather_options._Prefs.setIntPref('interval', document.getElementById('refreshHours').value);
  return true;
 },
 asyncSave: async function()
 {
  let extrapolatedCoords = null;
  extrapolatedCoords = await nowweather_api.getCoordsFromAddr(document.getElementById('locationInput').value);
  nowweather_options.toggleLocationOptions(true);
  if (extrapolatedCoords !== false)
  {
   nowweather_options._Prefs.setBoolPref('geolocate', false);
   nowweather_options._Prefs.setCharPref('latitude', extrapolatedCoords.latitude);
   nowweather_options._Prefs.setCharPref('longitude', extrapolatedCoords.longitude);
   nowweather_options._Prefs.setCharPref('unittype', document.getElementById('unittypeGroup').selectedItem.value);
   nowweather_options._Prefs.setIntPref('interval', document.getElementById('refreshHours').value);
   window.close();
   return;
  }
  let locale = Components.classes['@mozilla.org/intl/stringbundle;1'].getService(Components.interfaces.nsIStringBundleService).createBundle('chrome://nowweather/locale/options.properties');
  alert(locale.GetStringFromName('alert.location.unknown'));
 },
 closeWindow: function()
 {
  if (nowweather_options.geoRequester !== null)
  {
   nowweather_options.geoRequester.shutdown();
   nowweather_options.geoRequester = null;
  }
 },
 geoResponse: function(){}
};
nowweather_options.geoResponse.prototype = {
 update: function(pos)
 {
  if (nowweather_options.geoRequester !== null)
  {
   nowweather_options.geoRequester.shutdown();
   nowweather_options.geoRequester = null;
  }
  setTimeout(nowweather_options.showLocation, 50, pos.coords.latitude, pos.coords.longitude);
  nowweather_options.toggleLocationOptions(true);
 },
 notifyError: function(err)
 {
  console.log(err);
  if (nowweather_options.geoRequester !== null)
  {
   nowweather_options.geoRequester.shutdown();
   nowweather_options.geoRequester = null;
  }
  nowweather_options.setNoGeoData();
 },
 QueryInterface: function(iid)
 {
  if (iid.equals(Components.interfaces.nsIGeolocationUpdate) || iid.equals(Components.interfaces.nsISupports))
   return this;
  throw Components.results.NS_ERROR_NO_INTERFACE;
 },
 createInstance: function(outer, iid)
 {
  if (outer)
   return Components.results.NS_ERROR_NO_AGGREGATION;
  return this.QueryInterface(iid);
 }
};
