
(function(){

window.onload = setMap();
          //pseudo-global variables

//define domain used in choropleth; these values are the normalized breakpoints used in USGS study
var attrObj = {
    "CVIRISK": [1.1, 2.1, 2.5, 3.1],
    "SL_MM_YR_": [1.8, 2.5, 3.0, 3.4],
    "SLOPE_PCT": [0.022, 0.035, 0.055, 0.1151],
    "TIDE_M": [1.0, 2.0, 4.1, 6.01],
    "ERR_M_YR": [-1.999, -1.0, 1.0, 2.01],
    "GEOM": [1.1, 2.1, 3.1, 4.1],
    "WAVES_M": [0.55, 0.85, 1.05, 1.25]
};
//for tooltips on hover of axis titles
var attrDesc = {
  "CVIRISK": "Coastal Vulnerability Index",
  "SL_MM_YR_": "Relative sea-level rise (mm/yr)",
  "SLOPE_PCT": "Coastal Slope %",
  "TIDE_M": "Mean Tidal Range (m)",
  "ERR_M_YR": "Shoreline erosion/accretion (m/yr)",
  "GEOM": "Geomorphology of coast",
  "WAVES_M": "Mean wave height (m)"
};
//array of csv column titles
var attrArray = [];
//populate array
for (var key in attrObj){
    attrArray.push(key)
};
//array to hold values for dropdown menu
var attrText = ["Coastal Vulnerability Index", "Sea-Level Rise", "Coastal Slope%", "Tidal Range", "Erosion Rate", "Geomorphology", "Wave Height"];
//initial attribute
var expressed = "CVIRISK";
//array to hold axis labels
var pcpText = ["CVI", "Erosion(m)", "Coastal Slope%", "SLR(mm)", "Tide(m)", "Gemorph.", "Wave Height(m)"];
//array for retrieve labels in PCP
var labelText = ["CVI", "SLR(mm)", "Slope%", "Tide(m)", "Eros.(m)", "Gemorph.", "Waves(m)"];

//execute script when window is loaded
function setMap() {
    //variables to be used throughout
    var mapWidth = window.innerWidth * 0.4,
        mapHeight = 460,
        active = d3.select(null),
        margin = {top: 50, right: 10, bottom: 20, left: 100},
        pcpWidth = window.innerWidth * 0.525,
        pcpWidth = pcpWidth - margin.left - margin.right,
        pcpHeight = 350 - margin.top - margin.bottom;

    //creating the basemap/coastal states section

    //create projection
    var projection = d3.geo.conicConformal()
        .center([0, 39])//set central coordinates of plane
        .rotate([90, 0, 7])//set central meridian and parallel and rotation degree
        .parallels([29.5, 45.5])//specify standard parallels
        .scale(900)
        .translate([mapWidth / 2, mapHeight / 2]);

    //generator to draw path of projection
    var path = d3.geo.path()
        .projection(projection);

    //set width and height of map svg
    var mapSvg = d3.select("body").append("svg")
        .attr("class", "mapSvg")
        .attr("width", mapWidth)
        .attr("height", mapHeight);

    //create and add rect for background
    var background = mapSvg.append("rect")
        .attr("class", "background")
        .attr("width", mapWidth)
        .attr("height", mapHeight)
        .on("click", reset);

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
        //convert topojsons into geojson objects
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
            .on("click", clicked) //initiates drawing of coastline/PCP
            .on("mouseover", function(d){
                highlight(d.properties.State);
            })
            .on("mouseout", function(d){
                dehighlight(d.properties.State);
            });

        //add a path to the coastal states group element to color borders without coloring coastline
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

        //add a path to basemap states group elements to define borders
        mapg.append("path")
            .datum(topojson.mesh(basemapData, basemapData.objects.Basemap, function(a, b) { return a !== b; }))
            .attr("class", "basemap-borders")
            .attr("d", path);
    };

    //function to zoom to the bounds of whichever state is clicked on
    function clicked(d) {
        //clear intro div to make room for PCP
        d3.select("#intro").remove()

        //conditional so that if you click on state you're already zoomed to, reset function
        //is called to zoom out to original view
        if (active.node() === this) return reset();
        //removes "active" class from previously active state
        active.classed("active", false);
        //sets class of state on which you clicked to "active"
        active = d3.select(this)
            .classed("active", true)

        //extracts the bounds of the path from d, which is datum of state on which you clicked
        var bounds = path.bounds(d),
            dx = bounds[1][0] - bounds[0][0],
            dy = bounds[1][1] - bounds[0][1],
            x = (bounds[0][0] + bounds[1][0]) / 2,
            y = (bounds[0][1] + bounds[1][1]) / 2,
            scale = 0.9 / Math.max(dx / mapWidth, dy / mapHeight),
            translate = [mapWidth / 2 - scale * x, mapHeight / 2 - scale * y];

        //sets duration over which the zooming takes place and defines transform/translate
        mapg.transition()
            .duration(1800)
            .style("stroke-width", 1.5 / scale + "px")
            .attr("transform", "translate(" + translate + ")scale(" + scale + ")");

        //calls fucntion to create choroplethed coastline for state on which you clicked
        drawCoast(d);
    };

    //function to zoom out and reset the map
    function reset(){
        //removes active class from state
        active.classed("active", false);
        //clears 'active' selection
        active = d3.select(null);

        //removes coast
        d3.selectAll(".activeCoast")
            .remove();

        //sets duration over which the zooming takes place
        mapg.transition()
            .duration(1500)
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
        //for some reason the AL topojson has _WGS appended to its name; no idea why this is happening
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
        //calls function to draw the PCP
        drawPCP(csvData, state, activeCoast);
        //call function to create dropdown menu to filter attributes
        //add here because no attributes displayed until coast is drawn
        createDropdown(csvData);
    };
    //function that creates the legend in the PCP
    function createLegend(pcpSvg){
        //set variables to define spacing/size
        var rectHeight = 1,
            rectWidth = 20,
            legendSpacing = 4;
        //color classes array
        var colorClasses = [
            "#2C7BB6",
            "#ABD9E9",
            "#d0d000",
            "#FDAE61",
            "#D7191C"
        ];
        //sets legend title
        var legendTitle = pcpSvg.append("text")
            .attr("class", "legendTitle")
            .attr("x", -90)
            .attr("y", -10)
            .text("Risk Level")

        //creates a group for each rectangle and offsets each by same amount
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
            .attr("y", 60)
            .style('fill', function(d){ return d }) //d is the color classes array
            .style('stroke', function(d){ return d });

        //array to hold legend text risk levels
        var riskLevels = ["Very Low", "Low", "Moderate", "High", "Very High"]

        //adds text to legend
        var legendText = legend.append('text')
            .attr("class", "legendText")
            .attr("x", -25)
            .attr("y", 63)
            .text(function(d, i) { return riskLevels[i]; });
    };
    //function to create color scale generator
    function makeColorScale(data){
        //array to hold color Classes
        var colorClasses = [
            "#2C7BB6",
            "#ABD9E9",
            "#d0d000",
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

        //convert any strings to floats
        var val = parseFloat(props[expressed]);

        return colorScale(val);
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
            })
            .on("mouseover", function(d){
                highlightLine(d.properties, expressed);
            })
            .on("mouseout", function(d){
                dehighlightLine(d.properties, colorScale);
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


            var attrOptions = dropdown.selectAll(".attrOptions")
                .data(attrArray)
                .enter()
              .append("option")
                .attr("class", "attrOptions")
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
        //update selected axis
        highlightAxis(expressed)

    };

    //function to highlight axis of expressed variable
    function highlightAxis(expressed){
        //remove stroke-width/bold from previously selected line
        var resetAxes = d3.selectAll(".axis")
            .style("stroke-width","")
        var resetData = d3.selectAll(".infoG")
            .style("font-weight", "")
        //bold/thicken currently selected lines
        var selectAxis = d3.select("#"+expressed)
            .style("stroke-width", "5px")
            .style("background-color", "#ddd")
        var highlightData = d3.select(".info").select("#"+expressed)
            .style("font-weight", "bold")
    };

    //function to highlight pcp/coastal lines when hovering in PCP
    function highlightLine(props, expressed) {
        //select PCP line
        var selectedLine = d3.select("#line" + props.NEWID)
            .style("stroke-width", "5")
            .style("stroke", "black")

        //select Coastal segment
        var selectCoast = d3.select("#c" + props.NEWID)
            .style("stroke", "black")
        //call function to retrieve data for selected line
        setLabel(props)
    };

    //function to dehighlight pcp/coastal lines when mouseout in PCP
    function dehighlightLine(props, colorScale) {
        //deselect PCP line
        var deselectLine = d3.select("#line" + props.NEWID)
            .style("stroke-width", "")
            .style("stroke", function(d){
                return choropleth(d, makeColorScale())
            });
        //deselect Coastal line
        var deselectCoast = d3.select("#c" + props.NEWID)
            .style("stroke-width", "")
            .style("stroke", function(d){
                return choropleth(d.properties, makeColorScale())
            });

        var removeData = d3.selectAll(".lineData").remove()
    }

    //function to create dynamic label from data for line that is selected
    function setLabel(props){
      //add text element to display data
      var lineData = d3.selectAll(".infoG").append("text")
          .attr("class", "lineData")
          .attr("x", -20)
          .attr("y", 220)
          .text(function(d,i) { return +parseFloat(props[attrArray[i]]).toFixed(2); });

    };

    //create static labels for data retrieve
    function createInfoLabels(pcpSvg){
        //prevent duplicate creation
        if(d3.select(".infoRect").empty() == true){

            //define variables to be used in codeblocks
            var labelSpacing = 15,
            width = 120, height = 180,
            x0 = -65, y0 = 130,
            x1 = -100, y1 = y0 + labelSpacing;

            var info = pcpSvg.append("g")
                .attr("class", "info");
            //create title
            var infoTitle = info.append("text")
                .attr("class", "infoTitle")
                .attr("x", x0 - 25)
                .attr("y", y0 - 5)
                .text("Coast Info");


            var infoG= info.selectAll('.infoG')
                .data(pcpText)
                .enter()
              .append("g")
                .attr("class", "infoG")
                .attr("id", function(d, i){ return attrArray[i]})
                .attr("transform", function(d, i) {
                    var height = pcpText.length + labelSpacing;
                    var offset =  height * pcpText.length / 2;
                    var horz = -2 * pcpText.length;
                    var vert = i * height - offset;
                    return 'translate(' + horz + ',' + vert + ')';
              });
            //adds text to legend
            var infoText = infoG.append('text')
                .attr("class", "infoText")
                .attr("x", -75)
                .attr("y", 220)
                .text(function(d, i) { return labelText[i]; });
        };
    };

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


        //create an SVG container for the PCP
        var pcpSvg = d3.select("body").append("svg")
            .attr("id", "pcpSvg")
            .attr("width", pcpWidth + margin.left + margin.right)
            .attr("height", pcpHeight + margin.top + margin.bottom)
          .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");// adds padding to group element in SVG

        //tooltip generator
        var tip = d3.tip()
          .attr('class', 'd3-tip')
          .offset([-1, 0])
          .html(function(d) {
            return "<span id='popup'>" + attrDesc[d] + "</span>";
          })

        //calls tooltip generator
        pcpSvg.call(tip);

        //adds legend to PCPsvg
        createLegend(pcpSvg);

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

        //add title to PCP
        var pcpTitle = pcpSvg.append("text")
            .attr("x", pcpWidth/9)
            .attr("y", -30)
            .attr("class", "pcpTitle")
            .text("Vulnerability of " + state + " Coast")
        //add helptext at bottom of pcp
        var pcpHelp = pcpSvg.append("text")
            .attr("x", 10)
            .attr("y", 295)
            .attr("class", "pcpHelp")
            .text("Click and drag vertically on any axis to filter lines. Click axis and drag horizontally to rearrange.")

        //create clear filters button
        var clearButton = createClearButton(pcpSvg);
        //create export button
        var exportButton = createExportButton(pcpSvg, state);

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
            });
        // Add a group element for each dimension (i.e., each axis)
        var pcpg = pcpSvg.selectAll(".dimension")
            .data(dimensions)
            .enter()
          .append("g")
            .attr("class", "dimension")
            .attr("transform", function(d) { return "translate(" + x(d) + ")"; })
            .call(d3.behavior.drag() //add ability to reorder axes
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
                .call(y[d].brush = d3.svg.brush().y(y[d])
                    .on("brushstart", brushstart)
                    .on("brush", brush));
            })
          .selectAll("rect")
            .attr("x", -8)
            .attr("width", 16);

        //highlights initial variable axis
        highlightAxis(expressed);

        //creates labels to express with hover/retrieve of data
        createInfoLabels(pcpSvg);

        //position generator for axis dragging
        function position(d) {
            var v = dragging[d];
            return v == null ? x(d) : v;
        };

        //transition generator for pcp
        function transition(g) {
            return pcpg.transition().duration(1500);
        };

        // Returns the path for a given datum
        function path(d) {
            return line(dimensions.map(function(p) { return [position(p), y[p](d[p])]; }));
        }

        //stops other events when brushing begins
        function brushstart() {
            d3.event.sourceEvent.stopPropagation();
        }

        // Handles a brush event, toggling the display of foreground lines.
        function brush() {
            //determines extent of brush to determine which pcp lines are active
            var actives = dimensions.filter(function(p) { return !y[p].brush.empty(); }),
                extents = actives.map(function(p) { return y[p].brush.extent(); });
            pcpForeground.attr("class", function(d) {
                return actives.every(function(p, i) {
                    return extents[i][0] <= d[p] && d[p] <= extents[i][1];
                }) ? null: "hidden";
            });
            //same thing but with coastal line segments
            activeCoast.attr("class", function(d) {
                return actives.every(function(p, i) {
                    return extents[i][0] <= d.properties[p] && d.properties[p] <= extents[i][1];
                }) ? null: "hidden";
            });
        };
    };

    //mouseover function for states
    function highlight(state){
        //change stroke
        var selected = d3.select("#"+state)
            .style({
                "stroke": "#fff",
                "stroke-width": "0.09em",
                "cursor": "pointer"
            });
    };
    //mouesout function for states
    function dehighlight(state){
        //remove stroke
        var selected = d3.select("#"+state)
            .style({"stroke": ""})
    };

    //remove pcp so that multiple ones aren't created
    function clearPCP(){
        d3.select("#pcpSvg")
            .remove();
        d3.select(".holder")
            .remove();
    };

    //creates clear filter button with SVG
    function createClearButton(pcpSvg) {
        //use "sandwich" of rect-text-rect to create clickable SVG button

        //set various variables to make codeblocks cleaner
        var width= 55, height=15,       // rect dimensions
            fontSize = 1.85*height/3,    // font fills rect
            x0 = pcpWidth - width - 10, y0 = pcpHeight + 3,
            x0Text = x0 + width/2, y0Text = y0 + 0.66*height,
            text = "Clear Filters";

        //create background of button; this will be styled
        var buttonBackground = pcpSvg.append("rect")  // button background
            .attr("class", "button")
            .attr("id","buttonBackground")
            .attr("width", width + "px")
            .attr("height", height + "px")
            .attr("x", x0)
            .attr("y", y0)
            .attr("ry", height/10);
        //add text to button
        var text = pcpSvg.append("text")  // button text
            .attr("class", "button")
            .attr("id","buttonText")
            .attr("x", x0Text)
            .attr("y", y0Text)
            .style("font-size", fontSize + "px")
            .text(text);
        //this is rectangle that is actually clicked; transparent
        pcpSvg.append("rect")
            .attr("class", "button")
            .attr("id","myButton")
            .attr("width", width + "px")
            .attr("height", height + "px")
            .attr("z-index", "10")
            .attr("x", x0)
            .attr("y", y0)
            .attr("ry", height/2)
            .on("click", clearFilters);

        //function called when button is clicked to clear all filters
        function clearFilters() {
            d3.selectAll(".extent")
                .attr("height", "0");

            d3.selectAll(".hidden")
                .attr("class", "")
        };
    };
    //creates button to export topojson and csv data of currently selected state
    function createExportButton(pcpSvg, state) {
        //set initial variables
        var width= 80, height=18,       // rect dimensions
        fontSize = 1.85*height/3,    // font fills rect
        x0 = -90, y0 = pcpHeight - 1,
        x0Text = x0 + width/2, y0Text = y0 + 0.66*height,
        text = "Export " + state + " Data";

        //create background of button; this will be styled
        pcpSvg.append("rect")
            .attr("class", "button")
            .attr("id","buttonBackground")
            .attr("width", width + "px")
            .attr("height", height + "px")
            .attr("x", x0)
            .attr("y", y0)
            .attr("ry", height/10)

        //add text to button
        var text = pcpSvg.append("text")
            .attr("class", "button")
            .attr("id","exportButtonText")
            .attr("x", x0Text)
            .attr("y", y0Text)
            .style("font-size", fontSize + "px")
            .text(text)

        //this is rectangle that is actually clicked; transparent
        pcpSvg.append("rect")
            .attr("class", "button")
            .attr("id","exportButton")
            .attr("width", width + "px")
            .attr("height", height + "px")
            .attr("z-index", "10")
            .attr("x", x0)
            .attr("y", y0)
            .attr("ry", height/2)
            .on("click", function(){
                downloadData("data/" + state + ".csv", "data/Coast_" + state + ".topojson");
            });

            //function that 'zips' both files
            var downloadData = function() {
                 for(var i=0; i<arguments.length; i++) {
                     var iframe = $('<iframe style="visibility: collapse;"></iframe>');
                     $('body').append(iframe);
                     var content = iframe[0].contentDocument;
                     var form = '<form action="' + arguments[i] + '" method="GET"></form>';
                     content.write(form);
                     $('form', content).submit();
                     setTimeout((function(iframe) {
                       return function() {
                         iframe.remove();
                       };
                     })(iframe), 2000);
               };
          };
    };
};
})();
