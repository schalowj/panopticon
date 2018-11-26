/*
 * panopticon-main.js
 * 
 * Copyright 2018 J.A. Schalow <schalowj@gmail.com>
 * 
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston,
 * MA 02110-1301, USA.
 * 
 * 
 */

//////////////////////////
//WebService Object
//////////////////////////

//Constructor
function WebService()
{

}
WebService.prototype.constructor = WebService;

WebService.prototype.getJSON = function(url, callback) {
	 var xhttp = new XMLHttpRequest();
		 xhttp.onreadystatechange = function() {
			 if (this.readyState == 4 && this.status == 200) {
				callback(null, JSON.parse(xhttp.response));
			 }
		 };
	xhttp.open("GET", url, true);
	xhttp.send();
};

WebService.prototype.getFeed = function(feed, sinceID, callback) {
	 var xhttp = new XMLHttpRequest();
		 xhttp.onreadystatechange = function() {
			 if (this.readyState == 4 && this.status == 200) {
				callback(null, feed, JSON.parse(xhttp.response));
			 }
		 };
	xhttp.open("GET", "feed?name=" + feed + "&sinceID=" + sinceID, true);
	xhttp.send();
};


//////////////////////////
//IPRange Object
//////////////////////////

//Constructor
function IPRange(start, end)
{
	this.start = start;
	this.end = end;
}
IPRange.prototype.constructor = IPRange;

IPRange.prototype.inRange = function(ip) {
  var num = this.atoi(ip);
  return (num >= this.atoi(this.start)) && (num <= this.atoi(this.end));
}

IPRange.prototype.atoi = function (addr) {
  var parts = addr.split('.').map(function(str) {
    return parseInt(str);
  });

  return (parts[0] ? parts[0] << 24 : 0) +
         (parts[1] ? parts[1] << 16 : 0) +
         (parts[2] ? parts[2] << 8  : 0) +
          parts[3];
};

//////////////////////////
//MapRegion Object
//////////////////////////

//Constructor
function MapRegion(x1, y1, x2, y2, name="")
{
	this.x1 = x1;
	this.y1 = y1;
	this.x2 = x2;
	this.y2 = y2;
	this.name = name;
	this.ipRanges = new Array();
	this.endpoints = new Array();
}
MapRegion.prototype.constructor = MapRegion;

MapRegion.prototype.addIPRange = function(start, end) {

	this.ipRanges.push(new IPRange(start,end));

}

MapRegion.prototype.inRegion = function(ip) {
	for (var j = 0; j< this.ipRanges.length; j++) {
		if (this.ipRanges[j].inRange(ip)) return true;
	}
	return false;
}

MapRegion.prototype.newEndpoint = function(ip, type) {

	map_coords = this.getNextEPLocation();
	ep = new Endpoint(ip, type, map_coords[0], map_coords[1]);
	ep.label = this.name;
	this.endpoints.push(ep);
	return ep;
}

MapRegion.prototype.getNextEPLocation = function() {

	idx = this.endpoints.length;
	pwr = 0;

	//Count down powers of 4
	while (idx >= (Math.pow(4,pwr))) {
		idx -= (Math.pow(4,pwr));
		pwr++;
	}

	//grid dimension is a power of 2
	grid_dim = Math.pow(2, pwr);

	//Spacing is reciprocal power of two
	spacing = Math.pow((.5),pwr);

	//Relative start is one reciprocal power of two higher (e.g. grid_dim=2 -> spacing = .25)
	rel_start = Math.pow(.5,pwr+1);

	//relative x coord is idx mod dimension times spacing (starting at spacing)
	relx = rel_start + ((idx % grid_dim) * spacing);

	//relative y coord is idx \ dimension times spacing (starting at spacing)
	rely = rel_start + (Math.floor(idx / grid_dim) * spacing);

	//Convert to real coords
	x = this.x1 + ((this.x2 - this.x1) * relx);
	y = this.y1 + ((this.y2 - this.y1) * rely);

	return [x,y];
}



//////////////////////////
//Endpoint Object
//////////////////////////

//Constructor
function Endpoint(ip, type, x, y)
{
	this.offmap = false;
	if (x == null || y == null) this.offmap = true;
	this.x = x;
	this.y = y;
	this.ip = ip;
	this.type = type;
	this.label = "";

}
Endpoint.prototype.constructor = Endpoint;

