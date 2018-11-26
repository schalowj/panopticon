#!/usr/bin/env python
# -*- coding: utf-8 -*-
#
#  panopticon.py
#  
#  Copyright 2018 J.A. Schalow <schalowj@gmail.com>
#  
#  This program is free software; you can redistribute it and/or modify
#  it under the terms of the GNU General Public License as published by
#  the Free Software Foundation; either version 2 of the License, or
#  (at your option) any later version.
#  
#  This program is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#  
#  You should have received a copy of the GNU General Public License
#  along with this program; if not, write to the Free Software
#  Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston,
#  MA 02110-1301, USA.
#  
#  
import os, os.path
import datetime
import cherrypy


class Panopticon(object):

		
	def __init__(self):
		self.feedlist = {};
			
	@cherrypy.expose
	def index(self):
		if cherrypy.request.app.config['Panopticon']['useMinifiedJS'] == True:
			paper_url = 'paper-full.min.js'
			mainjs_url = 'panopticon-main.min.js'
			uijs_url = 'panopticon-ui.min.js'
		else:
			paper_url = 'paper-full.js'
			mainjs_url = 'panopticon-main.js'
			uijs_url = 'panopticon-ui.js'		
		return '''
<!DOCTYPE html>
<html>
<head>
	<style type="text/css">
	html,
	body {
		margin: 0;
		overflow: hidden;
		height: 100%;
	}

	/* Scale canvas with resize attribute to full size */
	canvas[resize] {
		width: 100%;
		height: 100%;
	}
	</style>
	<title>Panopticon</title>
</head>
<body bgcolor="#000000">
	<canvas id="myCanvas" resize="true" data-paper-resize="true"></canvas>
<!-- Load the main.js -->
<script type="text/javascript" src="js/''' + mainjs_url + '''"></script>
<!-- Load the Paper.js library -->
<script type="text/javascript" src="js/''' + paper_url + '''"></script>
<!-- Load external PaperScript and associate it with myCanvas -->
<script type="text/paperscript" src="js/''' + uijs_url + '''" canvas="myCanvas">
</script>
</body>
</html>
'''       
	
	@cherrypy.expose
	@cherrypy.tools.json_out()
	def appconfig(self):
		if len (self.feedlist) == 0:
			for val in cherrypy.request.app.config['Feeds']['feeds']:
				self.feedlist[val] = {"maxid":0,"alerts":[]}	
				
		r = cherrypy.request.app.config['Client'].copy()
		maxids = []
		for key, value in self.feedlist.items():
			maxids.append([key,value["maxid"]])
		r["feedMaxIDs"] = maxids
		return r

	@cherrypy.expose
	@cherrypy.tools.json_out()
	def maps(self):
		return cherrypy.request.app.config['Maps']


	@cherrypy.expose
	@cherrypy.tools.json_out()
	def feed(self,name,sinceID):
		if len (self.feedlist) == 0:
			for val in cherrypy.request.app.config['Feeds']['feeds']:
				self.feedlist[val] = {"maxid":0,"alerts":[]}
		
		if name in self.feedlist:
			out = {}
			out["maxid"] = self.feedlist[name]["maxid"]
			alerts = []
			for value in self.feedlist[name]["alerts"]:
				if value["id"] > int(sinceID):
					alerts.append(value)
			out["alerts"] = alerts
			return out
		else:
			return {"alerts":[],"error":"non-existent feed"}

	@cherrypy.expose
	@cherrypy.tools.json_in()
	@cherrypy.tools.json_out()
	def alert(self):

		if len (self.feedlist) == 0:
			for val in cherrypy.request.app.config['Feeds']['feeds']:
				self.feedlist[val] = {"maxid":0,"alerts":[]}			


		alertData = cherrypy.request.json
		newAlert = {}
		if "feed" in alertData and alertData["feed"] in self.feedlist:
			newAlert["feed"] = alertData["feed"]
		else:
			cherrypy.response.status = 400
			return "Malformed request. Cannot find destination feed."
		if "src" in alertData:
			newAlert["src"] = alertData["src"]
		else:
			cherrypy.response.status = 400
			return "Malformed request. Cannot find source IP."
		if "dst" in alertData:
			newAlert["dst"] = alertData["dst"]
		else:
			cherrypy.response.status = 400
			return "Malformed request. Cannot find destination IP."
		if "src_label" in alertData:
			newAlert["src_label"] = alertData["src_label"]
		else:
			newAlert["src_label"] = ""
		if "dst_label" in alertData:
			newAlert["dst_label"] = alertData["dst_label"]
		else:
			newAlert["dst_label"] = ""
		if "time" in alertData:
			newAlert["time"] = alertData["time"]
		else:
			newAlert["time"] = datetime.utcnow().isoformat()
		if "type" in alertData:
			newAlert["type"] = alertData["type"]
		else:
			newAlert["type"] = datetime.utcnow().isoformat()
		if "msg" in alertData:
			newAlert["msg"] = alertData["msg"]
		else:
			newAlert["msg"] = ""
		self.feedlist[newAlert["feed"]]["maxid"] = self.feedlist[newAlert["feed"]]["maxid"] + 1
		newAlert["id"] = self.feedlist[newAlert["feed"]]["maxid"]
		self.feedlist[newAlert["feed"]]["alerts"].append(newAlert)
		
		while len(self.feedlist[newAlert["feed"]]["alerts"]) > cherrypy.request.app.config['Feeds']['maxAlertStorage']:
			self.feedlist[newAlert["feed"]]["alerts"].pop(0)
		
		return {"Created": str(newAlert["id"])}

def main(args):

	cherrypy.quickstart(Panopticon(),'/',"./config/panopticon.conf")

if __name__ == '__main__':
    import sys
    sys.exit(main(sys.argv))
