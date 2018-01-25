# visFramework

This readme contains information on how to build and run the framework. You can find the full documentation in [/docs/documentation.md](./docs/documentation.md).

1. [visFramework](#visframework)
    1. [Building](#building)
    2. [Running on a Single Device](#running-on-a-single-device)
    3. [Running for Multiple Devices](#running-for-multiple-devices)
    4. [Sharing a Session via Share Button and Connector](#sharing-a-session-via-share-button-and-connector)
    5. [Usage](#usage)
    6. [Authors](#authors)
    7. [License](#license)

## Building

This is optional, the development version (not minified) works without building.

1. Install [Node.js](https://nodejs.org/en/)
2. Run `npm install`
3. For building a development version of the library run `npm run build:development`
4. For building a minified version of the library run `npm run build:production`

If you added or removed any files, you need to make sure that the [build.js file](./scripts/build.js) contains all JavaScript files!

## Running on a Single Device

Open [index.html](./index.html) for the development version or [index_production.html](./index_production.html) for the production version with a web browser.

## Running for Multiple Devices

If you want to display views on separate devices, you have to start the included websocket server via `npm start`. The server runs on port 80 by default, you can configure this in [pakcage.json](./package.json)

The main part of the framework with the toolbar is then available on the local machine at [http://127.0.0.1/?channel=1](http://127.0.0.1/?channel=1).

Now choose a data provider, simulation and the visFramework as visualization to display any data.

In another browser tab or on another device you can now access any of the currently displayed views via `http://<ipaddress>/?channel=1#<viewname>` (example: [http://127.0.0.1/?channel=1#filterInfo](http://127.0.0.1/?channel=1#filterInfo)).

## Sharing a Session via Share Button and Connector (deactivated in example)

For this feature the framework must be served via a Node.js server.

1. Make sure that all Node.js modules are installed (`npm install` in the project root)
2. Start the server with `npm start`
3. In the session you want to share, press the share button on the right side of the toolbar
4. On a second client choose the *Synchronized VF-Clients* connector

## Usage

Information on the usage is shown on a help page. Click the `(?)` button on the top-right or select `(?) Help & Information` from the menu if the page is shown in a narrow viewport.

Help for a view is shown when hovering, clicking or tapping the view's title.

## Authors

Authors of this project (comprising ideas, architecture, and code) are:

* Robert Krueger <robert.krueger@vis.uni-stuttgart.de>
* Sebastian Alberternst <sebastian.alberternst@dfki.de>
* Frank Heyen <frank.heyen@outlook.de>
* Jakub Krawczuk <jakubkrawczuk@gmail.com>
* Salvatore Rinzivillo <rinzivillo@isti.cnr.it>
* Simon Kaier <simon.stins@gmail.com>
* Rezzakul Haider <safat_111@yahoo.com>

This project and code was mainly developed by:

* [USTUTT](https://www.uni-stuttgart.de/en/index.html) - University of Stuttgart, Institute for Visualization and Interactive Systems
* [DFKI](https://www.dfki.de/web?set_language=en&cl=en) - German Research Center for Artificial Intelligence

Parts of the project and code were developed as part of the [EU H2020](https://ec.europa.eu/programmes/horizon2020/) [project](https://www.cimplex-project.eu/) *CIMPLEX* - Bringing *CI*tizens, *M*odels and Data together in *P*articipatory, Interactive Socia*L* *EX*ploratories.

Futher partners that deliver data and simulations via webservice access are:

* ETHZ (ETH Zurich)
* UCL (University College of London)
* Közép-európai Egyetem (Central European University, CEU)
* ISI (Fondazione Istituto per l'Interscambio Scientifico)
* CNR (National Research Council)
* FBK (Bruno Kessler Foundation)

## Client External Dependencies

The table below lists all used external libraries and their respective uses in the client.

| Name                                                         | Used for                                                      | License \*                                                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [Bootstrap](http://getbootstrap.com/)                        | general page layout                                           | [MIT License](https://github.com/twbs/bootstrap/blob/master/LICENSE)                               |
| [Colorbrewer](http://colorbrewer2.org/)                      | color palettes that are used in color mapping                 | [Apache License 2.0](https://github.com/axismaps/colorbrewer/blob/master/LICENCE.txt)              |
| [Crossfilter](https://github.com/crossfilter/crossfilter/)   | data filtering                                                | [Apache License 2.0](https://github.com/crossfilter/crossfilter/blob/master/LICENSE)               |
| [d3 v3](https://d3js.org/)                                   | utility functions, scaling, interaction, colors and timeline. | [BSD 3-clause "New" or "Revised" License](https://github.com/d3/d3/blob/master/LICENSE)            |
| [d3 v4](https://d3js.org/)                                   | updated packages for some functionality                       | [BSD 3-clause "New" or "Revised" License](https://github.com/d3/d3/blob/master/LICENSE)            |
| [d3forcebundle](https://github.com/upphiminn/d3.ForceBundle) | force directed edge bundling with d3                          | [GNU General Public License v2.0](https://github.com/upphiminn/d3.ForceBundle/blob/master/LICENSE) |
| [Font Awesome](http://fontawesome.io/)                       | icons                                                         | [SIL OFL 1.1 (font), MIT License (code)](http://fontawesome.io/license/)                           |
| [gLayers](https://github.com/Sumbera/gLayers.Leaflet)        | canvas Layer for Leaflet                                      | [MIT License](https://github.com/Sumbera/gLayers.Leaflet/blob/master/LICENSE.TXT)                  |
| [jLouvain](https://github.com/upphiminn/jLouvain)            | community detection                                           | [MIT License](https://github.com/upphiminn/jLouvain/blob/master/LICENSE)                           |
| [jQuery](https://jquery.com/)                                | HTTP requests and DOM manipulation                            | [MIT License](https://jquery.org/license/)                                                         |
| [Leaflet](https://github.com/Leaflet/Leaflet)                | geographic map                                                | [BSD 2-clause "Simplified" License](https://github.com/Leaflet/Leaflet/blob/master/LICENSE)        |
| [Mustache](https://github.com/mustache/mustache.github.com)  | HTML logic-less templates                                     | [MIT License](https://github.com/mustache/mustache.github.com/blob/master/LICENSE.md)              |
| [Sortable](https://github.com/RubaXa/Sortable)               | view drag and drop to reorder views                           | [MIT License](https://github.com/RubaXa/Sortable)                                                  |
| [inflection.js](https://code.google.com/p/inflection-js/)    | word inflection                                               | [MIT License](https://code.google.com/archive/p/inflection-js/)                                    |
| [cimplex-decoder](https://github.com/cimplex-project/cimplex-decoder) | a decoder library for cimplex services | [Apache License 2.0](https://github.com/cimplex-project/cimplex-decoder/blob/master/LICENSE) 
| [cimplex-globe](https://github.com/cimplex-project/cimplex-globe) | a library for visualizing data on the globe | [Apache License 2.0](https://github.com/cimplex-project/cimplex-globe/blob/master/LICENSE) 
| [socket.io](https://socket.io/) | Socket.IO enables real-time bidirectional event-based communication. | [MIT License](https://github.com/socketio/socket.io/blob/master/LICENSE) 

\* *as of 2018-01-22*

## Server External Dependencies

The table below lists all used external libraries and their respective uses in the server.

| Name                                                         | Used for                                                      | License \*                                                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [socket.io](https://socket.io/) | Socket.IO enables real-time bidirectional event-based communication. | [MIT License](https://github.com/socketio/socket.io/blob/master/LICENSE) 
| [express](https://github.com/expressjs/express) | Fast, unopinionated, minimalist web framework for node.  | [MIT License](https://github.com/expressjs/express/blob/master/LICENSE) 
| [uuid](https://github.com/kelektiv/node-uuid) | Fast, unopinionated, minimalist web framework for node.  | [MIT License](https://github.com/kelektiv/node-uuid/blob/master/LICENSE.md) 
| [ws](https://github.com/websockets/ws) | imple to use, blazing fast and thoroughly tested WebSocket client and server for Node.js | [MIT License](https://github.com/websockets/ws/blob/master/LICENSE) 

\* *as of 2018-01-24*

## Tile providers used in example

* Tileset light_gray, light_gray(no labels), dark and dark(no labels) &copy; [OpenStreetMap](http://www.openstreetmap.org/copyright) &copy [CartoDB](http://cartodb.com/attributions)
* Tileset sattelite &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, 
	IGP, UPR-EGP, and the GIS User Community

## Additional contributions

* countries.json - borders of all countries based on the data by [Natural Earth Data](http://www.naturalearthdata.com/)


## License

See [LICENSE](./LICENSE).
