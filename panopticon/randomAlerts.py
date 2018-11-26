#!/usr/bin/env python
# -*- coding: utf-8 -*-
#
#  sendRandomAlerts.py
#  
#  Copyright 2018 Schalow <Schalow@DESKTOP-2EGKSS0>
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
import time
import ipaddress
import random
import requests
from datetime import datetime
import argparse

def main(args):
	parser = argparse.ArgumentParser()
	parser.add_argument("url", help="Panopticon alert API URL")
	parser.add_argument("feed", help="Panopticon feed name")
	parser.add_argument("from_ip", help="Start of IP range for alerts")
	parser.add_argument("to_ip", help="End of IP range for alerts")
	parser.add_argument("rate", help="Alert rate in milliseconds")	
	args = parser.parse_args()
	
	min_addr_num = int(ipaddress.ip_address(args.from_ip))
	max_addr_num = int(ipaddress.ip_address(args.to_ip))
	used_addr = []
		
	while True:
		src = ""
		dst = ""
		rand = random.randint(0,len(used_addr) + 1)
		if rand < len(used_addr):
			src = used_addr[rand]
		else:
			snum = random.randint(min_addr_num,max_addr_num)
			src = str(ipaddress.ip_address(snum))
			used_addr.append(src)
		
		while True:
			rand = random.randint(0,len(used_addr) + 1)
			if rand < len(used_addr):
				dst = used_addr[rand]
			else:
				dnum = random.randint(min_addr_num,max_addr_num)
				dst = str(ipaddress.ip_address(dnum))
			if src != dst: 
				used_addr.append(dst)
				break
			
		alertdata = {"feed":args.feed,"src":src, "dst":dst, "time":datetime.utcnow().isoformat(), "type":"Test Alert", "msg":"Test alert from randomAlerts.py", "src_label":"", "dst_label":""}
		r = requests.post(args.url, json=alertdata)
		print ("Alert from " + src + " to " + dst + " result: " + r.text)
		time.sleep(int(args.rate)/1000)
		

if __name__ == '__main__':
    import sys
    sys.exit(main(sys.argv))
if __name__ == '__main__':
    import sys
    sys.exit(main(sys.argv))
