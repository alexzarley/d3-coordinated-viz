//fix alabama topojson
//update basemap to be entire US - use shapefile that USGS used so coast matches up
//pcp doesn't draw/label axis when all lines have same value for a variable

//for coast states add in hover over state highlgiht and deselect affordances

//add in indicator in PCP about which variable is being expressed
//make background color of PCP lines the same as lines not drawn in coast
//add line legend for vulnerability
//add links to USGS papers
//add info hovers for each axis
//add a line for averages of each state/national average

//try to create a function that receives paths and hides them

//trying to somehow coordinate which lines are blue in PCP and then only draw those lines on map
//or do it so all those that are gray in PCP are not drawn on map
//should coordination involve the "extent filter" and hover?
//color the lines in PCP based on colorscale of expressed variable? or

//can i dynamically center my maps so when window size changes, i dont have a bunch of uninteresting staes?

//need way to reset pcp filters
//need to relabel axis manually

//is zoom level ok for each state or do i need more customization?

(function(){

window.onload = setMap();
//pseudo-global variables
//object of variables used in for loops
var attrObj = {
    "CVIRISK": [1.1, 2.1, 2.5, 3.1],
    "TIDE_M": [6.01, 4.0999, 1.9999, 0.9999],
    "SLOPE_PCT": [0.114999, 0.054999, 0.0349999, 0.021999],
    "ERR_M_YR": [1.999, 0.999, -1.0, -2.0],
    "SL_MM_YR_": [1.799999, 2.499999, 2.9999999, 3.39999999],
    "GEOM": [1.1, 2.1, 3.1, 4.1],
    "WAVES_M": [0.55, 0.85, 1.05, 1.25]
};
//array to attribute object because only arrays can be passed as data
var attrArray = [];
//populate array
for (var key in attrObj){
    attrArray.push(key)
};
//array to hold values user will see
var attrText = ["Tidal Range", "Coastal Slope%", "Erosion Rate", "Sea-Level Rise", "Geomorphology", "Wave Height", "Coastal Vulnerability Index"];
var expressed = "CVIRISK"; //initial attribute
//execute script when window is loaded

function setMap() {

    //variables to set background rectangle and make sure nothing selected for zooming by bounding box
    var width = window.innerWidth * 0.5,
        height = 460,
        active = d3.select(null);

    //create projection centered on 36N, 88W
    var projection = d3.geo.conicConformal()
        .center([0, 36])//set central coordinates of plane
        .rotate([88, 0, 7])//set central meridian and parallel and rotation degree
        .parallels([29.5, 45.5])//specify standard parallels
        .scale(900)
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
            .duration(1500)
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
            .duration(1500)
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
        clearPCP();
        drawPCP(csvData, state);
        //call function to create dropdown menu to filter attributes
        createDropdown(csvData);

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
        //remove previous coast
        d3.selectAll(".activecoast")
            .remove();
        //draw new coast
        g.append("g")
            .selectAll("path")
            .data(coastLine)
            .enter()
          .append("path")
            .attr("class", "activecoast")
            .attr("id", function(d){
              return "c" + d.properties.ID;
            })
            .attr("d", path)
            .style("stroke", function(d){
                return choropleth(d.properties, colorScale);
            });
    };
};

//creates dropdown menu
function createDropdown(csvData){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, csvData)
        });

    //add initial option and disable its selection
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");

    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });
};

//dropdown change listener handler
function changeAttribute(attribute, csvData){
    //change expressed Attribute
    expressed = attribute;

    //recreate the color scale
    var colorScale = makeColorScale(csvData);

    //recolor enumeration units
    var coast = d3.selectAll(".activecoast")
        .style("stroke", function(d){
            return choropleth(d.properties, colorScale);
        });

    //need to class each line in pcp so i can select more easily
    var pcpLines = d3.select(".pcpForeground")
        .style("stroke", function(d){
          console.log(d);})
            // return choropleth(d, colorScale);
}
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

