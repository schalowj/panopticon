#!/usr/bin/env python
# -*- coding: utf-8 -*-
#
#  sendAlert.py
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
import json
import requests
from datetime import datetime
import argparse

def main(args):
	parser = argparse.ArgumentParser()
	parser.add_argument("url", help="Panopticon alert API URL")
	parser.add_argument("feed", help="Panopticon feed name")
	parser.add_argument("src", help="Source address for alert")
	parser.add_argument("dst", help="Destination address for alert")
	args = parser.parse_args()
	
	alertdata = {"feed":args.feed,"src":args.src, "dst":args.dst, "time":datetime.utcnow().isoformat(), "type":"Test Alert", "msg":"Test alert from sendAlert.py", "src_label":"", "dst_label":""}
	r = requests.post(args.url, json=alertdata)
	print (r.text)

if __name__ == '__main__':
    import sys
    sys.exit(main(sys.argv))
if __name__ == '__main__':
    import sys
    sys.exit(main(sys.argv))
