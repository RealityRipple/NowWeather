var nowweather_api =
{
 getAddrFromCoords: function(lat, lon)
 {
  let p = new Promise(
   function(resolve, reject)
   {
    let apiURL = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode';
    apiURL += '?f=json';
    apiURL += '&location=' + lon + ',' + lat;
    apiURL += '&_=' + (new Date()).valueOf();
    let apiGet = new XMLHttpRequest();
    apiGet.open('GET', apiURL, true);
    apiGet.setRequestHeader('Pragma', 'no-cache');
    apiGet.setRequestHeader('Cache-Control', 'no-cache');
    apiGet.onload = function()
    {
     let retJSON = JSON.parse(apiGet.responseText);
     if (!('address' in retJSON))
     {
      resolve(false);
      return;
     }
     if (!retJSON.address.hasOwnProperty('Match_addr'))
     {
      resolve(false);
      return;
     }
     resolve(retJSON.address.Match_addr);
    };
    apiGet.send(null);
   }
  );
  return p;
 },
 getCoordsFromAddr: function(addr)
 {
  let p = new Promise(
   function(resolve, reject)
   {
    let apiURL = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/find';
    apiURL += '?f=json';
    apiURL += '&maxSuggestions=1';
    apiURL += '&text=' + addr;
    apiURL += '&_=' + (new Date()).valueOf();
    let apiGet = new XMLHttpRequest();
    apiGet.open('GET', apiURL, true);
    apiGet.setRequestHeader('Pragma', 'no-cache');
    apiGet.setRequestHeader('Cache-Control', 'no-cache');
    apiGet.onload = function()
    {
     let retJSON = JSON.parse(apiGet.responseText);
     if (!('locations' in retJSON))
     {
      resolve(false);
      return;
     }
     if (retJSON.locations.length < 1)
     {
      resolve(false);
      return;
     }
     let ret = {};
     ret['latitude'] = retJSON.locations[0].feature.geometry.y;
     ret['longitude'] = retJSON.locations[0].feature.geometry.x;
     resolve(ret);
    };
    apiGet.send(null);
   }
  );
  return p;
 }
};