//////////////////////////
//Alert Object
//////////////////////////

//Constructor
function Alert(src, dst, time, type, msg)
{
	this.alertTime = time;
	this.src = src;
	this.dst = dst;
	this.type = type;
	this.msg = msg

}
Alert.prototype.constructor = Alert;


//////////////////////////
//Configuration Object
//////////////////////////

//Constructor
function Configuration(loadCallback)
{
	this.webConnection = new WebService();
	this.map_url = null;
	this.loaded = false;
	this.loadCallback = loadCallback;
	this.loadConfig();

}
Configuration.prototype.constructor = Configuration;

Configuration.prototype.loadConfig = function () {

	this.loadAppConfig = this.loadAppConfig.bind(this);
	this.loadMapConfig = this.loadMapConfig.bind(this);
	this.webConnection.getJSON("appconfig", this.loadAppConfig);

}

Configuration.prototype.loadAppConfig = function (status, response) {

	if (status == null) {
		this.refreshRate = response.refreshRate;
		this.maxZoom = response.maxZoom;
		this.zoomRate = response.zoomRate;
		this.raySize = response.raySize;
		this.rayGlow = response.rayGlow;
		this.raySpeed = response.raySpeed;
		this.endpointSize = response.endpointSize;
		this.endpointGlow = response.endpointGlow;
		this.endpointExternalColor = response.endpointExternalColor;
		this.endpointFadeinRate = response.endpointFadeinRate;
		this.endpointFadeoutRate = response.endpointFadeoutRate;
		this.endpointHighlightRate = response.endpointHighlightRate;
		this.labelFontSize = response.labelFontSize;
		this.labelFontColor = response.labelFontColor;
		this.showLocalLabels = response.showLocalLabels;
		this.logoFontSize = response.logoFontSize;
		this.logoText = response.logoText;
		this.UIOutlineColor = response.UIOutlineColor;
		this.UIFillColor = response.UIFillColor;
		this.alertListSize = response.alertListSize;
		this.alertListFontSize = response.alertListFontSize;
		this.scrollRate = response.scrollRate;
		this.ep_timeout = response.ep_timeout;
		this.alertEndpointColors = response.alertEndpointColors;
		this.alertRayColors = response.alertRayColors;
		this.feedMaxIDs = response.feedMaxIDs;
		this.loaded = true;
		this.webConnection.getJSON("maps", this.loadMapConfig);
	}
}

Configuration.prototype.loadMapConfig = function (status, response) {

	if (status == null) {

		this.maps = new Map();
		this.defaultMap = response.defaultMap;
		for (j=0;j < response.maps.length; j++) {
			this.maps.set(response.maps[j].name, response.maps[j]);
		}
		this.loadCallback();
	}
}

Configuration.prototype.getEPColor = function(alertType){
	if (alertType in this.alertEndpointColors) {
		return this.alertEndpointColors[alertType];
	} else {
		return this.alertEndpointColors["default"];
	}
}

Configuration.prototype.getRayColor = function(alertType){

	if (alertType in this.alertRayColors) {
		return this.alertRayColors[alertType];
	} else {
		return this.alertRayColors["default"];
	}

}

Configuration.prototype.getMapRegions = function(map){
	m = this.maps.get(map);
	out = new Array();
	for (j=0; j< m.regions.length; j++) {
		r = new MapRegion(m.regions[j].x1,m.regions[j].y1,m.regions[j].x2,m.regions[j].y2,m.regions[j].name);
		for (k=0;k< m.regions[j].ipranges.length;k++) {
			r.addIPRange(m.regions[j].ipranges[k].start, m.regions[j].ipranges[k].end);
		}
		out.push(r)
	}
	return out;

}



//////////////////////////
//Controller Object
//////////////////////////

//Constructor
function Controller()
{
	this.map_img = document.createElement("IMG")
	this.map_img.height = 0;
	this.map_img.width = 0;
	this.lastUpdate = null;
	this.loaded = false;
	this.config = null;

	this.feedMaxID = new Map();
	this.asyncLoadConfig = this.asyncLoadConfig.bind(this);
	this.loadMap = this.loadMap.bind(this);
	this.getAlerts = this.getAlerts.bind(this);
	this.processAlerts = this.processAlerts.bind(this);
	this.asyncLoadConfig();
	this.endpoints = new Map();
	this.alertQueue = new Array();




//	this.width = this.map.naturalHeight;
//	this.height = this.map.naturalWidth;

}
Controller.prototype.constructor = Controller;


