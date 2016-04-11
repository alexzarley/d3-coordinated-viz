//fix alabama topojson
//update basemap to be entire US - use shapefile that USGS used so coast matches up
//pcp doesn't draw/label axis when all lines have same value for a variable


//add in indicator in PCP about which variable is being expressed
//make background color of PCP lines the same as lines not drawn in coast
//add line legend for vulnerability
//add a line for averages of each state/national average

//try to create a function that receives paths and hides them

//add coastal cities overlay

//can i dynamically center my maps so when window size changes, i dont have a bunch of uninteresting staes?

//is zoom level ok for each state or do i need more customization?

(function(){

window.onload = setMap();
//pseudo-global variables
//object of variables used in for loops
var attrObj = {
    "CVIRISK": [1.1, 2.1, 2.5, 3.1],
    "SL_MM_YR_": [1.8, 2.5, 3.0, 3.4],
    "SLOPE_PCT": [0.022, 0.035, 0.055, 0.1151],
    "TIDE_M": [1.0, 2.0, 4.1, 6.01],
    "ERR_M_YR": [-1.999, -1.0, 1.0, 2.01],
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
var attrText = ["Coastal Vulnerability Index", "Sea-Level Rise", "Coastal Slope%", "Tidal Range", "Erosion Rate", "Geomorphology", "Wave Height"];
var expressed = "CVIRISK"; //initial attribute
//array to hold axis labels
var pcpText = ["CVI", "Erosion(m)", "Coastal Slope%", "SLR(mm)", "Tide(m)", "Gemorph.", "Wave Height(m)"]

//execute script when window is loaded

function setMap() {

    //variables to set background rectangle and make sure nothing selected for zooming by bounding box
    var mapWidth = window.innerWidth * 0.375,
        mapHeight = 460,
        active = d3.select(null),
        margin = {top: 50, right: 10, bottom: 20, left: 100},
        pcpWidth = window.innerWidth * 0.525,
        pcpWidth = pcpWidth - margin.left - margin.right,
        pcpHeight = 350 - margin.top - margin.bottom
        // legendWidth = window.innerWidth * 0.1,
        // legendHeight = 350;


    //creating the map section

    //create projection centered on 36N, 88W
    var projection = d3.geo.conicConformal()
        .center([0, 36])//set central coordinates of plane
        .rotate([88, 0, 7])//set central meridian and parallel and rotation degree
        .parallels([29.5, 45.5])//specify standard parallels
        .scale(900)
        .translate([mapWidth / 2, mapHeight / 2]);

    //generator to draw path of projection
    var path = d3.geo.path()
        .projection(projection);

    //set width and height of svg
    var mapSvg = d3.select("body").append("svg")
        .attr("width", mapWidth)
        .attr("height", mapHeight);

    //create and add rect element
    mapSvg.append("rect")
        .attr("class", "background")
        .attr("width", mapWidth)
        .attr("height", mapHeight)
        .on("click", reset);

    // mapSvg.addBrush()
    //   .on('brushing', function(brush) {
    //       console.console.log(brush.extent());
    //   })

    //variable to be used to append group elements to svg
    var mapg = mapSvg.append("g");

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
        var coastStates = mapg.append("g")
            .attr("class", "coaststates")
            .selectAll("path")
            .data(coastStates)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("id", function(d){
                  return d.properties.State
            })
            .on("click", clicked)
            .on("mouseover", function(d){
                highlight(d.properties.State);
            })
            .on("mouseout", function(d){
                dehighlight(d.properties.State);
            });

      // var x = d3.scale.ordinal().rangePoints([0, pcpWidth], 1),
      //     y = {};
      //
      //
      //   coastStates.append("g")
      //       .attr("class", "brush")
      //       .each(function(d) {
      //       d3.select(this)
      //           .call(y[d].brush = d3.svg.brush().y(y[d])
      //                   .on("brushstart", brushstart)
      //                   .on("brush", brush));
      //   })
      //
      //   function brushstart() {
      //       d3.event.sourceEvent.stopPropagation();
      //   }
      //
      //   // Handles a brush event, toggling the display of foreground lines.
      //   function brush() {
      //       //don't understand this
      //       var actives = dimensions.filter(function(p) { return !y[p].brush.empty(); }),
      //           extents = actives.map(function(p) { return y[p].brush.extent(); });
      //       pcpForeground.attr("class", function(d) {
      //           return actives.every(function(p, i) {
      //               return extents[i][0] <= d[p] && d[p] <= extents[i][1];
      //           }) ? null: "hidden";
      //       });
      //       activeCoast.attr("class", function(d) {
      //           return actives.every(function(p, i) {
      //               return extents[i][0] <= d.properties[p] && d.properties[p] <= extents[i][1];
      //           }) ? null: "hidden";
      //       });
        // };


        //add a path to the coastal states group element
        mapg.append("path")
            .datum(topojson.mesh(coastStatesData, coastStatesData.objects.CoastStates, function(a, b) { return a !== b; }))
            .attr("id", "state-borders")
            .attr("d", path);

        //add the basemap states to a group element in SVG
        mapg.append("g")
            .attr("class", "basemap")
          .selectAll(".basemap")
            .data(basemap)
            .enter()
          .append("path")
            .attr("d", path)

        //add a path to basemap states group element
        mapg.append("path")
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
        active = d3.select(this)
            .classed("active", true)
            // .style({"fill": "#a6c5bf"})

        //extracts the bounds of the path from d, which is datum of state on which you clicked
        var bounds = path.bounds(d),
            dx = bounds[1][0] - bounds[0][0],
            dy = bounds[1][1] - bounds[0][1],
            x = (bounds[0][0] + bounds[1][0]) / 2,
            y = (bounds[0][1] + bounds[1][1]) / 2,
            scale = 0.9 / Math.max(dx / mapWidth, dy / mapHeight),
            translate = [mapWidth / 2 - scale * x, mapHeight / 2 - scale * y];

        //sets duration over which the zooming takes place
        mapg.transition()
            .duration(1800)
            .style("stroke-width", 1.5 / scale + "px")
            .attr("transform", "translate(" + translate + ")scale(" + scale + ")");

        //calls fucntion to create choroplethed coastline for state on which you clicked
        drawCoast(d);
    };

    //function to zoom out and reset the map
    function reset(){
        active.classed("active", false);
        active = d3.select(null);

        d3.selectAll(".activeCoast")
            .remove();

        //sets duration over which the zooming takes place
        mapg.transition()
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

        //for some reason the AL topojson has _WGS appended to its name; this is a patch until I figure out what's wrong with object name
        if (state == "AL"){
            //variable used to access filenames
            var stateObj = "Coast_" + state + "_WGS";
        } else {
            var stateObj = "Coast_" + state;
        };
        //convert topojsons into geojson objects; coastLine is an array full of objects
        var coastLine = topojson.feature(coastData, coastData.objects[stateObj]).features;

        //join CSV data to GeoJSON enumeration units
        coastLine = joinData(coastLine, csvData);
        //create color scale
        var colorScale = makeColorScale(csvData);
        //draw coast
        var activeCoast = setEnumerationUnits (coastLine, mapSvg, path, colorScale);
        clearPCP(); //stops multiple svgs from being created
        // //creates legend
        // createLegend(colorScale);
        drawPCP(csvData, state, activeCoast);
        //call function to create dropdown menu to filter attributes
        createDropdown(csvData);


    };

    function createLegend(pcpSvg){
        var rectHeight = 1;
        var rectWidth = 20;
        var legendSpacing = 4;
        var colorClasses = [
            "#2C7BB6",
            "#ABD9E9",
            "#FFFF7B",
            "#FDAE61",
            "#D7191C"
        ];


        var legendTitle = pcpSvg.append("text")
            .attr("class", "legendTitle")
            .attr("x", -85)
            .attr("y", 30)
            .text("Risk Level")

        var legend = pcpSvg.selectAll('.legend')
          .data(colorClasses)
            .enter()
          .append("g")
            .attr("class", "legend")
            .attr("transform", function(d, i) {
                var height = rectWidth + legendSpacing;
                var offset =  height * colorClasses.length / 2;
                var horz = -2 * rectWidth;
                var vert = i * height - offset;
                return 'translate(' + horz + ',' + vert + ')';
          });

        //creates rect elements for legened
        var legendRect = legend.append('rect')
            .attr("class", "legendRect")
            .attr('width', rectWidth)
            .attr('height', rectHeight)
            .attr("x", -50)
            .attr("y", 100)
            .style('fill', function(d){ return d })
            .style('stroke', function(d){ return d });

        //array to hold legend text risk levels
        var riskLevels = ["Very Low", "Low", "Moderate", "High", "Very High"]

        //adds text to legend
        var legendText = legend.append('text')
            .attr("class", "legendText")
            .attr("x", -25)
            .attr("y", 103)
            .text(function(d, i) { return riskLevels[i]; });

    };
    //function to create color scale generator
    function makeColorScale(data){
        var colorClasses = [
            "#2C7BB6",
            "#ABD9E9",
            "#FFFF7B",
            "#FDAE61",
            "#D7191C"
        ];

        //need to reverse colorscale for these variables becuase lower values mean greater risk (i.e., red)
        if (expressed == "TIDE_M" || expressed == "ERR_M_YR" || expressed == "SLOPE_PCT"){
            colorClasses = colorClasses.reverse()
        }
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
        // expressed = "ERR_M_YR"//checks that attribute value is a number
        if(props[expressed] == "0"){
            var val = props[expressed];
            // console.log(val);
        } else {
            var val = parseFloat(props[expressed]);
        }
        // console.log(colorScale(val));
        // console.log(colorScale);
        // console.log(colorScale(val));
        //if attribute value exists, assign a color; assign gray
        // val = 1.0;
        return colorScale(val);

        // if (val == NaN){console.log(val);}
        //
        // if (val && val != NaN){
        //     return colorScale(val);
        // } else {
        //     return "#000";
        //     // console.log(props);
        // };
    };

    //create coastline enumeration area on map
    function setEnumerationUnits(coastLine, mapSvg, path, colorScale){
        //remove previous coast
        d3.selectAll(".activeCoast")
            .remove();
        //draw new coast
        var activeCoast = mapg.append("g")
            .attr("class", "activeCoast")
            .selectAll("path")
            .data(coastLine)
            .enter()
          .append("path")
            .attr("id", function(d){
              return "c" + d.properties.ID;
            })
            .attr("d", path)
            .style("stroke", function(d){
                return choropleth(d.properties, colorScale);
            });

        return activeCoast
    };

    //creates dropdown menu
    function createDropdown(csvData){
        //since no data is displayed and CSV data is not loaded until a user clicks on a state
        //I had to create the dropdown from my 'clicked' function. This made it so everytime
        //you click on any state, a new dropdown element is created.
        //testing if dropdown already exists to prevent duplicate creation
        if(d3.select(".dropdown").empty() == true){
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

            var attrOptions = dropdown.selectAll(".attrOptions")
                .data(attrArray)
                .enter()
                .append("option")
                // .attr("class", "attrOptions")
                .attr("value", function(d){ return d })
                .text(function(d, i){ return attrText[i] });
        }
    };

    //dropdown change listener handler
    function changeAttribute(attribute, csvData){
        //change expressed Attribute
        expressed = attribute;
        //recreate the color scale
        var colorScale = makeColorScale(csvData);

        //recolor enumeration units
        var coast = d3.select(".activeCoast").selectAll("path")
            .transition()
            .duration(500)
            .style("stroke", function(d){
                return choropleth(d.properties, colorScale);
            });

        //need to class each line in pcp so i can select more easily
        var pcpLines = d3.select(".pcpForeground").selectAll("path")
            .transition()
            .duration(500)
            .style("stroke", function(d){
                return choropleth(d, colorScale);
            })
        highlightAxis(expressed)

    };

    function highlightAxis(expressed){
        var resetAxes = d3.selectAll(".axis")
            .style("stroke-width","")
            // .attr("class", "expressed")

        var selectAxis = d3.select("#"+expressed)
            .style("stroke-width", "5px")
            .style("background-color", "#ddd")
            // .attr("class", "expressed")

        // var selectText = selectAxis.select("text")
        //     .attr("class", "selectText")
        //   console.log(selectText;
    }

    //function to highlight pcp/coastal lines when hovering in PCP
    function highlightLine(props, expressed) {
        //select PCP line
        var selectedLine = d3.select("#line" + props.NEWID)
            .style("stroke-width", "5")
            .style("stroke", "black")
        //select Coastal segment
        var selectCoast = d3.select("#c" + props.NEWID)
            .style("stroke-width", "10")

        // setLabel(props)
    };
    //function to dehighlight pcp/coastal lines when mouseout in PCP
    function dehighlightLine(props, colorScale) {
        //deselect PCP line
        var deselectLine = d3.select("#line" + props.NEWID)
            .style("stroke-width", "")
            .style("stroke", function(d){
                return choropleth(d, colorScale)
            });
        //deselect Coastal line
        var deselectCoast = d3.select("#c" + props.NEWID)
            .style("stroke-width", "")
            .style("stroke", function(d){
                return choropleth(d, colorScale)
            });
    }

//     //function to create dynamic label
//     function setLabel(props){
//
//         // console.log($(".dropdown option:selected"));
//         // console.log(props);
//         // console.log(expressed);
//         // console.log(pcpText);
//         var expressed = $(".dropdown option:selected");
//
//         expressed = expressed[0].value
//
//
// console.log(props);
// console.log(expressed);
//         //label content
//         if (expressed == "CVIRISK"){
//             var index = 0
//         } else if (expressed == "ERR_M_YR") {
//             var index = 1
//         } else if (expressed == "SLOPE_PCT") {
//             var index = 2
//         } else if (expressed == "SL_MM_YR") {
//             var index = 3
//         } else if (expressed == "TIDE_M") {
//             var index = 4
//         } else if (expressed == "GEOM") {
//             var index = 5
//         } else if (expressed == "WAVES_M"){
//             var index = 6
//         }
//
//         console.log(props[expressed]);
//         console.log(pcpText[index]);
//         var labelAttribute = "<h3>" + props[expressed] +
//             "</h3>" + pcpText[index];
//
//         //create info label div
//         var infolabel = d3.select("body")
//             .append("div")
//             .attr({
//                 "class": "infolabel",
//                 "id": props.NEWID+ "_label"
//             })
//             .html(labelAttribute);
//
//         var regionName = infolabel.append("div")
//             .attr("class", "labelname")
//             .html(props.NEWID);
//     };
//
//     //function to move info label with mouse
//     function moveLabel(){
//         //use coordinates of mousemove event to set label coordinates
//         var x = d3.event.clientX + 10,
//             y = d3.event.clientY - 75;
//
//         d3.select(".infolabel")
//             .style({
//                 "left": x + "px",
//                 "top": y + "px"
//             });
//     };
    //function to create pcp visualization
    function drawPCP (csvFullData, state, activeCoast){
      //construct an ordinal scale for x with rangeoutput of [0, width] as min and max values of output range; 1 is for padding
      var x = d3.scale.ordinal().rangePoints([0, pcpWidth], 1),
          y = {},
          dragging = {};

      var line = d3.svg.line(), //new line generator
          axis = d3.svg.axis().orient("left"), //new axis generator with left orientation
          pcpBackground, //create variable for background lines
          pcpForeground, //create variable for foreground lines
          pcpStateAvg; //create variable for state average line

      var tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-10, 0])
        .html(function(d) {
          return "<strong>Frequency:</strong> <span style='color:red'>" + d + "</span>";
        })

      //create an SVG container for the PCP
      var pcpSvg = d3.select("body").append("svg")
          .attr("id", "pcpSvg")
          .attr("width", pcpWidth + margin.left + margin.right)
          .attr("height", pcpHeight + margin.top + margin.bottom)
        .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");// adds padding to group element in SVG

      createLegend(pcpSvg);

      pcpSvg.call(tip);

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

      var pcpTitle = pcpSvg.append("text")
          .attr("x", 100)
          .attr("y", -30)
          .attr("class", "pcpTitle")
          .text("Vulnerability of " + state + " Coast")

      var pcpHelp = pcpSvg.append("text")
          .attr("x", 115)
          .attr("y", 295)
          .attr("class", "pcpHelp")
          .text("Click and drag vertically on any axis to filter lines. Click axis again to clear filter.")

      var clearButton = createButton(pcpSvg);

      // Extract the list of dimensions and create a scale for each to set as domain of x.
      x.domain(dimensions = d3.keys(csvData[3]).filter(function(d) { //.keys returns array of property names for a given object
          //.filter creates new array based on this function
          //i don't understand what this is doing
          return d != "name" && (y[d] = d3.scale.linear()
              //can't figure out what this does either
              .domain(d3.extent(csvData, function(p) { return +p[d]; }))//.extent returns min/max of array
              .range([pcpHeight, 0]));
      }));
      // Add grey background lines; these will be displayed when user selects foreground lines
      pcpBackground = pcpSvg.append("g")
          .attr("class", "pcpBackground")
          .selectAll("path")
          .data(csvFullData)
          .enter()
        .append("path")
          .attr("d", path);
      // Add blue foreground lines for focus
      pcpForeground = pcpSvg.append("g")
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
          .attr("d", path)
          .on("mouseover", function(d){
              highlightLine(d, expressed);
          })
          .on("mouseout", function(d){
              dehighlightLine(d, colorScale);
          })
          // .on("mousemove", moveLabel);

      // pcpStateAvg = pcpSvg.append("g")
      //     .attr("class", "pcpStateAvg")
      //     .select("path")
      //     .data(csvData)
      //     .enter()
      //   .append("path")
      //   .style("stroke", "black")
      //   .style("stroke-width", "1px")
      //   .attr("d", function(d, i, p) {
      //
      //       for (var key in attrArray) {
      //
      //           console.log(d[attrArray[key]]);
      //       }

            //needs to return object with value for each variable
        // })

      // Add a group element for each dimension (i.e., each axis)
      var pcpg = pcpSvg.selectAll(".dimension")
          .data(dimensions)
          .enter()
        .append("g")
          .attr("class", "dimension")
          //what exactly does this do?
          .attr("transform", function(d) { return "translate(" + x(d) + ")"; })
          .call(d3.behavior.drag()
              .origin(function(d) { return {x: x(d)}; })
              .on("dragstart", function(d) {
                  dragging[d] = x(d);
                  pcpBackground.attr("visibility", "hidden");
              })
              .on("drag", function(d) {
                  dragging[d] = Math.min(pcpWidth, Math.max(0, d3.event.x));
                  pcpForeground.attr("d", path)
                  dimensions.sort(function(a, b) { return position(a) - position(b); });
                  x.domain(dimensions);
                  pcpg.attr("transform", function(d) { return "translate(" + position(d) + ")"; })
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
            })
        );
      // console.log(csvData);
      // var min = d3.min(csvData, function(d, i, p) { console.log(d);
      //     console.log(i);
      //     console.log(p);;return d[1]; }),
      //     max = d3.max(csvData, function(d) { console.log(d);return d[1]; })

      // var keys = [], attributes = [];
      // //fill keys arrary with all property names
      // for (var key in csvData[0]){
      //     keys.push(key);
      // };
      //
      // //fill attributes array with only the attribute names
      // for (var i=3; i<keys.length; i++) {
      //     attributes.push(keys[i]);
      // };
      // // //create horizontal pcp coordinate generator
      // // var coordinates = d3.scale.linear()//create an ordinal axis scale
      // //     .domain(attributes) //horizontally space each axis evenly
      // //     .rangePoints([0, width]); //set the horizontal width to svg
      // var yScale = d3.scale.linear()
      //                       .domain([min, max])
      // var axis = d3.svg.axis() //create axis generator
      //     .orient("left"); //orient genreated axis vertically
      //
      // //create vertical pcp scale
      // var scales = {}; //object to hold scale generators
      // attributes.forEach(function(att) { //for each attribute
      //     scales[att] = d3.scale.linear() //create a linear scale generators
      //         .domain(d3.extent(csvData, function(data) {
      //               return +data[att]; //create array of extents
      //         }))
      //         .range([height, 0]); //set the axis height to SVG Height
      // });
      // var pcpLines = pcplot.append("g")
      //     .attr("class", "pcpLines") //class for styling lines
      //     .selectAll("path") //prepare for new path elements
      //     .data(csvData) //bind data
      //     .enter() //create new path for each line
      //     .append("path") //append each line path to the container element
      //     .attr("id", function(d){
      //         return d.NEWID; //id each line by NEWID
      //     })
      //     .attr("d", function(d) {
      //         return line(attributes.map(function(att) {
      //             return [coordinates(att), scales[att](d[att])];
      //         }));
      //     })
      //     .on("mouseover", highlight);
      //


      // Add an axis and title.
      pcpg.append("g")
          .attr("class", "axis")
          .attr("id", function(d){ return d;})
          .each(function(d) { d3.select(this).call(axis.scale(y[d])); })
        .append("text")
          .style("text-anchor", "middle")
          .attr("y", -9)
          .text(function(d, i) { return [pcpText[i]]; })
          .on("mouseover", tip.show)
          .on("mouseout", tip.hide);

      // Add and store a brush for each axis.
      pcpg.append("g")
          .attr("class", "brush")
          .each(function(d) {
              d3.select(this)
                  .call(y[d].brush = d3.svg
                          .brush().y(y[d])
                          .on("brushstart", brushstart)
                          .on("brush", brush));
          })
        .selectAll("rect")
          .attr("x", -8)
          .attr("width", 16);

      //highlights initial variable axis
      highlightAxis(expressed);

      //call function to add hyperlinks to studies; added here so links always appear below map and PCP
      addSources();

      function position(d) {
          var v = dragging[d];
          return v == null ? x(d) : v;
      };

      function transition(g) {
          return pcpg.transition().duration(1500);
      };

      // Returns the path for a given data point.
      function path(d) {
          return line(dimensions.map(function(p) { return [position(p), y[p](d[p])]; }));
      }

      function brushstart() {
          d3.event.sourceEvent.stopPropagation();
      }

      // Handles a brush event, toggling the display of foreground lines.
      function brush() {
          //don't understand this
          var actives = dimensions.filter(function(p) { return !y[p].brush.empty(); }),
              extents = actives.map(function(p) { return y[p].brush.extent(); });
          pcpForeground.attr("class", function(d) {
              return actives.every(function(p, i) {
                  return extents[i][0] <= d[p] && d[p] <= extents[i][1];
              }) ? null: "hidden";
          });
          activeCoast.attr("class", function(d) {
              return actives.every(function(p, i) {
                  return extents[i][0] <= d.properties[p] && d.properties[p] <= extents[i][1];
              }) ? null: "hidden";
          });
      };

      function helpText(label){

      }
    }


    function highlight(state){
        //change stroke
        var selected = d3.select("#"+state)
            .style({
                "stroke": "#fff",
                "stroke-width": "0.09em"
            });
    }
    function dehighlight(state){
        var selected = d3.select("#"+state)
            .style({"stroke": ""})
    }

    function clearPCP(){
        d3.select("#pcpSvg")
            .remove();
        d3.select(".holder")
            .remove();
    };

    function createButton(pcpSvg) {

        var buttonColor = "#428bca";

        var width= 50, height=15,       // rect dimensions
            fontSize = 1.38*height/3,    // font fills rect if fontSize  = 1.38*rectHeight
            x0 = 10, y0 = pcpHeight+5,
            x0Text = x0 + width/2, y0Text = y0 + 0.66*height,
            text = "Clear Filters";

        pcpSvg.append("rect")                 // button background
            .attr("class", "button")
            .attr("id","buttonBackground")
            .attr("width", width + "px")
            .attr("height", height + "px")
            .style("fill", buttonColor)
            .attr("x", x0)
            .attr("y", y0)
            .attr("ry", height/10)
            .attr("z-index", "10");

        var text = pcpSvg.append("text")      // button text
            .attr("class", "button")
            .attr("id","buttonText")
            .attr("x", x0Text)
            .attr("y", y0Text)
            .attr("z-index", "10")
            .style("text-anchor", "middle")
            .style("fill", "#ffffff")
            .style("stroke", "none")
            .style("font-family", "'Helvetica Neue', Helvetica, Arial, sans-serif")
            .style("font-size", fontSize + "px")
            .text(text);

        pcpSvg.append("rect")  // transparent overlay to catch mouse events
            .attr("class", "button")
            .attr("id","myButton")
            .attr("width", width + "px")
            .attr("height", height + "px")
            .attr("z-index", "10")
            .style("opacity", 0)
            .style("pointer-events", "all")
            .attr("x", x0)
            .attr("y", y0)
            .attr("ry", height/2)
            .on("click", clearFilters);  // This restarts analysis (defined in weak.js)

        function clearFilters() {
            d3.selectAll(".extent")
                .attr("height", "0");

            d3.selectAll(".hidden")
                .attr("class", "")
        }
    };

    function addSources() {

        // if(d3.select(".holder").empty() == true){

            var width= window.innerWidth * 0.9, height=20,       // svg dimensions
                linkWidth = 90, linkHeight = 18  //dimensions for first rect element
                fontSize = 1.38*linkHeight/3,    // font fills rect if fontSize  = 1.38*rectHeight
                x0 = 5, y0 = linkHeight/2,  //for adding margin between elements
                x0Text = x0 + linkWidth/2, y0Text = y0 + 0.66*linkHeight, //for positioning text slightly off from edge of rect elements
                atlText = "Atlantic Coast", gulfText = "Gulf Coast", //hyperlink display text
                atlUrl = "http://pubs.usgs.gov/of/1999/of99-593/pages/cvi.html", //webpage links
                gulfUrl = "http://pubs.usgs.gov/of/2000/of00-179/pages/cvi.html";

            //create SVG to hold rects/links
            var holder = d3.select("body")
                  .append("svg")
                  .attr("class", "holder")
                  .attr("width", width)
                  .attr("height", height)
                  // .style("stroke", "#ccc")
                  .style("fill", "none");

            // draw text on the screen
            var usgsText = holder.append("text")
                .attr("class", "usgsText")
                .attr("x", x0)
                .attr("y", y0)
                .style("fill", "black")
                .attr("dy", ".35em")
                .attr("text-anchor", "left")
                .style("pointer-events", "none")
                .text("Links to USGS Studies: ");

            //select USGS element
            var text_element = d3.select(".usgsText");
            //extract width of text element to set as x value of next rectangle
            var textWidth = text_element.node().getBBox().width

            // add link to svg
            var atlLink = holder.append("a")
                .attr("class", "atlLink")
                .attr("xlink:href", atlUrl + atlText)
                .style("target-name", "new") //try to make it so a new tab opens when you click link
                .style("target-new", "tab")
              .append("rect") //add rectangle that will allow you to click it to access link in "a" element
                .attr("class", "atlRect")
                .attr("height", linkHeight)
                .attr("width", linkWidth + 2*x0)
                .attr("x", textWidth + 5 + x0)
                .style("fill", "#ccc")
                .style("stroke", "#ddd")
                .attr("rx", 2)
                .attr("ry", 2);

            // draw text on the screen
            var atlLabel = holder.append("text")
                .attr("class", "atlLabel")
                .attr("x", textWidth + 9 + x0)
                .attr("y", y0)
                .style("fill", "black")
                .attr("dy", ".35em")
                .attr("text-anchor", "left")
                .style("pointer-events", "none")
                .text(atlText);

            //select atlRect element
            atl_element = d3.select(".atlRect");
            //extract width of rect element
            var rectWidth = atl_element.node().getBBox().width
            //extract x value of rect element
            var rectX = atl_element.node().getBBox().x
            //add x value and width to set as x value of next rectangle
            var gulfWidth = rectWidth + rectX

            // add link element to svg
            var gulfLink = holder.append("a")
                .attr("class", "gulfLink")
                .attr("xlink:href", gulfUrl + gulfText)
                .style("target-name", "new")
                .style("target-new", "tab")
              .append("rect") // add rect element that allows you to click it to open link
                .attr("class", "gulfRect")
                .attr("height", linkHeight)
                .attr("width", 2*linkWidth/3 + 4*x0)
                .attr("x", gulfWidth + 5 + x0)
                .style("fill", "#ccc")
                .style("stroke", "#ddd")
                .attr("rx", 2)
                .attr("ry", 2);

            // draw text on the screen
            var gulfLabel = holder.append("text")
                .attr("class", "gulfLabel")
                .attr("x", gulfWidth + 9 + x0)
                .attr("y", y0)
                .style("fill", "black")
                .attr("dy", ".35em")
                .attr("text-anchor", "left")
                .style("pointer-events", "none")
                .text(gulfText);
        // }
    };
};




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
    // var pcpLines = pcplot.append("g")
    //     .attr("class", "pcpLines") //class for styling lines
    //     .selectAll("path") //prepare for new path elements
    //     .data(csvData) //bind data
    //     .enter() //create new path for each line
    //     .append("path") //append each line path to the container element
    //     .attr("id", function(d){
    //         return d.NEWID; //id each line by NEWID
    //     })
    //     .attr("d", function(d) {
    //         return line(attributes.map(function(att) {
    //             return [coordinates(att), scales[att](d[att])];
    //         }));
    //     })
    //     .on("mouseover", highlight);
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
