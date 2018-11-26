/*
 * panopticon-ui.js
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
//Viewport Object
//////////////////////////

//Constructor
function Viewport(controller)
{
	this.controller = controller;
	this.mapWidth = controller.width;
	this.mapHeight = controller.height;
	this.centerY = controller.height /2;
	this.centerX = controller.width/2;
	this.size = paper.view.size;
	this.center = paper.view.center;
	this.zoomLevel = 1;
	this.endpoints = new Map();
	this.offmap_ep = new Array();
	this.alertList = new Array();
	this.rays = new Map();
	this.alerts = controller.alertQueue;
	this.animQueue = new AnimationQueue();
	this.map = new Raster(controller.map);
	this.initializeMap();
	this.redraw();
}
Viewport.prototype.constructor = Viewport;

Viewport.prototype.process = function(delta_t){

	//check for window resizing

	if ((this.size.width != paper.view.size.width) || (this.size.height != paper.view.size.height)) {
		this.size = paper.view.size;
		this.center = paper.view.center;
		newmap = new Raster(this.controller.map);
		this.map.replaceWith(newmap);
		this.map = newmap;
		this.initializeMap();
		this.map.scale(this.zoomLevel);
		this.redraw();
		ui.reposition();
	}


	while (this.alerts.length > 0) {

		a = this.alerts.shift();
		s = this.updateAndDisplay(a.src);
		d = this.updateAndDisplay(a.dst);
		r = new Ray(s,d,this.getRayColor(a.type),this);

		this.alertList.push(a);
		if (this.alertList.length > this.controller.config.alertListSize) this.alertList.shift();

	}

	this.animQueue.process(delta_t);
	this.cullEndpoints();
}

Viewport.prototype.updateAndDisplay = function(endpoint) {

	var eg;
	if (this.endpoints.has(endpoint)) {
		eg = this.endpoints.get(endpoint);
		eg.changed = Date.now();
		eg.show();
	} else {
		if (endpoint.offmap) {
			this.offmap_ep.push(endpoint);
			eg = new EndpointGraphic(new Point(0,0), endpoint.ip, endpoint.label, this.getEPColor(endpoint.type),this.animQueue,true);
			this.endpoints.set(endpoint,eg);
			eg.show();
			this.repositionOffMapEPs();


		} else {
			eg = new EndpointGraphic(this.xlatMapCoords(endpoint.x,endpoint.y), endpoint.ip, endpoint.label, this.getEPColor(endpoint.type),this.animQueue,false);
			this.endpoints.set(endpoint,eg);
			eg.show();
		}


	}
	return eg;

}

Viewport.prototype.cullEndpoints = function() {

	var vp = this;
	curr_time = Date.now();
	this.endpoints.forEach(function(value, key) {
	  	if ((value.hidden == false) && ((curr_time - value.changed) > vp.controller.config.ep_timeout)) {value.hide();}
	});

}

Viewport.prototype.repositionOffMapEPs = function() {
	screenAspect = this.size.width/this.size.height;
	mapAspect = this.mapWidth/this.mapHeight;

	//If map aspect is larger, we fit to horizontal, else vertical
	coordScale =1;
	if (mapAspect > screenAspect) {
		coordScale = this.mapWidth/this.size.width;
	} else {
		coordScale = this.mapHeight/this.size.height;
	}

	for (i = 0; i<this.offmap_ep.length;i++) {
		x = 0;
		y = 0;
		if (this.endpoints.get(this.offmap_ep[i]).ico_group != null) {
			if (((i % 4) == 0) || ((i % 4) == 2)) {
				if ((i % 4) == 0) {
					epwidth = this.endpoints.get(this.offmap_ep[i]).ico_group.bounds.width;
					epheight = this.endpoints.get(this.offmap_ep[i]).ico_group.bounds.height;
					map_delta_x = (epwidth) * coordScale;
					map_delta_y = (epheight) * coordScale;
					x = map_delta_x/2;
					y = (this.mapHeight - (map_delta_y*1.5)) - Math.floor(((Math.ceil((i-(i % 4))/4)/Math.ceil((this.offmap_ep.length/4))) * (this.mapHeight - (map_delta_y*1.5))));
					this.offmap_ep[i].x = x;
					this.offmap_ep[i].y = y;
					this.endpoints.get(this.offmap_ep[i]).reposition(this.xlatMapCoords(x,y));

				} else {
					epwidth = this.endpoints.get(this.offmap_ep[i]).ico_group.bounds.width;
					epheight = this.endpoints.get(this.offmap_ep[i]).ico_group.bounds.height;
					map_delta_x = (epwidth) * coordScale;
					map_delta_y = (epheight) * coordScale;
					x = this.mapWidth - map_delta_x/2;
					y = (map_delta_y*1.5) + Math.floor(((Math.ceil((i-(i % 4))/4)/Math.ceil((this.offmap_ep.length/4))) * (this.mapHeight - (map_delta_y*1.5))));
					this.offmap_ep[i].x = x;
					this.offmap_ep[i].y = y;
					this.endpoints.get(this.offmap_ep[i]).reposition(this.xlatMapCoords(x,y));
				}

			} else {
				if ((i % 4) == 1) {
					epwidth = this.endpoints.get(this.offmap_ep[i]).ico_group.bounds.width;
					epheight = this.endpoints.get(this.offmap_ep[i]).ico_group.bounds.height;
					map_delta_x = (epwidth) * coordScale;
					map_delta_y = (epheight) * coordScale;
					y = map_delta_y/2;
					x = (this.mapWidth - (map_delta_x*1.5)) - Math.floor(((Math.ceil((i-(i % 4))/4)/Math.ceil((this.offmap_ep.length/4))) * (this.mapWidth - (map_delta_x*1.5))));
					this.offmap_ep[i].x = x;
					this.offmap_ep[i].y = y;
					this.endpoints.get(this.offmap_ep[i]).reposition(this.xlatMapCoords(x,y));

				} else {
					epwidth = this.endpoints.get(this.offmap_ep[i]).ico_group.bounds.width;
					epheight = this.endpoints.get(this.offmap_ep[i]).ico_group.bounds.height;
					map_delta_x = (epwidth) * coordScale;
					map_delta_y = (epheight) * coordScale;
					y = this.mapHeight - map_delta_y/2;
					x = (map_delta_x*1.5) + Math.floor(((Math.ceil((i-(i % 4))/4)/Math.ceil((this.offmap_ep.length/4))) * (this.mapWidth - (map_delta_x*1.5))));
					this.offmap_ep[i].x = x;
					this.offmap_ep[i].y = y;
					this.endpoints.get(this.offmap_ep[i]).reposition(this.xlatMapCoords(x,y));
				}
			}
		}
	}
}


Viewport.prototype.getEPColor = function(alertType){

	return new Color(this.controller.config.getEPColor(alertType));

}

Viewport.prototype.getRayColor = function(alertType){

	return new Color(this.controller.config.getRayColor(alertType));

}


Viewport.prototype.xlatMapCoords = function(x,y){

	var viewX;
	var viewY;

	//First, get some useful screen info
	var screenWidth = this.size.width;
	var screenHeight = this.size.height;
	var screenCenterX = this.center.x;
	var screenCenterY = this.center.y;

	//coord relative to current centering of map
	var relx = x - this.centerX;
	var rely = y - this.centerY;


	//At zoom level 1, the whole map fits on the screen, etc.

	//First need aspect ratios
	var screenAspect = screenWidth/screenHeight;
	var mapAspect = this.mapWidth/this.mapHeight;

	//console.log(mapAspect + "," + screenAspect);

	//If map aspect is larger, we fit to horizontal, else vertical
	var coordScale;
	if (mapAspect > screenAspect) {
		coordScale = screenWidth/this.mapWidth;
	} else {
		coordScale = screenHeight/this.mapHeight;
	}

	viewX = Math.round(screenCenterX + (relx * coordScale * this.zoomLevel));
	viewY = Math.round(screenCenterY + (rely * coordScale * this.zoomLevel));
	//console.log(viewX + "," + viewY);

	return new Point(viewX,viewY);

}

Viewport.prototype.fitToScreen = function(){

	this.centerX = height /2;
	this.centerY = width/2;
	this.zoomLevel = 1;
	this.redraw();
}

Viewport.prototype.zoomIn = function(){
	prev = this.zoomLevel;
	this.zoomLevel += this.controller.config.zoomRate;
	if (this.zoomLevel > this.controller.config.maxZoom) this.zoomLevel = this.controller.config.maxZoom;
	this.map.scale(this.zoomLevel/prev);
	this.redraw();
}

Viewport.prototype.zoomOut = function(){
	prev = this.zoomLevel;
	this.zoomLevel -= this.controller.config.zoomRate;
	if (this.zoomLevel < 1) this.zoomLevel = 1;
	this.map.scale(this.zoomLevel/prev);
	this.redraw();
}

Viewport.prototype.recenter = function(point){

	//convert to map coords

	//First, get some useful screen info
	var screenWidth = this.size.width;
	var screenHeight = this.size.height;
	var screenCenterX = this.center.x;
	var screenCenterY = this.center.y;

	//coord relative to current centering of screen
	var relx = point.x - screenCenterX;
	var rely = point.y - screenCenterY;

	//First need aspect ratios
	var screenAspect = screenWidth/screenHeight;
	var mapAspect = this.mapWidth/this.mapHeight;

	//If map aspect is larger, we fit to horizontal, else vertical
	var coordScale;
	if (mapAspect > screenAspect) {
		coordScale = this.mapWidth/screenWidth;
	} else {
		coordScale = this.mapHeight/screenHeight;
	}

	this.centerX += (relx * coordScale / this.zoomLevel);
	this.centerY += (rely * coordScale / this.zoomLevel);
	this.redraw();
}

Viewport.prototype.initializeMap = function(){

	//fix map location and scale
	var screenWidth = this.size.width;
	var screenHeight = this.size.height;
	var coordScale;
	var screenAspect = screenWidth/screenHeight;
	var mapAspect = this.mapWidth/this.mapHeight;
	if (mapAspect > screenAspect) {
		coordScale = screenWidth/this.mapWidth;
	} else {
		coordScale = screenHeight/this.mapHeight;
	}
	this.map.scale(coordScale);
	this.map.position = this.xlatMapCoords((this.mapWidth/2),(this.mapHeight/2))


}


Viewport.prototype.redraw = function(){
	var vp = this;

	//fix map location
	this.map.position = this.xlatMapCoords((this.mapWidth/2),(this.mapHeight/2))

	//reposition endpoints
	this.endpoints.forEach(function(value, key) {
	  value.reposition(vp.xlatMapCoords(key.x,key.y));
	});
	//reposition rays
	this.rays.forEach(function(value, key) {
	  value.update();
	});


}

Viewport.prototype.reloadMap = function(map){

	paper.project.activeLayer.removeChildren();
	paper.view.draw();

	this.controller.loadMap(map);
	asyncRestart();

}


//////////////////////////
//Animation Queue Object
//////////////////////////

//Constructor
function AnimationQueue()
{
	this.queue = new Map();
}
AnimationQueue.prototype.constructor = AnimationQueue;

AnimationQueue.prototype.addObject = function(obj) {

	this.queue.set(obj, obj);

}

AnimationQueue.prototype.removeObject = function(obj) {

	this.queue.delete(obj);

}

AnimationQueue.prototype.currentQueue = function() {

	return this.queue.values();

}

AnimationQueue.prototype.process = function(delta_t) {

	this.queue.forEach(function(value, key) {
	  value.doAnimation(delta_t);
	});
}


//////////////////////////
//Ray Object
//////////////////////////

//Constructor
function Ray(src,dst,color,viewport)
{
	var path = new Path();
	path.add(src.position,dst.position);

	var normal = path.getNormalAt(path.length/2) * (path.length/8);
	if ((normal.angle >= 0) && (normal.angle < 270)) normal.angle += 180;
	var midpoint = path.getPointAt(path.length/2) + normal;
	path.remove();

	var g = new Gradient();
	var c1 = new Color(color);
	c1.alpha = 0;
	var c2 = new Color(color);
	c2.alpha = 0;
	var c3 = new Color(color);
	c3.alpha = 0;


	g.stops = [c1,c2,c3];
	var gradientColor = new Color(g, src.position, dst.position);

	path = new Path.Arc(src.position, midpoint, dst.position);
	path.visible = false;
	path.strokeWidth = viewport.controller.config.rayGlow;
	path.opacity = .5
	path.strokeColor = gradientColor.clone();

	path2 = path.clone();
	path2.strokeWidth = viewport.controller.config.raySize;
	path2.opacity = 1
	path2.strokeColor = gradientColor.clone();

	src.ico_group.bringToFront();
	dst.ico_group.bringToFront();

	this.color = color;
	this.main = path2;
	this.glow = path;
	this.src = src;
	this.dst = dst;
	this._animTimer = 0;
	this._animQueue = viewport.animQueue;
	this._viewport = viewport;
	this._viewport.rays.set(this,this);
	this._animQueue.addObject(this);
	this.main.visible = true;
	this.glow.visible = true;

}

Ray.prototype.constructor = Ray;

Ray.prototype.doAnimation = function(delta_t) {

	var anim_rate = viewport.controller.config.raySpeed;
	this._animTimer += delta_t;
	var ray_anim_progress = this._animTimer / anim_rate;
	if (ray_anim_progress <= 1) {

		var c1 = new Color(this.color);
		var c2 = new Color(this.color);
		var c3 = new Color(this.color);

		if ((ray_anim_progress) < .25)
		{
			c1.alpha = (ray_anim_progress*4);
		} else if ((ray_anim_progress) < .5) {
			c1.alpha = 2 - (ray_anim_progress*4);
		} else {
			c1.alpha = 0;
		}


		if ((ray_anim_progress) < .5)
		{
			c2.alpha = (ray_anim_progress*2);
		} else if ((ray_anim_progress) < .75) {
			c2.alpha = 1 - ((ray_anim_progress - .5)*4);
		} else {
			c2.alpha = 0;
		}

		if ((ray_anim_progress) < .25) {
			c3.alpha = 0;
		} else if ((ray_anim_progress) < .75)
		{
			c3.alpha = (ray_anim_progress - .25) * 2;
		} else {
			c3.alpha = 1 - (ray_anim_progress*4);
		}


		var g = new Gradient();
		g.stops = [c1,c2,c3];
		gc = new Color(g,this.src.position,this.dst.position);
		this.main.strokeColor = gc.clone();
		this.glow.strokeColor = gc.clone();


	} else {
		this._animQueue.removeObject(this);
		this._viewport.rays.delete(this);
		this.main.remove();
		this.glow.remove();
		this.main = null;
		this.glow = null;
	}


}

Ray.prototype.update = function () {

	if (this.main != null) {
		var path = new Path();
		path.add(this.src.position,this.dst.position);

		var normal = path.getNormalAt(path.length/2) * (path.length/8);
		if ((normal.angle >= 0) && (normal.angle < 270)) normal.angle += 180;
		var midpoint = path.getPointAt(path.length/2) + normal;
		path.remove();

		path = new Path.Arc(this.src.position, midpoint, this.dst.position);
		path.visible = false;
		path.strokeWidth = viewport.controller.config.rayGlow;
		path.opacity = .2
		path.strokeColor = this.glow.strokeColor.clone();

		path2 = path.clone();
		path2.strokeWidth = viewport.controller.config.raySize;
		path2.opacity = .8
		path2.strokeColor = this.main.strokeColor.clone();

		this.main.remove();
		this.glow.remove();
		this.main = path2;
		this.glow = path;
		this.main.visible = true;
		this.glow.visible = true;
	}

}


//////////////////////////
//Endpoint Graphics Object
//////////////////////////

//Constructor
function EndpointGraphic(location, ip, label, color, animQueue, off_map)
{
	this.position = location;
	this.color = color;
	this.ip = ip;
	this.label = label;
	this.off_map = off_map;
	this.icon = null;
	this.glow = null;
	this.text = null;
	this.text2 = null;
	this.ext_box = null;
	this.ico_group = null;
	this._animQueue = animQueue;
	this._animMode = 0;
	this._animTimer = 0;
	this.changed = Date.now();
	this.hidden = false;

}
EndpointGraphic.prototype.constructor = EndpointGraphic;

EndpointGraphic.prototype.show = function () {

	var SIZE = viewport.controller.config.endpointSize;
	if (this.ico_group == null) {

		if (this.glow != null) {
			this.glow.opacity = 0;
		} else {
			this.glow = new Path.Circle(this.position, SIZE+2);
		}

		if (this.icon != null) {
			this.icon.opacity = 1;
		} else {
			this.icon = new Path.Circle(this.position, SIZE);
		}


		var text = new PointText(this.position + new Point(0,SIZE+10));
		text.justification = 'center';
		text.fontSize = viewport.controller.config.labelFontSize;
		text.fillColor = viewport.controller.config.labelFontColor;
		text.content = this.ip;
		this.text = text;

		this.glow.opacity = 0;
		this.glow.strokeColor = this.color.clone();
		this.glow.strokeWidth = viewport.controller.config.endpointGlow;
		this.glow.visible = true;

		this.icon.fillColor = this.color.clone();
		this.icon.visible = true;


		var text2 = new PointText(this.position + new Point(0,SIZE-25));
		text2.justification = 'center';
		text2.fontSize = viewport.controller.config.labelFontSize;
		text2.fillColor = viewport.controller.config.labelFontColor;
		text2.content = this.label;
		this.text2 = text2;
		if (this.off_map || viewport.controller.config.showLocalLabels) {
			text2.visible = true;
		} else {
			text2.visible = false;
		}

		this.ico_group = new Group([this.icon,this.text,this.text2,this.glow]);

		this.text2.bringToFront();

		this.ext_box = new Path.Rectangle(this.ico_group.bounds, 10);
		this.ext_box.fillColor = viewport.controller.config.endpointExternalColor;
		this.ext_box.scale(1.2);
		if (this.off_map) {
			this.ext_box.opacity = .5;
		} else {
			this.ext_box.opacity = 0;;
		}


		this.ico_group.addChild(this.ext_box);
		this.ext_box.sendToBack();
		this.ico_group.position = this.position;
		this._fadein();
	} else {
		this.quickhighlight();
	}
	this.hidden = false;

}

EndpointGraphic.prototype.reposition = function (pos) {

	this.position = pos;
	if (this.ico_group != null) {
		this.ico_group.position = pos;
		this.ico_group.visible = true;
	}
}


EndpointGraphic.prototype.hide = function () {

	this.hidden = true;
	if (this.icon != null) {
		this._fadeout();
	}
}

EndpointGraphic.prototype.highlight = function () {
	this._animMode = 2;
	this._animTimer = 0;
	this.icon.opacity = 1;
	this._animQueue.addObject(this);
}

EndpointGraphic.prototype.quickhighlight = function () {
	this._animMode = 4;
	this._animTimer = 0;
	this.icon.opacity = 1;
	this._animQueue.addObject(this);
}


EndpointGraphic.prototype._fadein = function () {

	this._animMode = 1;
	this._animTimer = 0;
	this.icon.opacity = 0;
	this._animQueue.addObject(this);
}

EndpointGraphic.prototype._fadeout = function () {

	this._animMode = 3;
	this._animTimer = 0;
	this.icon.opacity = 1;
	this._animQueue.addObject(this);
}


EndpointGraphic.prototype.doAnimation = function (delta_t) {

	var fadein_rate = viewport.controller.config.endpointFadeinRate;
	var fadeout_rate = viewport.controller.config.endpointFadeoutRate;
	var highlight_rate = viewport.controller.config.endpointHighlightRate;
	this._animTimer += delta_t;
	if (this.icon != null) {

		//Fade in w/ highlight
		if (this._animMode == 1) {

			o = this._animTimer/fadein_rate;
			if (o <= 1){
				this.icon.opacity = o;
				this.text.opacity = o;
			}
			norm = this.color.brightness;

			p = (this._animTimer/highlight_rate);

			if (p <= .1){
				this.icon.fillColor.brightness = (norm + ((1 - norm) * 10 * p));
				this.glow.opacity = p * 5;
			} else if (p <= 1){
				this.icon.fillColor.brightness = (norm + ((1 - norm) * 1.1111 * (1-p)));
				this.glow.opacity = (1 - p) * .555556;
			} else {
				this._animMode = 0;
				this.icon.fillColor.brightness = norm;
				this.glow.opacity = 0;
				this._animQueue.removeObject(this);
			}

		}


		//Highlight
		if (this._animMode == 2) {
			norm = this.color.brightness;

			p = (this._animTimer/highlight_rate);

			if (p <= .5){
				this.icon.fillColor.brightness = (norm + ((1 - norm) * 2 * p));
				this.glow.opacity = p;
			} else if (p <= 1){
				this.icon.fillColor.brightness = (norm + ((1 - norm) * 2 * (1-p)));
				this.glow.opacity = (1-p);
			} else {
				this._animMode = 0;
				this.icon.fillColor.brightness = norm;
				this.glow.opacity = 0;
				this._animQueue.removeObject(this);
			}

		}

		//Quick Highlight
		if (this._animMode == 4) {
			norm = this.color.brightness;

			p = (this._animTimer/highlight_rate);

			if (p <= .1){
				this.icon.fillColor.brightness = (norm + ((1 - norm) * 10 * p));
				this.glow.opacity = p * 5;
			} else if (p <= 1){
				this.icon.fillColor.brightness = (norm + ((1 - norm) * 1.1111 * (1-p)));
				this.glow.opacity = (1 - p) * .555556;
			} else {
				this._animMode = 0;
				this.icon.fillColor.brightness = norm;
				this.glow.opacity = 0;
				this._animQueue.removeObject(this);
			}

		}


		//Fade out
		if (this._animMode == 3) {

			o = (1 - this._animTimer/fadeout_rate);
			if (o >= 0){
				this.icon.opacity = o;
				this.text.opacity = o;
			} else {
				this._animMode = 0;
				this._animQueue.removeObject(this);
				this.ico_group.remove();
				this.icon = null;
				this.glow = null;
				this.ico_group = null;
			}
		}



	}
}


//////////////////////
//UI Elements
//////////////////////

function UIControls() {

	this.scrollingY = 0;
	this.scrollingX = 0;
	this.zoomingIn = 0;
	this.zoomingOut = 0;
	this.fading = 0;
	this.uiFadeRate = 2;
	this.pinned = true;
	this.tempShow = false;
	this.uiGroup = null;
	this.navGroup = null;
	this.titleGroup = null;
	this.alertGroup = null;
	this.alertBox1 = null;
	this.alertBox2 = null;
	this.alertListLines = new Array(viewport.controller.config.alertListSize);
	this.settingsGroup = null;
	this.settingsBox1 = null;
	this.settingsBox2 = null;
	this.connectionText = null;

}
UIControls.prototype.constructor = UIControls;

UIControls.prototype.init = function () {
	this.navGroup = this.createNavButtons(paper.view.bounds.bottomRight - (new Point(75,75)));
	this.titleGroup = this.createTitleHeader(paper.view.bounds.topLeft + (new Point(100,50)));
	this.alertGroup = this.createAlertList(new Point(0,0));
	this.alertGroup.position = (paper.view.bounds.bottomRight - (new Point((alertGroup.bounds.width/2) + this.navGroup.bounds.width + 40,(this.alertGroup.bounds.height/2) + 10)));
	this.alertGroup.visible = false;
	this.settingsGroup = this.createControlPanel(paper.view.bounds.center);
	this.settingsGroup.visible = false;
	this.uiGroup = new Group([this.titleGroup, this.navGroup, this.alertGroup, this.settingsGroup]);

	myui = this;

}

UIControls.prototype.reposition = function () {
	this.navGroup.position = (paper.view.bounds.bottomRight - (new Point(75,75)));
	this.titleGroup.position = (paper.view.bounds.topLeft + (new Point(100,50)));
	isVisible = this.alertGroup.visible;
	this.alertGroup.remove();
	this.alertGroup = this.createAlertList(new Point(0,0));
	this.alertGroup.position = (paper.view.bounds.bottomRight - (new Point((alertGroup.bounds.width/2) + this.navGroup.bounds.width + 40,(this.alertGroup.bounds.height/2) + 10)));
	this.alertGroup.visible = isVisible;
	isVisible = this.settingsGroup.visible;
	this.settingsGroup.remove();
	this.settingsGroup = this.createControlPanel(paper.view.bounds.center);
	this.settingsGroup.visible = isVisible;
	this.uiGroup.addChildren([this.alertGroup, this.settingsGroup]);

}


UIControls.prototype.doUpdates = function (delta_t) {
		if (this.scrollingX != 0 || this.scrollingY != 0) {
			this.scrollDisplay(new Point(this.scrollingX,this.scrollingY));
			this.scrollingX *= viewport.controller.config.scrollRate;
			this.scrollingY *= viewport.controller.config.scrollRate;
		}
		if (this.zoomingIn != 0) {
			this.zoomingIn -= 1;
			if (this.zoomingIn == 0) {viewport.zoomIn(); this.zoomingIn = 3;}
		}
		if (this.zoomingOut != 0) {
			this.zoomingOut -= 1;
			if (this.zoomingOut == 0) {viewport.zoomOut(); this.zoomingOut = 3;}
		}

		maxStrLen = Math.floor(((paper.view.size.width - this.navGroup.bounds.width - 45)/Math.ceil(viewport.controller.config.alertListFontSize*0.56)));

		al = Array.from(viewport.alertList);
		al.reverse();
		for (i = 0; i < al.length; i++) {
			if (al[i] != null) {
				tempStr = new Date(al[i].alertTime).toUTCString() + "[" + al[i].type + "] " + al[i].src.ip
				if ((al[i].src.offmap || viewport.controller.config.showLocalLabels) && al[i].src.label != "") tempStr += " (" + al[i].src.label + ")"
				tempStr += "-> " + al[i].dst.ip;
				if ((al[i].dst.offmap || viewport.controller.config.showLocalLabels) && al[i].dst.label != "") tempStr += " (" + al[i].dst.label + ")";
				tempStr += " '" + al[i].msg + "'";
				this.alertListLines[i].content = tempStr.substring(0,maxStrLen);
			}
		}

		//Get connection update date for control panel
		this.connectionText.content = "Last update: " + new Date(viewport.controller.lastUpdate).toUTCString();


		//Fade or Unfade UI
		if (this.fading < 0) {
			this.fading += delta_t;
			if (this.fading > 0) this.fading = 0;
			if (this.fading == 0) {
				this.uiGroup.opacity = .1;
			} else {
				if (this.fading >= (-1)*(this.uiFadeRate)) this.uiGroup.opacity -= ((this.uiGroup.opacity - .1)/this.uiFadeRate) * (this.uiFadeRate - ((-1) * this.fading));
			}
		} else if (this.fading > 0) {
			this.fading -= delta_t;
			if (this.fading < 0) this.fading = 0;
			if (this.fading == 0) {
				this.uiGroup.opacity = 1;
			} else {
				if (this.fading <= (this.uiFadeRate)) this.uiGroup.opacity += ((1 - this.uiGroup.opacity)/this.uiFadeRate) * (this.uiFadeRate - this.fading);
			}
		} else {
			//fix the opacity if its wrong
			if (this.pinned || this.tempShow) {this.uiGroup.opacity = 1} else {this.uiGroup.opacity = .1;}

		}
		this.uiGroup.bringToFront();


}

UIControls.prototype.scrollDisplay = function (delta) {
	if (viewport != null) viewport.recenter(viewport.xlatMapCoords(viewport.centerX,viewport.centerY)-delta);
}

UIControls.prototype.fadeOut = function (delay) {
	//If pinned, ignore it
	if (this.pinned == false) {

		this.tempShow = false;

		//if already fading out or done, leave it alone
		if (this.fading >= 0) {
			//if it hasn't started fading in yet, reset to 0
			if (this.fading >= this.uiFadeRate) {
				this.fading = 0;
			} else {
				this.fading = (-1) * (this.uiFadeRate + delay);
			}
		}
	}
}

UIControls.prototype.fadeIn = function (delay) {
	//If pinned, ignore it
	if (this.pinned == false) {

		this.tempShow = true;

		//if already fading in or done, leave it alone
		if (this.fading <= 0) {
			//if it hasn't started fading out yet, reset to 0
			if (this.fading <= (-1) * this.uiFadeRate) {
				this.fading = 0;
			} else {
				this.fading = (this.uiFadeRate + delay);
			}
		}
	}
}


UIControls.prototype.createTitleHeader = function(pos) {

	var myui = this;

	outlineColor = viewport.controller.config.UIOutlineColor;
	fillColor = viewport.controller.config.UIFillColor;
	t = new PointText();
	t.justification = 'center';
	t.fontSize = viewport.controller.config.logoFontSize;
	t.fillColor = outlineColor;
	t.content = " " + viewport.controller.config.logoText + " ";
	t.opacity = .9;
	t.onMouseDown = function(event) {if (myui.alertGroup.visible) myui.alertGroup.visible = false; else myui.alertGroup.visible = true;}

	b = new Path.Rectangle(t.bounds, 10);
	b.strokeColor = outlineColor;
	b.fillColor = fillColor;
	b.opacity = .5;
	b.onMouseDown = function(event) {if (myui.alertGroup.visible) myui.alertGroup.visible = false; else myui.alertGroup.visible = true;}
	myui = this;
	b.on("mouseenter",function (){myui.fadeIn(0);});
	b.on("mouseleave",function (){myui.fadeOut(1);});

	titleGroup = new Group([t,b]);
	titleGroup.position = pos;
	return titleGroup;

}

UIControls.prototype.createNavButtons = function(pos) {

	var myui = this;

	buttonOutlineColor = viewport.controller.config.UIOutlineColor;
	buttonFillColor = viewport.controller.config.UIFillColor;

	csym1 = new Path.Circle(new Point(0,0),5);
	csym1.strokeColor = buttonOutlineColor;
	csym1.strokeWidth = 2;
	csym1.opacity = .8;
	csym2 = new Path.Rectangle(new Point(0,0),new Point(2,16));
	csym2.fillColor = buttonOutlineColor;
	csym2.opacity = .8;
	csym2.position = csym1.position;
	csym3 = new Path.Rectangle(new Point(0,0),new Point(16,2));
	csym3.fillColor = buttonOutlineColor;
	csym3.opacity = .8;
	csym3.position = csym1.position;

	csym = new Group([csym1,csym2,csym3]);

	c1 = new Path.Circle(new Point(0,0),15);
	c1.strokeColor = buttonOutlineColor;
	c1.fillColor = buttonFillColor;
	c1.opacity = .5;
	c1.onMouseDown = function(event) {if (viewport != null) viewport.recenter(viewport.xlatMapCoords(viewport.mapWidth/2,viewport.mapHeight/2)); this.fillColor.brightness = 1;}
	c1.onMouseUp = function(event) {this.fillColor.brightness = .85;}
	c1.onMouseEnter = function(event) {this.fillColor.brightness = .85;myui.fadeIn(0);}
	c1.onMouseLeave = function(event) {this.fillColor.brightness = .7;myui.fadeOut(1);}
	csym.position = c1.position;
	c = new Group([csym, c1]);

	zisym = new PointText();
	zisym.justification = 'center';
	zisym.fontSize = 28;
	zisym.fillColor = buttonOutlineColor;
	zisym.content = "+";
	zisym.opacity = .8;
	zi = new Path.Circle(new Point(-40,-40),15);
	zi.strokeColor = buttonOutlineColor;
	zi.fillColor = buttonFillColor;
	zi.opacity = .5;
	zi.onMouseDown = function(event) {myui.zoomingIn = 3; this.fillColor.brightness = 1;}
	zi.onMouseUp = function(event) {myui.zoomingIn = 0;this.fillColor.brightness = .85;}
	zi.onMouseEnter = function(event) {this.fillColor.brightness = .85;myui.fadeIn(0);}
	zi.onMouseLeave = function(event) {myui.zoomingIn = 0; this.fillColor.brightness = .7;myui.fadeOut(1);}
	zisym.position = zi.position;
	zplus = new Group([zisym,zi]);

	zosym = new PointText();
	zosym.justification = 'center';
	zosym.fontSize = 28;
	zosym.fillColor = buttonOutlineColor;
	zosym.content = "-";
	zosym.opacity = .8;
	zo = new Path.Circle(new Point(40,-40),15);
	zo.strokeColor = buttonOutlineColor;
	zo.fillColor = buttonFillColor;
	zo.opacity = .5;
	zo.onMouseDown = function(event) {myui.zoomingOut = 3; this.fillColor.brightness = 1;}
	zo.onMouseUp = function(event) {myui.zoomingOut = 0;this.fillColor.brightness = .85;}
	zo.onMouseEnter = function(event) {this.fillColor.brightness = .85;myui.fadeIn(0);}
	zo.onMouseLeave = function(event) {myui.zoomingOut = 0; this.fillColor.brightness = .7;myui.fadeOut(1);}
	zosym.position = zo.position;
	zminus = new Group([zosym,zo]);

	hisym1 = new Path.Rectangle(new Point(0,0),new Point(12,2));
	hisym1.fillColor = buttonOutlineColor;
	hisym1.opacity = .8;
	hisym2 = new Path.Rectangle(new Point(3,3),new Point(9,7));
	hisym2.fillColor = buttonOutlineColor;
	hisym2.opacity = .8;
	hisym3 = new Path.Rectangle(new Point(0,8),new Point(12,10));
	hisym3.fillColor = buttonOutlineColor;
	hisym3.opacity = .8;
	hisym4 = new Path.Rectangle(new Point(5,11),new Point(7,19));
	hisym4.fillColor = buttonOutlineColor;
	hisym4.opacity = .8;

	hisym = new Group([hisym1,hisym2,hisym3, hisym4]);
	hi = new Path.Circle(new Point(40,40),15);
	hi.strokeColor = buttonOutlineColor;
	hi.fillColor = buttonFillColor;
	hi.opacity = .5;
	hi.onMouseDown = function(event) {if (myui.pinned) {myui.pinned=false; myui.fadeOut(0);hisym.rotate(-90);} else {myui.fadeIn(0); myui.pinned=true;hisym.rotate(90);}; this.fillColor.brightness = 1;}
	hi.onMouseUp = function(event) {this.fillColor.brightness = .85;}
	hi.onMouseEnter = function(event) {this.fillColor.brightness = .85;myui.fadeIn(0);}
	hi.onMouseLeave = function(event) {myui.zoomingIn = 0; this.fillColor.brightness = .7;myui.fadeOut(1);}
	hisym.position = hi.position;
	hider = new Group([hisym,hi]);

	setsym1 = new Path.Rectangle(new Point(0,0),new Point(12,2));
	setsym1.fillColor = buttonOutlineColor;
	setsym1.opacity = .8;
	setsym2 = new Path.Rectangle(new Point(0,5),new Point(12,7));
	setsym2.fillColor = buttonOutlineColor;
	setsym2.opacity = .8;
	setsym3 = new Path.Rectangle(new Point(0,10),new Point(12,12));
	setsym3.fillColor = buttonOutlineColor;
	setsym3.opacity = .8;

	setsym = new Group([setsym1,setsym2,setsym3]);
	setb = new Path.Circle(new Point(-40,40),15);
	setb.strokeColor = buttonOutlineColor;
	setb.fillColor = buttonFillColor;
	setb.opacity = .5;
	setb.onMouseDown = function(event) {this.fillColor.brightness = 1;if (myui.settingsGroup.visible) myui.settingsGroup.visible = false; else myui.settingsGroup.visible = true;}
	setb.onMouseUp = function(event) {this.fillColor.brightness = .85;}
	setb.onMouseEnter = function(event) {this.fillColor.brightness = .85	}
	setb.onMouseLeave = function(event) {myui.zoomingIn = 0; this.fillColor.brightness = .7;myui.fadeOut(1);}
	setsym.position = setb.position;
	settings = new Group([setsym,setb]);


	u = new Path.RegularPolygon(new Point(0,-30),3,20);
	u.strokeColor = buttonOutlineColor;
	u.fillColor = buttonFillColor;
	u.opacity = .5;
	u.onMouseDown = function(event) {myui.scrollingY = 1; this.fillColor.brightness = 1;}
	u.onMouseUp = function(event) {myui.scrollingY = 0; this.fillColor.brightness = .85;}
	u.onMouseEnter = function(event) {this.fillColor.brightness = .85;myui.fadeIn(0);}
	u.onMouseLeave = function(event) {myui.scrollingY = 0; this.fillColor.brightness = .7;myui.fadeOut(1);}

	l = u.clone();
	l.position = new Point(-35,0);
	l.rotate(-90);
	l.onMouseDown = function(event) {myui.scrollingX = 1; this.fillColor.brightness = 1;}
	l.onMouseUp = function(event) {myui.scrollingX = 0; this.fillColor.brightness = .85;}
	l.onMouseEnter = function(event) {this.fillColor.brightness = .85;myui.fadeIn(0);}
	l.onMouseLeave = function(event) {myui.scrollingX = 0; this.fillColor.brightness = .7;myui.fadeOut(1);}

	r = u.clone();
	r.position = new Point(35,0);
	r.rotate(90);
	r.onMouseDown = function(event) {myui.scrollingX = -1; this.fillColor.brightness = 1;}
	r.onMouseUp = function(event) {myui.scrollingX = 0; this.fillColor.brightness = .85;}
	r.onMouseEnter = function(event) {this.fillColor.brightness = .85;myui.fadeIn(0);}
	r.onMouseLeave = function(event) {myui.scrollingX = 0; this.fillColor.brightness = .7;myui.fadeOut(1);}

	d = u.clone();
	d.position = new Point(0,35);
	d.rotate(180);
	d.onMouseDown = function(event) {myui.scrollingY = -1; this.fillColor.brightness = 1;}
	d.onMouseUp = function(event) {myui.scrollingY = 0; this.fillColor.brightness = .85;}
	d.onMouseEnter = function(event) {this.fillColor.brightness = .85;myui.fadeIn(0);}
	d.onMouseLeave = function(event) {myui.scrollingY = 0; this.fillColor.brightness = .7;myui.fadeOut(1);}

	navGroup = new Group([u,l,r,d,c,zplus,zminus, hider, settings]);
	navGroup.position = pos;
	return navGroup;

}

UIControls.prototype.createAlertList = function(pos) {

	outlineColor = viewport.controller.config.UIOutlineColor;
	fillColor = viewport.controller.config.UIFillColor;
	t = new PointText();
	t.justification = 'left';
	t.fontSize = viewport.controller.config.alertListFontSize+4;
	t.fillColor = outlineColor;
	t.content = " Latest Alerts ";
	t.opacity = .8;
	t.on("mouseenter",function (){myui.fadeIn(0);});
	t.on("mouseleave",function (){myui.fadeOut(1);});

	spacer = new Path.Rectangle(new Point(0,0),new Point(paper.view.size.width - this.navGroup.bounds.width - 40,0));
	alertGroup = new Group([spacer,t]);
	t.position = spacer.position;
	b = new Path.Rectangle(alertGroup.bounds, 10);
	b.strokeColor = outlineColor;
	b.fillColor = fillColor;
	b.opacity = .9;
	b.on("mouseenter",function (){myui.fadeIn(0);});
	b.on("mouseleave",function (){myui.fadeOut(1);});

	alertGroup.addChild(b);
	b.sendToBack();
	this.alertBox1 = b;
	spacer.remove();

	spacer = new Path.Rectangle(new Point(0,0),new Point(paper.view.size.width - this.navGroup.bounds.width - 40,0));
	alertLineGroup = new Group([spacer]);
	for (i = 0; i < this.alertListLines.length; i++) {
		l = new PointText();
		l.justification = 'left';
		l.fontSize = viewport.controller.config.alertListFontSize;
		l.fontFamily= 'monospace';
		l.fillColor = outlineColor;
		l.content = "          ";

		l.opacity = .8;
		l.on("mouseenter",function (){myui.fadeIn(0);});
		l.on("mouseleave",function (){myui.fadeOut(1);});

		alertLineGroup.addChild(l);
		l.position = new Point(l.bounds.width/2 + 10,((l.bounds.height + 5)*i)+10);
		this.alertListLines[i] = l;
	}

	b = new Path.Rectangle(alertLineGroup.bounds, 10);
	b.position = alertLineGroup.position;
	b.strokeColor = outlineColor;
	b.fillColor = fillColor;
	b.opacity = .9;
	b.on("mouseenter",function (){myui.fadeIn(0);});
	b.on("mouseleave",function (){myui.fadeOut(1);});

	alertLineGroup.addChild(b);
	b.sendToBack();
	this.alertBox2 =b;
	spacer.remove();

	alertGroup.addChild(alertLineGroup);
	alertLineGroup.position = t.position + new Point(0,(alertLineGroup.bounds.height/2) + 20);
	alertGroup.position = pos;
	return alertGroup;

}

UIControls.prototype.createControlPanel = function(pos) {

	outlineColor = viewport.controller.config.UIOutlineColor;
	fillColor = viewport.controller.config.UIFillColor;
	t = new PointText();
	t.justification = 'left';
	t.fontSize = viewport.controller.config.alertListFontSize+4;
	t.fillColor = outlineColor;
	t.content = " Settings ";
	t.opacity = 1;
	t.on("mouseenter",function (){myui.fadeIn(0);});
	t.on("mouseleave",function (){myui.fadeOut(1);});

	spacer = new Path.Rectangle(new Point(0,0),new Point(800,0));
	settingsGroup = new Group([spacer,t]);
	t.position = spacer.position;
	b = new Path.Rectangle(settingsGroup.bounds, 10);
	b.strokeColor = outlineColor;
	b.fillColor = fillColor;
	b.opacity = 1;
	b.on("mouseenter",function (){myui.fadeIn(0);});
	b.on("mouseleave",function (){myui.fadeOut(1);});

	settingsGroup.addChild(b);
	b.sendToBack();
	this.settingsBox1 = b;
	spacer.remove();

	b = new Path.Rectangle(new Point(0,0),new Point(800,600),10);
	b.position = t.position + new Point(0,b.bounds.size.height/2 + t.bounds.size.height/2 + 10);
	b.strokeColor = outlineColor;
	b.fillColor = fillColor;
	b.opacity = 1;
	b.on("mouseenter",function (){myui.fadeIn(0);});
	b.on("mouseleave",function (){myui.fadeOut(1);});
	settingsGroup.addChild(b);

	this.settingsBox2 =b;

	t = new PointText();
	t.justification = 'left';
	t.fontSize = viewport.controller.config.alertListFontSize+4;
	t.fillColor = outlineColor;
	t.content = "Available Maps";
	t.opacity = 1;
	t.position = b.bounds.topCenter + new Point(0,(t.bounds.size.height/2) + 20);
	settingsGroup.addChild(t);

	counter = 0;
	viewport.controller.config.maps.forEach(function(value, key) {

		x = new PointText();
		x.justification = 'left';
		x.fontSize = viewport.controller.config.alertListFontSize+4;
		x.fillColor = outlineColor;
		x.content = key;
		x.opacity = 1;
		x.on("mouseenter",function (){myui.fadeIn(0);});
		x.on("mouseleave",function (){myui.fadeOut(1);});
		x.on("mousedown",function (){viewport.reloadMap(key);});
		settingsGroup.addChild(x);

		y = new Path.Rectangle(new Point(100,0),new Point(700,30), 10);
		y.position = b.bounds.topCenter + new Point(0,(y.bounds.size.height/2) + (t.bounds.size.height) + (counter * 35) + 30);
		x.position = y.position;
		y.strokeColor = outlineColor;
		y.fillColor = fillColor;
		y.opacity = 1;
		y.fillColor.brightness = .6;
		y.on("mouseenter",function (){myui.fadeIn(0);this.fillColor.brightness = .75;});
		y.on("mouseleave",function (){myui.fadeOut(1);this.fillColor.brightness = .6;});
		y.on("mousedown",function (){viewport.reloadMap(key);this.fillColor.brightness = .9;});
		y.on("mouseup",function (){this.fillColor.brightness = .75;});
		settingsGroup.addChild(y);
		x.bringToFront();
		counter++;

	});

	t = new PointText();
	t.justification = 'left';
	t.fontSize = viewport.controller.config.alertListFontSize+4;
	t.fillColor = outlineColor;
	t.content = "Last Update: Never";
	t.opacity = 1;
	t.position = b.bounds.bottomLeft + new Point((t.bounds.size.width/2) + 10,-10 - (t.bounds.size.height/2));
	this.connectionText = t;
	settingsGroup.addChild(t);

	settingsGroup.position = pos;
	return settingsGroup;

}


//MAIN ROUTINE
function init()
{
    canvas = document.getElementById("myCanvas");
}



var viewport = null;
var ui = null;
asyncStart();


function asyncStart() {
	if (alertMapController.loaded) {
		init();
		viewport = new Viewport(alertMapController);
		ui = new UIControls();
		ui.init();
	} else {
		setTimeout(asyncStart, 10);
	}
}

function asyncRestart() {
	if (alertMapController.loaded) {
		viewport = new Viewport(alertMapController);
		ui = new UIControls();
		ui.init();
	} else {
		setTimeout(asyncStart, 10);
	}
}



function onFrame(event) {


		if (viewport != null) viewport.process(event.delta);
		if (ui != null) ui.doUpdates(event.delta);

}

function onMouseDrag(event) {
	if (viewport != null) ui.scrollDisplay(event.delta);
}

function onKeyDown(event) {
	if (event.key == 'z') if (viewport != null) viewport.zoomIn();
	if (event.key == 'x') if (viewport != null) viewport.zoomOut();
}