Controller.prototype.asyncLoadConfig = function () {

	if (this.config == null) {
		this.config = new Configuration(this.asyncLoadConfig);
	}


	if (this.config.loaded){
		this.loadMap(this.config.defaultMap);

	}
}

Controller.prototype.loadMap = function (map) {
		this.stopAlerts();
		x = this;
		this.loaded = false;
		this.map_img.onload = function() {
			alertMapController.width = alertMapController.map_img.naturalWidth;
			alertMapController.height = alertMapController.map_img.naturalHeight;
			alertMapController.loaded = true;
			alertMapController.lastUpdate = Date.now();
			//console.log(x.width+','+x.height);
		};
		this.map_img.src = "images/" + this.config.maps.get(map).map_url;
		this.map = this.map_img;
		this.mapRegions = this.config.getMapRegions(map);
		this.feeds = this.config.maps.get(map).feeds;
		if (this.feedMaxID.size == 0) {
			for (var j = 0; j < this.config.feedMaxIDs.length; j ++) {
				this.feedMaxID.set(this.config.feedMaxIDs[j][0],this.config.feedMaxIDs[j][1]);
			}
		}
		this.endpoints = new Map();
		this.startAlerts();
}

Controller.prototype.addAlert = function(src_ip, src_label, dest_ip, dest_label, type, msg) {

	s = this.getIPEndpoint(src_ip, type);
	if (src_label != null) {
		s.label = src_label;
	} else {
		s.label = "";
	}
	d = this.getIPEndpoint(dest_ip, type);
	if (dest_label != null) {
		d.label = dest_label;
	} else {
		d.label = "";
	}

	this.alertQueue.push(new Alert(s,d,Date.now(),type, msg));



	//console.log(d.ip + " (" + d.x + "," + d.y + ") -> " + s.ip + " (" + s.x + "," + s.y + ")");

}

Controller.prototype.getIPEndpoint = function(ip, type) {

	if (this.endpoints.has(ip)) {
		return this.endpoints.get(ip)
	} else {
		ep = this.createIPEndpoint(ip);
		this.endpoints.set(ip,ep);
		return ep;
	}


}

Controller.prototype.createIPEndpoint = function(ip, type) {
	for (var q = 0; q < this.mapRegions.length; q++) {
		if (this.mapRegions[q].inRegion(ip)) {
			 return this.mapRegions[q].newEndpoint(ip, type);

		 }
	 }

	return new Endpoint(ip,type,null,null);

}

Controller.prototype.startAlerts = function() {
	this.stopAlertProcessing = false;
	setTimeout(this.getAlerts,this.refreshRate);
}

Controller.prototype.stopAlerts = function() {
	this.stopAlertProcessing = true;
}

Controller.prototype.getAlerts = function() {
	for (var j = 0; j < this.feeds.length; j++) {
		w = new WebService();
		w.getFeed(this.feeds[j], this.feedMaxID.get(this.feeds[j]),this.processAlerts);
		//console.log("Processing " + this.feeds[j]);
	}
	if (this.stopAlertProcessing==false) setTimeout(this.getAlerts,this.config.refreshRate);
}

Controller.prototype.processAlerts = function(status, feed, response) {
	if (status == null) {
		var oldMaxID = 0;
		var maxID = 0;

		if (this.feedMaxID.has(feed)) oldMaxID = this.feedMaxID.get(feed);
		for (var j = 0; j < response.alerts.length; j++) {
			if (response.alerts[j].id > maxID) maxID = response.alerts[j].id;
			if (response.alerts[j].id > oldMaxID) this.addAlert(response.alerts[j].src, response.alerts[j].src_label, response.alerts[j].dst, response.alerts[j].dst_label, response.alerts[j].type, response.alerts[j].msg);
		 }
		 //console.log("processed " + response.alerts.length + " alerts");

		 if (this.feedMaxID.has(feed)) {
			 if (this.feedMaxID.get(feed) < maxID) this.feedMaxID.set(feed,maxID);
		 } else {
			 this.feedMaxID.set(feed,maxID);
		 }
		this.lastUpdate = Date.now();

	} else {
		console.log(status + " " + response);
	}
}



//MAIN

var alertMapController = new Controller();
