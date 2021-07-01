Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

const CLASS_ID = Components.ID('6E471427-92A1-4665-8FF5-1343BEC5B1D5');
const CLASS_NAME = 'GeoLocation AutoComplete';
const CONTRACT_ID = '@mozilla.org/autocomplete/search;1?name=locationAutocomplete';

function ProviderAutoCompleteResult(searchString, searchResult, defaultIndex, errorDescription, results, comments)
{
 this._searchString = searchString;
 this._searchResult = searchResult;
 this._defaultIndex = defaultIndex;
 this._errorDescription = errorDescription;
 this._results = results;
 this._comments = comments;
}

ProviderAutoCompleteResult.prototype = {
 _searchString: '',
 _searchResult: 0,
 _defaultIndex: 0,
 _errorDescription: '',
 _results: [],
 _comments: [],
 get searchString(){return this._searchString;},
 get searchResult(){return this._searchResult;},
 get defaultIndex(){return this._defaultIndex;},
 get errorDescription(){return this._errorDescription;},
 get matchCount(){return this._results.length;},
 getValueAt: function(index){return this._results[index];},
 getCommentAt: function(index)
 {
  if (this._comments)
   return this._comments[index];
  else
   return '';
 },
 getStyleAt: function(index)
 {
  if (!this._comments || !this._comments[index])
   return null;
  if (index == 0)
   return 'suggestfirst';
  return 'suggesthint';
 },
 getImageAt: function (index){return '';},
 getFinalCompleteValueAt: function(index){return this.getValueAt(index);},
 removeValueAt: function(index, removeFromDb)
 {
  this._results.splice(index, 1);
  if (this._comments)
   this._comments.splice(index, 1);
 },
 getLabelAt: function(index){return this._results[index];},
 QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsIAutoCompleteResult])
};

function ProviderAutoCompleteSearch()
{
 apiGet: null
}

ProviderAutoCompleteSearch.prototype = {
  classID: CLASS_ID,
  classDescription : CLASS_NAME,
  contractID : CONTRACT_ID,
  startSearch: function(searchString, searchParam, previousResult, listener)
  {
   let apiURL = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest';
   apiURL += '?f=json';
   apiURL += '&maxSuggestions=6';
   apiURL += '&text=' + searchString;
   apiURL += '&_=' + (new Date()).valueOf();
   let protoThis = this;
   this.apiGet = Components.classes['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance(Components.interfaces.nsIXMLHttpRequest);
   this.apiGet.open('GET', apiURL, true);
   this.apiGet.setRequestHeader('Pragma', 'no-cache');
   this.apiGet.setRequestHeader('Cache-Control', 'no-cache');
   this.apiGet.onload = function()
   {
    let ret = [];
    let retJSON = JSON.parse(this.responseText);
    if (!('suggestions' in retJSON))
    {
     var autocomplete_result = new ProviderAutoCompleteResult(searchString, Components.interfaces.nsIAutoCompleteResult.RESULT_NOMATCH, 0, '', ret, null);
     listener.onSearchResult(protoThis, autocomplete_result);
     return;
    }
    if (retJSON.suggestions.length < 1)
    {
     var autocomplete_result = new ProviderAutoCompleteResult(searchString, Components.interfaces.nsIAutoCompleteResult.RESULT_NOMATCH, 0, '', ret, null);
     listener.onSearchResult(protoThis, autocomplete_result);
     return;
    }
    for (let i = 0; i < retJSON.suggestions.length; i++)
    {
     ret.push(retJSON.suggestions[i].text);
    }
    var autocomplete_result = new ProviderAutoCompleteResult(searchString, Components.interfaces.nsIAutoCompleteResult.RESULT_SUCCESS, 0, '', ret, null);
    listener.onSearchResult(protoThis, autocomplete_result);
   };
   this.apiGet.send(null);
  },
  stopSearch: function()
  {
   this.apiGet.abort();
  },
  QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsIAutoCompleteSearch])
};

const NSGetFactory = XPCOMUtils.generateNSGetFactory([ProviderAutoCompleteSearch]);
