//fix alabama topojson

(function(){

window.onload = setMap();
//pseudo-global variables
// var attrArray = ["TIDE_M", "SLOPE_PCT", "ERR_M_YR", "SL_MM_YR_", "GEOM", "WAVES_M", "CVIRISK"];
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
    var width = 960,
        height = 460,
        centered;

    //create projection centered on 36N, 78W
    var projection = d3.geo.conicConformal()
        .center([0, 36])//set central coordinates of plane
        .rotate([78, 0, 15])//set central meridian and parallel and rotation degree
        .parallels([29.5, 45.5])//specify standard parallels
        .scale(1000)
        .translate([width / 2, height / 2]);

    //generator to draw path of projection
    var path = d3.geo.path()
        .projection(projection);

    var svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height);

    svg.append("rect")
        .attr("class", "background")
        .attr("width", width)
        .attr("height", height)
        .on("click", clicked);

    var g = svg.append("g");
    //set variable to accessuse queue.js to parallelize asynchronous data loading

    var q = d3_queue.queue();
    //use queue to retrieve data from all files
    q
        // .defer(d3.csv, "data/CVIRaw.csv")//load attribute data
        .defer(d3.json, "data/CoastStates.topojson")
        // .defer(d3.json, "data/Coast_CT.topojson")
        .defer(d3.json, "data/Basemap.topojson")//load state outline spatial data
        // .defer(d3.json, "data/ATL_GULF_WGS.topojson")//load coastal segment spatial data
        .await(callback);
    //function called once data has been retrieved from all .defer lines
    // function callback(error, csvData, coastStatesData, basemapData, coastData){
    function callback(error, coastStatesData, basemapData){

        // console.log(coastCTData);
        // console.log(coastData);
        //convert topojsons into geojson objects; coastLine is an array full of objects
        var coastStates = topojson.feature(coastStatesData, coastStatesData.objects.CoastStates).features,
            // coastLine = topojson.feature(coastData, coastData.objects.ATL_GULF_WGS).features,
            basemap = topojson.feature(basemapData, basemapData.objects.Basemap).features;
            // coastCT = topojson.feature(coastCTData, coastCTData.objects.Coast_CT).features;
            // console.log(coastStatesData);
            // console.log(basemapData);
            // console.log(coastCT);
            // console.log(coastLine);
        g.append("g")
            .attr("id", "states")
          .selectAll("path")
            .data(coastStates)
          .enter().append("path")
            .attr("d", path)
            .on("click", clicked);

        g.append("path")
            .datum(topojson.mesh(coastStatesData, coastStatesData.objects.CoastStates, function(a, b) { return a !== b; }))
            .attr("id", "state-borders")
            .attr("d", path);

        g.append("g")
            .attr("class", "basemap")
            .selectAll(".basemap")
            .data(basemap)
            .enter()
            .append("path")
            .attr("d", path)

        //trying to get a path to draw for other states
        g.append("path")
            .datum(topojson.mesh(basemapData, basemapData.objects.Basemap, function(a, b) { return a !== b; }))
            .attr("class", "basemap-borders")
            .attr("d", path);

        // //join CSV data to GeoJSON enumeration units
        // coastLine = joinData(coastLine, csvData);
        // //create color scale
        // var colorScale = makeColorScale(csvData);
        // //draw coast
        // setEnumerationUnits (coastLine, svg, path, colorScale);
    };
    function clicked(d) {
        var x, y, k;
        if (d && centered !== d) {
            var centroid = path.centroid(d);
            x = centroid[0];
            y = centroid[1];
            k = 4;
            centered = d;
            //add funciton to undraw the coastline previously?
            drawCoast(d);
        } else {
          x = width / 2;
          y = height / 2;
          k = 1;
          centered = null;
          //add funciton to undraw the coastline previously?
        }

        g.selectAll("path")
            .classed("active", centered && function(d) { return d === centered; });

        g.transition()
            .duration(750)
            .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
            .style("stroke-width", 1.5 / k + "px");
    };

    function drawCoast(d){
        var state = d.properties.State;
        var q = d3_queue.queue();
        //use queue to retrieve data from all files
        q
            .defer(d3.csv, "data/" + state + ".csv")//load attribute data
            .defer(d3.json, "data/Coast_" + state + ".topojson")
            .await(function(error, csvData, coastData){
                stateCallback(error, csvData, coastData, state);
            });
    };
    function stateCallback(error, csvData, coastData, state){
        // console.log(csvData);
        // console.log(coastData);
        var stateObj = "Coast_" + state;
        // console.log(stateObj);
        // console.log(coastData);
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
                    // //assign all attributes and values
                    // attrArray.forEach(function(attr){
                    //     var val =  parseFloat(csvCoast[attr]) //get CSV attribute values
                    //     geojsonProps[attr] = val; //assgin attribute and value to geojson properties
                    // });
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
})();
