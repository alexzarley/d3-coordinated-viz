//fix alabama topojson
//update basemap to be entire US

(function(){

window.onload = setMap();
//pseudo-global variables
//object of variables used in for loops
var attrObj = {
  "TIDE_M": ["6.01", "4.0999", "1.9999", "0.9999"],
  "SLOPE_PCT": ["0.114999", "0.054999", "0.0349999", "0.021999"],
  "ERR_M_YR": ["1.999", "0.999", "-1.0", "-2.0"],
  "SL_MM_YR_": ["1.799999", "2.499999", "2.9999999", "3.39999999"],
  "GEOM": ["1.1", "2.1", "3.1", "4.1"],
  "WAVES_M": [0.55, 0.85, 1.05, 1.25],
  "CVIRISK": [1.1, 2.1, 2.5, 3.1]
};

var expressed = "CVIRISK"; //initial attribute
//execute script when window is loaded

function setMap() {

    //variables to set background rectangle and make sure nothing selected for zooming by bounding box
    var width = 460,
        height = 460,
        active = d3.select(null);

    //create projection centered on 36N, 88W
    var projection = d3.geo.conicConformal()
        .center([0, 36])//set central coordinates of plane
        .rotate([88, 0, 7])//set central meridian and parallel and rotation degree
        .parallels([29.5, 45.5])//specify standard parallels
        .scale(850)
        .translate([width / 2, height / 2]);

    //generator to draw path of projection
    var path = d3.geo.path()
        .projection(projection);

    //set width and height of svg
    var svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height);

    //create and add rect element
    svg.append("rect")
        .attr("class", "background")
        .attr("width", width)
        .attr("height", height)
        .on("click", reset);

    //variable to be used to append group elements to svg
    var g = svg.append("g");

    //set variable to use queue.js to parallelize asynchronous data loading
    var q = d3_queue.queue();

    //use queue to retrieve data from all files
    q
        .defer(d3.json, "data/CoastStates.topojson")//load coastal states
        .defer(d3.json, "data/Basemap.topojson")//load state outline spatial data
        .await(callback);

    //function called once data has been retrieved from all .defer lines
    function callback(error, coastStatesData, basemapData){

        // console.log(coastCTData);
        // console.log(coastData);
        //convert topojsons into geojson objects; coastLine is an array full of objects
        var coastStates = topojson.feature(coastStatesData, coastStatesData.objects.CoastStates).features,
            basemap = topojson.feature(basemapData, basemapData.objects.Basemap).features;

        //add the coastal states to a group element in SVG
        g.append("g")
            .attr("id", "states")
            .selectAll("path")
            .data(coastStates)
            .enter()
            .append("path")
            .attr("d", path)
            .on("click", clicked);

        //add a path to the coastal states group element
        g.append("path")
            .datum(topojson.mesh(coastStatesData, coastStatesData.objects.CoastStates, function(a, b) { return a !== b; }))
            .attr("id", "state-borders")
            .attr("d", path);

        //add the basemap states to a group element in SVG
        g.append("g")
            .attr("class", "basemap")
            .selectAll(".basemap")
            .data(basemap)
            .enter()
            .append("path")
            .attr("d", path)

        //add a path to basemap states group element
        g.append("path")
            .datum(topojson.mesh(basemapData, basemapData.objects.Basemap, function(a, b) { return a !== b; }))
            .attr("class", "basemap-borders")
            .attr("d", path);

    };

    //function to zoom to the bounds of whichever state is clicked on
    function clicked(d) {
        //conditional so that if you click on state you're already zoomed to, reset function
        //is called to zoom out to original view
        if (active.node() === this) return reset();
        //removes "active" class from previously active state
        active.classed("active", false);
        //sets class of state on which you clicked to "active"
        active = d3.select(this).classed("active", true);

        //extracts the bounds of the path from d, which is datum of state on which you clicked
        var bounds = path.bounds(d),
            dx = bounds[1][0] - bounds[0][0],
            dy = bounds[1][1] - bounds[0][1],
            x = (bounds[0][0] + bounds[1][0]) / 2,
            y = (bounds[0][1] + bounds[1][1]) / 2,
            scale = 0.6 / Math.max(dx / width, dy / height),
            translate = [width / 2 - scale * x, height / 2 - scale * y];

        //sets duration over which the zooming takes place
        g.transition()
            .duration(900)
            .style("stroke-width", 1.5 / scale + "px")
            .attr("transform", "translate(" + translate + ")scale(" + scale + ")");

        //calls fucntion to create choroplethed coastline for state on which you clicked
        drawCoast(d);
    };

    //function to zoom out and reset the map
    function reset(){
        active.classed("active", false);
        active = d3.select(null);

        //sets duration over which the zooming takes place

        g.transition()
            .duration(900)
            .style("stroke-width", "1.5px")
            .attr("transform", "");
    };

    //function to retrieve data for whichever state was clicked
    function drawCoast(d){
        //variable used to access names of topojsons and csvs
        var state = d.properties.State;
        var q = d3_queue.queue();
        //use queue to retrieve data from all files
        q
            .defer(d3.csv, "data/" + state + ".csv")//load attribute data of clicked state
            .defer(d3.json, "data/Coast_" + state + ".topojson")//load coastline of clicked state
            .await(function(error, csvData, coastData){
                stateCallback(error, csvData, coastData, state);//called within anonymous function because other variables (i.e. state) cannot be passed in "await" function
                drawPCP(csvData, path);
            });
    };
    //callback function that actually draws coast once data is retrieved
    function stateCallback(error, csvData, coastData, state){
        //variable used to access filenames
        var stateObj = "Coast_" + state;
        //convert topojsons into geojson objects; coastLine is an array full of objects
        var coastLine = topojson.feature(coastData, coastData.objects[stateObj]).features;

        //join CSV data to GeoJSON enumeration units
        coastLine = joinData(coastLine, csvData);
        //create color scale
        var colorScale = makeColorScale(csvData);
        //draw coast
        setEnumerationUnits (coastLine, svg, path, colorScale);
    };

    //function to create color scale generator
    function makeColorScale(data){
        var colorClasses = [
            "#1A9641",
            "#A6D96A",
            "#FFFFBF",
            "#FDAE61",
            "#D7191C"
        ];
        //create color scale generator
        var colorScale = d3.scale.threshold()
            .domain(attrObj[expressed])
            .range(colorClasses);

        return colorScale;
    };

    //function to join geojson to csv data and return to callback function
    function joinData(coastLine, csvData){
        //loop through csv to assign each set of csv attribute valeus
        for (var i=0; i<csvData.length; i++){
            var csvCoast = csvData[i]; //current stretch of coast
            var csvKey = csvCoast.NEWID //CSV primary key

            //loop through geojson coastlines to find correct stretch of coast
            for (var a=0; a<coastLine.length; a++) {
                var geojsonProps = coastLine[a].properties; //the current coastline's properties
                // console.log(geojsonProps);
                var geojsonKey = geojsonProps.ID; //the ID of the current coastline to join tho CSV attributes

                //when primary keys match, transfer csv data to geojson properties objects
                if (geojsonKey == csvKey) {
                    //assign all attributes and values
                    for (var attr in attrObj) {
                        var val = parseFloat(csvCoast[attr])
                        geojsonProps[attr] = val;
                    };
                };
            };
        };
        return coastLine;
    };

    function choropleth(props, colorScale){
        // console.log(props);
        //checks that attribute value is a number
        var val = parseFloat(props[expressed]);
        // console.log(val);
        // console.log(colorScale);
        // console.log(colorScale(val));
        //if attribute value exists, assign a color; assign gray
        if (val && val != NaN){
            return colorScale(val);
        } else {
            return "#CCC";
        };
    };

    //create coastline enumeration area on map
    function setEnumerationUnits(coastLine, svg, path, colorScale){
        g.append("g")
            .selectAll("path")
            .data(coastLine)
            .enter()
            .append("path")
            .attr("class", function(d){
              return "coast " + d.properties.ID;
            })
            .attr("d", path)
            .style("stroke", function(d){
                return choropleth(d.properties, colorScale);
            });
    };
};


// function drawPCP(csvData){
//     //pcp dimensions
//     var width = 960, height = 200;
//
//     var keys = [], attributes = [];
//     console.log(csvData);
//     //fill keys arrary with all property names
//     for (var key in csvData[0]){
//         keys.push(key);
//     };
//     //variable to make sure values for final two columns of csvs aren't added
//     var length = keys.length - 2
//
//     //fill attributes array with only the attribute names
//     for (var i=3; i<length; i++) {
//         attributes.push(keys[i]);
//     };
//     //create horizontal pcp coordinate generator
//     var coordinates = d3.scale.ordinal()//create an ordinal axis scale
//         .domain(attributes) //horizontally space each axis evenly
//         .rangePoints([0, width]); //set the horizontal width to svg
//
//     var axis = d3.svg.axis() //create axis generator
//         .orient("left"); //orient genreated axis vertically
//
//     //create vertical pcp scale
//     var scales = {}; //object to hold scale generators
//     attributes.forEach(function(att) { //for each attribute
//         scales[att] = d3.scale.linear() //create a linear scale generators
//             .domain(d3.extent(csvData, function(data) {
//                   return +data[att]; //create array of extents
//             }))
//             .range([height, 0]); //set the axis height to SVG Height
//     });
//
//     var line = d3.svg.line(); //create line generators
//
//     //create a new svg element with the above dimensions
//     var pcplot = d3.select("body")
//         .append("svg")
//         .attr("width", width)
//         .attr("height", height)
//         .attr("class", "pcplot")
//         .append("g") //append container element
//         .attr("transform", d3.transform( //change the container size/shate
//               "scale(0.8, 0.6), "+ //shrink
//               "translate(96, 50)")); //move
//
//     var pcpBackground = pcplot.append("rect") //background for the pcpBackground
//         .attr("x", "-30")
//         .attr("y", "-35")
//         .attr("width", "1020")
//         .attr("height", "270")
//         .attr("rx", "15")
//         .attr("ry", "15")
//         .attr("class", "pcpBackground");
//     //add lines
//     var pcpLines = pcplot.append("g")
//         .attr("class", "pcpLines") //class for styling lines
//         .selectAll("path") //prepare for new path elements
//         .data(csvData) //bind data
//         .enter() //create new path for each line
//         .append("path") //append each line path to the container element
//         .attr("id", function(d){
//             return d.NEWID; //id each line by NEWID
//         })
//         .attr("d", function(d) {
//             return line(attributes.map(function(att) {
//                 return [coordinates(att), scales[att](d[att])];
//             }));
//             console.log(d);
//
//         });
//
//     //add axes
//     var axes = pcplot.selectAll(".attribute") // prepare for new elements
//         .data(attributes) //bind data from attribute array
//         .enter()
//         .append("g") //append elements as containers
//         .attr("class", "axes")
//         .attr("transform", function(d) {
//             return "translate("+coordinates(d)+")" //position axes
//         })
//         .each(function(d) {
//             d3.select(this) //select current element
//                 .call(axis.scale(scales[d])
//                     .ticks(0) //no ticks
//                     .tickSize(0) //no ticks
//                 )
//             .attr("id", d) //assign the attribute name as the axis id
//             .style("stroke-width", "5px") //style each axis
//             .on("click", function(){
//                 // sequence(this, csvData);
//             });
//         });
//
//     pcplot.select("#"+expressed)
//           .style("stroke-width", "10px");
// };

//d3fucntion
function drawPCP(csvData, path) {
    var margin = {top: 30, right: 10, bottom: 10, left: 10},
        pcpWidth = 960 - margin.left - margin.right,
        pcpHeight = 300 - margin.top - margin.bottom;

    var x = d3.scale.ordinal().rangePoints([0, pcpWidth], 1),
        y = {},
        dragging = {};

    var line = d3.svg.line(),
        axis = d3.svg.axis().orient("left"),
        background,
        foreground;

    var svg = d3.select("body").append("svg")
        .attr("class", "PCP")
        .attr("width", pcpWidth + margin.left + margin.right)
        .attr("height", pcpHeight + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Extract the list of dimensions and create a scale for each.
    x.domain(dimensions = d3.keys(csvData[0]).filter(function(d) {
        return d != "name" && (y[d] = d3.scale.linear()
            .domain(d3.extent(csvData, function(p) { return +p[d]; }))
            .range([pcpHeight, 0]));
    }));

    // Add grey background lines for context.
    pcpBackground = svg.append("g")
        .attr("class", "pcpBackground")
        .selectAll("path")
        .data(csvData)
        .enter()
        .append("path")
        .attr("d", path);

    // Add blue foreground lines for focus.
    pcpForeground = svg.append("g")
        .attr("class", "pcpForeground")
        .selectAll("path")
        .data(csvData)
        .enter()
        .append("path")
        .attr("d", path);

    // Add a group element for each dimension.
    var g1 = svg.selectAll(".dimension")
        .data(dimensions)
        .enter()
        .append("g")
        .attr("class", "dimension")
        .attr("transform", function(d) { return "translate(" + x(d) + ")"; })
        .call(d3.behavior.drag()
        .origin(function(d) { return {x: x(d)}; })
        .on("dragstart", function(d) {
            dragging[d] = x(d);
            pcpBackground.attr("visibility", "hidden");
        })
        .on("drag", function(d) {
            dragging[d] = Math.min(pcpWidth, Math.max(0, d3.event.x));
            foreground.attr("d", path);
            dimensions.sort(function(a, b) { return position(a) - position(b); });
            x.domain(dimensions);
            g1.attr("transform", function(d) { return "translate(" + position(d) + ")"; })
        })
        .on("dragend", function(d) {
            delete dragging[d];
            transition(d3.select(this)).attr("transform", "translate(" + x(d) + ")");
            transition(foreground).attr("d", path);
            pcpBackground
                .attr("d", path)
                .transition()
                .delay(500)
                .duration(0)
                .attr("visibility", null);
        }));
};



})();
