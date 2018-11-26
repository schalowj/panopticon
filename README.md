# Panopticon v1.0 ALPHA
A HTML5-based IDS alert visualization tool

**A note from the author:**
> The 'ALPHA' designator should be a hint that this code, though working,
> is not quite ready for prime time.
>
> It was written in a caffeine fueled haze, while avoiding my family over the
> Thanksgiving holiday. The Javascript especially looks like garbage (partially because of me and partially because it is javascript).
>
> Did I mention that I really hate javascript? Sigh.

## Overview

Panopticon is intended to provide a visual map display capability for IDS (or other) alerts...similar to those vendor animated threat map sites that everyone has running in their SOC. But useful.

It is a cherrypy-based web server with an HTML5 (paper.js) front-end map display ("Oh, the colors!"). It is able to receive JSON alerts via a simple HTTP API from something like Logstash. It then feeds them to anyone watching the alert map in their browser (or on the 'big screen' in the SOC).

## Installation

Panopticon is written in *Python 3* and both that *cherrypy*. The included scripts for generating test alerts also require *requests*.

Eventually, it will be available via *pip*, but today...copy and run any way you can run a CherryPY server. The most straight-forward:

    cd /wherever/you/put/the/files
    python panopticon.py  (or python3 panopticon.py if you are on a Linux distro that is trying to have both Python 3 and 2.7)
 
 Of course, you can get fancy and daemonize it, etc. like any other *cherrypy* app. Look at the instructions in the CherryPY docs.

## Configuration

The configuration file is in the config directory (really!): `panopticon.conf`

### TODO

- [ ] Add a better description of the config file

Short version is that what you care about are the maps and feeds.

Feeds first: there is a **`[Feeds]`** section in the config file. The default config has two feed names listed under the **`feeds`** entry. You need at least one. Each one repesents a seperate alert feed...give them unique names. Alerts are sent to a feed, and maps can be configured to receive from multiple feeds (see below). All you need are names and the app takes care of the rest. Simple.

The map configs are less simple. The uglyish pythony, JSON-y stuff in the **`[Maps]`** section defines each alert map that will be available. The default config comes with two sample maps, so ctrl-c, ctrl-v. The **`defaultMap`** entry defines which one displays by default and it must exactly match the **`name`** field of one of the maps.

The elements of each of the **`maps`** entries (its a list) are as follows:

**`"name"`** - the unique, displayable map name

**`"map_url`** - the name of the image that will be used. It must reside in the `images` directory

**`"feeds"`** - an array consisting of the list of feeds (see above) that will display on this map

The **`"regions"`** array has a bit more structure:
 
For each region **`"x1"`**, **`"y1"`**, **`"x2"`** and **`"y2"`** are the coordinates (in the dimensions of your chosen image file) of a rectangular region that will be used to plot one or more ranges of IP enpoints. **`"name"`** is a label that isn't really used anywhere at present, so don't stress about it.

Each regios has an array of **`"ipranges"`**. The **`"start"`** and **`"end"`** values indicate a range of IPs that will be considered to be included in the region (and put there).

Regions can overlap. They are evaluated from top to bottom, with the IP falling in the first one it matches.

The `[Client]` section has a many more cleint disply config items, both obvious and obscure ("Change all the colors!"). The most useful is the **`RefreshRate`** setting...this controls how often (in milliseconds) the client will attempt to get data from the server. Change for your needs. Also `logoText` will let you put a little of your own branding on it.

As for how to get things sent to it...that on you. Try the HTTP Output plugin in Logstash if you are using that. Or be creative. See below for a way to gin up some test alerts to make sure its working.

Don't mess with the server config stuff like `[/]`. See the comment there. Unless you want to break it. Or re-write it. In that case, pull-request FTW.

## Operation

The GUI is fairy simple. Drag the map around, or use the triangle shaped arrow buttons on the lower right to scroll around. This is more useful if you are zoomed in (using the round (+) icon or the z key on the keyboard). You can zoom out with the round (-) icon or the x key. 

The other two round icons in the navigation are operate as follows: the one with the tack icon fades the GUI elements out for a better view of your awesome map. If you mous over them they will temporarily re-appear. Click the icon again to re-pin them. The one with the 'univeral settings symbol' is...settings. It beings up a settings box where you can select another map (currently the only setting available in the GUI).

Clicking on the logo on the top left will show a running display of the last few alerts in text form (five by default, but you can change that in the config file (`alertListSize`). Click the logo again to make it go away.

### Generating Test Alerts

So your map is all pretty and blank. You just broke logstash by trying to edit its byzantine config file.

You want to see some alerts.

All is not lost.

There are two scripts: sendAlert.py and randomAlerts.py in the Panopticon root directory.
  
The first (`sendAlert.py`) will send a single alert:

```  
  usage: sendAlert.py [-h] url feed src dst

positional arguments:
  url         Panopticon alert API URL
  feed        Panopticon feed name
  src         Source address for alert
  dst         Destination address for alert

optional arguments:
  -h, --help  show this help message and exit
```

and the second (`randomAlerts.py') will send repeating random alerts:

```
usage: randomAlerts.py [-h] url feed from_ip to_ip rate

positional arguments:
  url         Panopticon alert API URL
  feed        Panopticon feed name
  from_ip     Start of IP range for alerts
  to_ip       End of IP range for alerts
  rate        Alert rate in milliseconds

optional arguments:
  -h, --help  show this help message and exit
  ```

They can be copied to and run from any machine with Python (and the Requests library) installed. This will allow you to check your connectivity and map configurations.