function choropleth(props, colorScale){
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


//function to create pcp visualization
function drawPCP (csvFullData, state){

    var margin = {top: 50, right: 10, bottom: 20, left: 10},
        width = window.innerWidth * 0.425,
        width = width - margin.left - margin.right,
        height = 350 - margin.top - margin.bottom;
    //construct an ordinal scale for x with rangeoutput of [0, width] as min and max values of output range; 1 is for padding
    var x = d3.scale.ordinal().rangePoints([0, width], 1),
        y = {},
        dragging = {};

    var line = d3.svg.line(), //new line generator
        axis = d3.svg.axis().orient("left"), //new axis generator with left orientation
        pcpBackground, //create variable for background lines
        pcpForeground; //create variable for foreground lines

    //create an SVG container for the PCP
    var svg = d3.select("body").append("svg")
        .attr("id", "pcpSvg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");// adds padding to group element in SVG
        console.log(csvFullData);
    //filters out properties from each line segment in csvFullData I don't want to display in PCP
    var csvData = csvFullData.map(function(d) {
        //remove ID, state, etc. properties from data
        return {
            CVIRISK:  d.CVIRISK,
            ERR_M_YR: d.ERR_M_YR,
            SLOPE_PCT: d.SLOPE_PCT,
            SL_MM_YR_: d.SL_MM_YR_,
            TIDE_M: d.TIDE_M,
            GEOM: d.GEOM,
            WAVES_M: d.WAVES_M
        };
    });

    var colorScale = makeColorScale(csvFullData);

    var pcpTitle = svg.append("text")
        .attr("x", 100)
        .attr("y", -30)
        .attr("class", "pcpTitle")
        .text("Vulnerability of " + state + " Coast")

    var pcpHelp = svg.append("text")
        .attr("x", 115)
        .attr("y", 295)
        .attr("class", "pcpHelp")
        .text("Click and drag vertically on any axis to filter lines. Click axis again to clear filter.")

    // Extract the list of dimensions and create a scale for each to set as domain of x.
    x.domain(dimensions = d3.keys(csvData[3]).filter(function(d) { //.keys returns array of property names for a given object
        //.filter creates new array based on this function
        //i don't understand what this is doing
        return d != "name" && (y[d] = d3.scale.linear()
            //can't figure out what this does either
            .domain(d3.extent(csvData, function(p) { return +p[d]; }))//.extent returns min/max of array
            .range([height, 0]));
    }));
    // Add grey background lines; these will be displayed when user selects foreground lines
    pcpBackground = svg.append("g")
        .attr("class", "pcpBackground")
        .selectAll("path")
        .data(csvFullData)
        .enter()
      .append("path")
        // .attr("id", function(d){
        //     return "line" + d.NEWID;
        // })
        .attr("d", path);
    // Add blue foreground lines for focus
    pcpForeground = svg.append("g")
        .attr("class", "pcpForeground")
      .selectAll("path")
        .data(csvFullData)
        .enter()
      .append("path")
        .attr("id", function(d){
            return "line" + d.NEWID;
        })
        .style("stroke", function(d){
            return choropleth(d, colorScale);
        })
        .attr("d", path);

    // Add a group element for each dimension (i.e., each axis)
    var g = svg.selectAll(".dimension")
        .data(dimensions)
        .enter()
      .append("g")
        .attr("class", "dimension")
        //what exactly does this do?
        .attr("transform", function(d) { return "translate(" + x(d) + ")"; })
        // .attr("transform", function(d) {
        //     if (d == "ERR_M_YR"){
        //         return "translate(" + (x(d)*-1) + ")";
        //       } else {
        //         return "translate(" + x(d) + ")"; }
        //       })
        .call(d3.behavior.drag()
          .origin(function(d) { return {x: x(d)}; })
          .on("dragstart", function(d) {
            dragging[d] = x(d);
            pcpBackground.attr("visibility", "hidden");
          })
          .on("drag", function(d) {
              dragging[d] = Math.min(width, Math.max(0, d3.event.x));
              pcpForeground.attr("d", path)
              dimensions.sort(function(a, b) { return position(a) - position(b); });
              x.domain(dimensions);
              g.attr("transform", function(d) { return "translate(" + position(d) + ")"; })
          })
          .on("dragend", function(d) {
              delete dragging[d];
              transition(d3.select(this)).attr("transform", "translate(" + x(d) + ")");
              transition(pcpForeground).attr("d", path);
              //removes background gray lines and lets blue foreground lines show
              pcpBackground
                  .attr("d", path)
                .transition()
                  .delay(800)
                  .duration(0)
                  .attr("visibility", null);
        }));

    //need to reverse coast slope, shoreline erosion, and tide range
    // Add an axis and title.
    g.append("g")
        .attr("class", "axis")
        .each(function(d) { d3.select(this).call(axis.scale(y[d])); })
      .append("text")
        .style("text-anchor", "middle")
        .attr("y", -9)
        .text(function(d) { return d; });

    // Add and store a brush for each axis.
    g.append("g")
        .attr("class", "brush")
        .each(function(d) {
            d3.select(this).call(y[d].brush = d3.svg.brush().y(y[d]).on("brushstart", brushstart).on("brush", brush));
        })
      .selectAll("rect")
        .attr("x", -8)
        .attr("width", 16);
  // });
    // filterCoast(svg);

    function position(d) {
        var v = dragging[d];
        return v == null ? x(d) : v;
    };

    function transition(g) {
        return g.transition().duration(1500);
    };

    // Returns the path for a given data point.
    function path(d) {
        return line(dimensions.map(function(p) { return [position(p), y[p](d[p])]; }));
    }

    function brushstart() {
        d3.event.sourceEvent.stopPropagation();
        // checkHidden();

        // d3.select(pcpForeground).map(function(d, i, p) {
        //     var pcpLines = d[0][0];
        //     console.log(pcpLines);
        //     for (j=0; j<pcpLines.length; j++){
        //         if (pcpLines[j].style.display == ""){
        //             var hiddenLines = pcpLines[j].id);
        //
        //         }}
        //
        //     console.log(i);
        //     console.log(p);
        //     // if (d[0][0])
        //     // console.log(d[0][0]);
        //
        // })
        //
        // //selects all coastpaths
        // d3.selectAll(".activecoast")
        //     .attr("visibility", "hidden");

    }

    // Handles a brush event, toggling the display of foreground lines.
    function brush() {
        // console.log("brush");
        // console.log(csvFullData);
        // console.log(csvFullData);
        var selectedID = [];
        //don't understand this
        var actives = dimensions.filter(function(p) { return !y[p].brush.empty(); }),
            extents = actives.map(function(p) { return y[p].brush.extent(); });
        pcpForeground.attr("class", function(d) {
            return actives.every(function(p, i) {
                return extents[i][0] <= d[p] && d[p] <= extents[i][1];
            }) ? null: "hidden";
        // pcpForeground.style("display", function(d) {
        //     return actives.every(function(p, i) {
        //         return extents[i][0] <= d[p] && d[p] <= extents[i][1];
        //     }) ? null: "none";
        // });
        // // console.log(pcpForeground);
        // d3.select("body")
        //   .select(".activecoast")
        //   .selectAll("path")
        //     .style("stroke-width", "8px");
        // var activeBounds = [];
        // console.log(extents[0][0]);

        // d3.select(pcpForeground).map(function(d, i, p) {
        //     var pcpLines = d[0][0];
        //     console.log(pcpLines);
        //     for (j=0; j<pcpLines.length; j++){
        //         if (pcpLines[j].style.display == ""){
        //             var hiddenLines = pcpLines[j].id;
        //         }
        //     }
        //
        //     console.log(i);
        //     console.log(p);
        //     // if (d[0][0])
        //     // console.log(d[0][0]);
        //
        });
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

    function choropleth(props, colorScale){
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


};

// function checkHidden(){
//   // console.log("hidden");
//   var lineID = [],
//       pcpID,
//       coastID;
//   var pcpLines = d3.select(".pcpForeground").selectAll("path").map(function(d, i, p){
//     for (j=0; j<pcplines[0].length; j++)
//     // if (d[0])
//       console.log(d);
//       console.log(i);
//       console.log(p);
//       console.log(d[i]);
//   })
//   // var pcpLines = d3.selectAll(".hidden");
//   // pcpLines.classed("hidden")
//   // console.log(pcpLines[0][0].attributes.c);
//   console.log(pcpLines);
//   for (i = 0; i<pcpLines[0].length; i++){
//       // console.log(pcpLines[0][i].attr("class"));
//     // if (pcpLines.classList.contains("hidden")){
//
//       // console.log(pcpLines[0][i].class);
//           pcpID = pcpLines[0][i].id;
//           // console.log(pcpID);
//           pcpID = pcpID.substring(4)
//           // console.log(pcpID);
//
//           coastID = "c" + pcpID
//       // console.log(coastID);
//           lineID.push(coastID);
//     // }
//     // console.log(lineID);
//   };
//   // console.log(lineID);
//   d3.select(coastID)
//       .attr("class", "hidden");
//   // var hidden = $(".hidden");
//   // console.log(hidden);
//
// }

function filterCoast(){
    // var pcpForeground = d3.select(".pcpForeground")
    // var none = pcpForeground.selectAll("display: none")
    // console.log(none);
    // // console.log(pcpForeground);
    // d3.select(".pcpForeground")
    //     .selectAll("display: none")
    //     .style("stroke-width", "2px");
}

// //this function overwrites previous ID for each pcpLine; might need to fix that
// function highlight(data) {
//     var props = datatest(data); //standardize json or csv datatest
//     //removes active id from previous line
//     d3.select("#activePCP")
//         .attr("id", "")
//     //sets active id on current line
//     // console.log(props);
//     // console.log(this);
//     // d3.select(".activecoast")
//     //     .select("#coast"+props.NEWID)
//     //     .style("stroke-width", "1px")
//     d3.select(this) //select current stretch of coast
//       .attr("id", "activePCP");
//
// };
//
// // function dehighlight {
// //     var props = datatest(data);
// //     d3.select("#active")
// //         .attr("id", "")
// // }
//
// function datatest(data) {
//     if (data.properties) {
//         return data.properties;
//     } else {
//         return data;
//     };
// }
//
//
//
function clearPCP(){
    d3.select("#pcpSvg")
        .remove();
}

// function drawPCP(csvData){
//     //pcp dimensions
//     var width = window.innerWidth * 0.425, height = 200;
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
//         })
//         .on("mouseover", highlight);
//
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
//
// function sequence(axis, csvData) {
//     //restyle the axis
//     d3.selectAll(".axes")//select every axis
//         .style("stroke-width", "5px");
//
//     axis.style.strokeWidth = "10px"; //change selected axis thickness
//
//     expressed = axis.id; //change the class-level attribute variable
//
//     //recolor the map
//     d3.selectAll(".activecoast")
//         .style("stroke", function(d){
//         return choropleth(d.properties, colorScale);
//         })
//         .style("stroke-opacity", "0.7")
//         .select("desc")
//         .text(function(d) {
//             return choropleth(d, colorScale(csvData));
//         });
// }


})();
