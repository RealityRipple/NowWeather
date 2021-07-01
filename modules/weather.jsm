Components.utils.import('resource://gre/modules/Timer.jsm');
Components.utils.import("resource://gre/modules/Console.jsm");

var EXPORTED_SYMBOLS = ['nowweather_shared'];

var nowweather_shared = {
 _requestTimeout: null,
 _requestTimer: null,
 _prefTimer: null,
 prefLatitude: 199,
 prefLongitude: 199,
 prefGeo: false,
 prefInterval: 0,
 prefUnit: null,
 _requestGeo: null,
 geoLatitude: 199,
 geoLongitude: 199,
 current_weather: null,
 prefBranch_changed: null,
 registered: false,
 _locale: Components.classes['@mozilla.org/intl/stringbundle;1'].getService(Components.interfaces.nsIStringBundleService).createBundle('chrome://nowweather/locale/overlay.properties'),
 _Prefs: Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService).getBranch('extensions.nowweather.'),
 getBranchPrefInterface: function (thisBranch)
 {
  if (typeof Components.interfaces.nsIPrefBranch2 == 'undefined' && typeof Components.interfaces.nsIPrefBranchInternal == 'undefined')
   return thisBranch.QueryInterface(Components.interfaces.nsIPrefBranch); // 60.0+ support
  else if (typeof Components.interfaces.nsIPrefBranch2 == 'undefined')
   return thisBranch.QueryInterface(Components.interfaces.nsIPrefBranchInternal); //1.0.x support
  else
   return thisBranch.QueryInterface(Components.interfaces.nsIPrefBranch2); // 1.5+ support
 },
 register: function()
 {
  if (nowweather_shared.registered)
   return;
  nowweather_shared.registered = true;

  let prefService = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService);
  if(!nowweather_shared.prefBranch_changed)
  {
   nowweather_shared.prefBranch_changed = prefService.getBranch('extensions.nowweather.');
   let pbi = nowweather_shared.getBranchPrefInterface(nowweather_shared.prefBranch_changed);
   pbi.addObserver('', this, false);
  }
  setTimeout(nowweather_shared.initiateWeather, 1500);
 },
 unregister: function()
 {
  if (!nowweather_shared.registered)
   return;
  let mdtr = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
  let brw = mdtr.getEnumerator('navigator:browser');
  let bCt = 0;
  while (brw.hasMoreElements())
  {
   let wnd = brw.getNext();
   if ('nowweather' in wnd)
    bCt++;
  }
  if (bCt > 0)
   return;
  nowweather_shared.registered = false;
  if (nowweather_shared._requestGeo !== null)
  {
   nowweather_shared._requestGeo.shutdown();
   nowweather_shared._requestGeo = null;
  }
  if(!nowweather_shared.prefBranch_changed)
   return;
  let pbi = nowweather_shared.getBranchPrefInterface(nowweather_shared.prefBranch_changed);
  pbi.removeObserver('', this);
  nowweather_shared.prefBranch_changed = null;
 },
 observe: function(aSubject, aTopic, aData)
 {
  if (aTopic !== 'nsPref:changed')
   return;
  if (aData === 'websiteWidth')
   return;
  if (aData === 'websiteHeight')
   return;
  if (aData === 'websiteUrl')
   return;
  if (aData === 'geolocate')
  {
   let geoLocate = false;
   if (nowweather_shared._Prefs.prefHasUserValue('geolocate'))
    geoLocate = nowweather_shared._Prefs.getBoolPref('geolocate');
   if (geoLocate)
    nowweather_shared.startGeoRequester();
   else
    nowweather_shared.stopGeoRequester();
   return;
  }
  if (aData === 'interval')
  {
   if (nowweather_shared._requestTimer != null)
   {
    clearTimeout(nowweather_shared._requestTimer);
    nowweather_shared._requestTimer = null;
   }
   let timerInterval = 1;
   if (nowweather_shared._Prefs.prefHasUserValue('interval'))
    timerInterval = nowweather_shared._Prefs.getIntPref('interval');
   nowweather_shared._requestTimer = setTimeout(nowweather_shared.initiateWeather, timerInterval * 60 * 60 * 1000);
   return;
  }
  if (nowweather_shared._prefTimer != null)
  {
   clearTimeout(nowweather_shared._prefTimer);
   nowweather_shared._prefTimer = null;
  }
  nowweather_shared._prefTimer = setTimeout(nowweather_shared.initiateWeather, 1000);
 },
 startGeoRequester: function()
 {
  nowweather_shared.stopGeoRequester();
  nowweather_shared._requestGeo = Components.classes['@mozilla.org/geolocation/provider;1'].getService(Components.interfaces.nsIGeolocationProvider);
  nowweather_shared._requestGeo.setHighAccuracy(true);
  let geoResp = new nowweather_shared.geoResponse();
  nowweather_shared._requestGeo.watch(geoResp);
  nowweather_shared._requestGeo.startup();
 },
 stopGeoRequester: function()
 {
  nowweather_shared.geoLatitude = 199.0;
  nowweather_shared.geoLongitude = 199.0;
  if (nowweather_shared._requestGeo === null)
   return;
  nowweather_shared._requestGeo.shutdown();
  nowweather_shared._requestGeo = null;
 },
 getWeather: function()
 {
  nowweather_shared.refreshPrefs();
  let myLat = 199.0;
  let myLon = 199.0;
  if (nowweather_shared.prefGeo)
  {
   if (nowweather_shared._requestGeo === null)
   {
    nowweather_shared.startGeoRequester();
    setTimeout(nowweather_shared.initiateWeather, 1500);
    return;
   }
   if (nowweather_shared.geoLatitude == 199.0 && nowweather_shared.geoLongitude == 199.0)
   {
    setTimeout(nowweather_shared.initiateWeather, 1500);
    return;
   }
   myLat = nowweather_shared.geoLatitude;
   myLon = nowweather_shared.geoLongitude;
  }
  else if (nowweather_shared.prefLatitude != 199.0 && nowweather_shared.prefLongitude != 199.0)
  {
   myLat = nowweather_shared.prefLatitude;
   myLon = nowweather_shared.prefLongitude;
  }
  if (myLat > 90 || myLat < -90 || myLon > 180 || myLon < -180)
  {
   nowweather_shared.current_weather = 'Error';
   nowweather_shared.updateWindowDisplays();
   return;
  }
  nowweather_shared.stopGeoRequester();
  let coordURL = 'https://graphical.weather.gov/xml/sample_products/browser_interface/ndfdXMLclient.php' +
                 '?lat=' + myLat +
                 '&lon=' + myLon +
                 '&product=time-series' +
                 '&Unit=' + nowweather_shared.prefUnit +
                 '&temp=temp' +
                 '&icons=icons';
  nowweather_shared.sendRequest(coordURL);
 },
 geoResponse: function() {},
 sendRequest: function(weatherURL)
 {
  let weatherRequest = Components.classes['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance(Components.interfaces.nsIXMLHttpRequest);
  weatherRequest.overrideMimeType('text/xml');
  weatherRequest.open('GET', weatherURL, true);
  weatherRequest.setRequestHeader('Content-Type', 'text/xml; charset=utf-8');
  weatherRequest.setRequestHeader('Pragma', 'no-cache');
  weatherRequest.setRequestHeader('Cache-Control', 'no-cache');
  weatherRequest.onload = function parse()
  {
   if (nowweather_shared._requestTimeout != null)
   {
    clearTimeout(nowweather_shared._requestTimeout);
    nowweather_shared._requestTimeout = null;
   }
   let return_data = new Object();
   try
   {
    let passXML = weatherRequest.responseXML;
    if (passXML == undefined || passXML.documentElement.tagName == 'parsererror')
    {
     nowweather_shared.current_weather = 'Error';
     nowweather_shared.updateWindowDisplays();
     return true;
    }
    let passTagTimes  = passXML.getElementsByTagName('time-layout');
    if (passTagTimes === undefined || passTagTimes === null || passTagTimes.length === 0)
    {
     nowweather_shared.current_weather = 'Error';
     nowweather_shared.updateWindowDisplays();
     return true;
    }
    let passTagParamList = passXML.getElementsByTagName('parameters');
    if (passTagParamList === undefined || passTagParamList === null || passTagParamList.length === 0)
    {
     nowweather_shared.current_weather = 'Error';
     nowweather_shared.updateWindowDisplays();
     return true;
    }
    let passTagParams = passTagParamList[0].children;
    let timeData = new Object();
    for(let i = 0; i < passTagTimes.length; i++)
    {
     let key = passTagTimes[i].children[0].textContent;
     let timeRanges = [];
     let lStart = '';
     for(let j = 0; j < passTagTimes[i].children.length; j++)
     {
      if (passTagTimes[i].children[j].tagName == 'start-valid-time')
      {
       if (lStart == '')
       {
        lStart = passTagTimes[i].children[j].textContent;
       }
       else
       {
        timeRanges.push(lStart);
        lStart = passTagTimes[i].children[j].textContent;
       }
      }
      if (passTagTimes[i].children[j].tagName == 'end-valid-time')
      {
       timeRanges.push(lStart + ' - ' + passTagTimes[i].children[j].textContent);
       lStart = '';
      }
     }
     if (lStart != '')
     {
      timeRanges.push(lStart);
     }
     timeData[key] = timeRanges;
    }
    let lstTemps = new Object();
    let lstIcons = new Object();
    for(let i = 0; i < passTagParams.length; i++)
    {
     let paramName = passTagParams[i].getElementsByTagName('name')[0].textContent;
     if (paramName == 'Temperature')
     {
      let unit = passTagParams[i].getAttribute('units');
      if (unit == 'Fahrenheit')
       unit = nowweather_shared._locale.GetStringFromName('unit.fahrenheit');
      if (unit == 'Celsius')
       unit = nowweather_shared._locale.GetStringFromName('unit.celsius');
      let time = passTagParams[i].getAttribute('time-layout');
      let values = passTagParams[i].getElementsByTagName('value');
      for(let j = 0; j < values.length; j++)
      {
       let uTime = Math.floor(Date.parse(timeData[time][j]) / (1000 * 60 * 60));
       if (return_data[uTime] === undefined)
        return_data[uTime] = new Object();
       return_data[uTime]['temp'] = nowweather_shared._locale.GetStringFromName('unit.display').replace('%1', values[j].textContent).replace('%2', unit);
      }
     }
     if (paramName == 'Conditions Icons')
     {
      let time = passTagParams[i].getAttribute('time-layout');
      let values = passTagParams[i].getElementsByTagName('icon-link');
      for(let j = 0; j < values.length; j++)
      {
       let uTime = Math.floor(Date.parse(timeData[time][j]) / (1000 * 60 * 60));
       if (return_data[uTime] === undefined)
        return_data[uTime] = new Object();
       return_data[uTime]['icon'] = values[j].textContent;
      }
     }
    }
   }
   catch (ex)
   {
    console.log(ex);
    nowweather_shared.current_weather = 'Error';
    nowweather_shared.updateWindowDisplays();
    return true;
   }
   nowweather_shared.current_weather = return_data;
   nowweather_shared.updateWindowDisplays();
   return true;
  }
  try
  {
   if (nowweather_shared._requestTimeout != null)
   {
    clearTimeout(nowweather_shared._requestTimeout);
    nowweather_shared._requestTimeout = null;
   }
   nowweather_shared._requestTimeout = setTimeout('nowweather_shared.current_weather = "Error"; nowweather_shared.updateWindowDisplays();', 7500);
   weatherRequest.send(null);
  }
  catch (ex)
  {
   console.log(ex);
   nowweather_shared.current_weather = 'Error';
   nowweather_shared.updateWindowDisplays();
  }
 },
 updateWindowDisplays: function()
 {
  if (nowweather_shared._requestTimeout != null)
  {
   clearTimeout(nowweather_shared._requestTimeout);
   nowweather_shared._requestTimeout = null;
  }
  nowweather_shared.refreshPrefs();
  if (nowweather_shared._requestTimer != null)
  {
   clearTimeout(nowweather_shared._requestTimer);
   nowweather_shared._requestTimer = null;
  }
  nowweather_shared._requestTimer = setTimeout(nowweather_shared.initiateWeather, nowweather_shared.prefInterval * 60 * 60 * 1000);
  let mdtr = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
  let brw = mdtr.getEnumerator('navigator:browser');
  while (brw.hasMoreElements())
  {
   let wnd = brw.getNext();
   if (!('nowweather' in wnd))
    continue;
   try
   {
    wnd.nowweather.displayWeather();
   }
   catch(ex)
   {
    console.log(ex);
   }
  }
 },
 initiateWeather: function()
 {
  if (nowweather_shared._requestTimeout != null)
  {
   clearTimeout(nowweather_shared._requestTimeout);
   nowweather_shared._requestTimeout = null;
  }
  nowweather_shared.refreshPrefs();
  if ((nowweather_shared.prefLatitude == 199.0 || nowweather_shared.prefLongitude == 199.0) && nowweather_shared.prefGeo === false)
  {
   nowweather_shared.current_weather = 'Error';
   nowweather_shared.updateWindowDisplays();
   return;
  }
  nowweather_shared.getWeather();
 },
 refreshPrefs: function()
 {
  let prefLat = 199.0;
  let prefLon = 199.0;
  if (nowweather_shared._Prefs.prefHasUserValue('latitude'))
  {
   prefLat = parseFloat(nowweather_shared._Prefs.getCharPref('latitude'));
   if (prefLat > 90.0 || prefLat < -90.0)
    prefLat = 199.0;
  }
  if (nowweather_shared._Prefs.prefHasUserValue('longitude'))
  {
   prefLon = parseFloat(nowweather_shared._Prefs.getCharPref('longitude'));
   if (prefLon > 180.0 || prefLon < -180.0)
    prefLon = 199.0;
  }
  nowweather_shared.prefLatitude = prefLat;
  nowweather_shared.prefLongitude = prefLon;
  if (nowweather_shared._Prefs.prefHasUserValue('geolocate'))
   nowweather_shared.prefGeo = nowweather_shared._Prefs.getBoolPref('geolocate');
  else
   nowweather_shared.prefGeo = false;
  if (nowweather_shared._Prefs.prefHasUserValue('interval'))
   nowweather_shared.prefInterval = nowweather_shared._Prefs.getIntPref('interval');
  else
   nowweather_shared.prefInterval = 1;
  if (nowweather_shared._Prefs.prefHasUserValue('unittype'))
   nowweather_shared.prefUnit = nowweather_shared._Prefs.getCharPref('unittype');
  else
   nowweather_shared.prefUnit = 'e';
 }
};
nowweather_shared.geoResponse.prototype = {
 update: function(pos)
 {
  if (pos.coords.latitude === nowweather_shared.geoLatitude)
   return;
  if (pos.coords.longitude === nowweather_shared.geoLongitude)
   return;
  nowweather_shared.geoLatitude = pos.coords.latitude;
  nowweather_shared.geoLongitude = pos.coords.longitude;
 },
 notifyError: function(err)
 {
  console.log(err);
  nowweather_shared.current_weather = 'Error';
  nowweather_shared.updateWindowDisplays();
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