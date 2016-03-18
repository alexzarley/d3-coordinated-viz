(function(){

window.onload = setMap();
//pseudo-global variables
//array of variables used in for loops
var attrArray = ["ERRRISK", "GEOM", "SLRISK", "TIDERISK", "WAVERISK", "CVIRISK"]
var expressed = attrArray[0]; //initial attribute

//execute script when window is loaded

function setMap() {
    var width = 960,
        height = 460,
        centered;

    // var projection = d3.geo.albersUsa()
    //     .scale(1070)
    //     .translate([width / 2, height / 2]);

    // var path = d3.geo.path()
    //     .projection(projection);
        //create svg container for map
    // var map = d3.select("body")
    //     .append("svg")
    //     .attr("class", "map")
    //     .attr("width", width)
    //     .attr("height", height);

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
        .defer(d3.csv, "data/NormAttributes.csv")//load attribute data
        .defer(d3.json, "data/states.topojson")//load state outline spatial data
        .defer(d3.json, "data/ATL_GULF_WGS.topojson")//load coastal segment spatial data
        .await(callback);
    //function called once data has been retrieved from all .defer lines
    function callback(error, csvData, statesData, coastData){

        //convert topojsons into geojson objects; coastLine is an array full of objects
        var unitedStates = topojson.feature(statesData, statesData.objects.states),
            coastLine = topojson.feature(coastData, coastData.objects.ATL_GULF_WGS).features;

        g.append("g")
            .attr("id", "states")
          .selectAll("path")
            .data(unitedStates.features)
          .enter().append("path")
            .attr("d", path)
            .on("click", clicked);

        g.append("path")
            .datum(topojson.mesh(statesData, statesData.objects.states, function(a, b) { return a !== b; }))
            .attr("id", "state-borders")
            .attr("d", path);

        //join CSV data to GeoJSON enumeration units
        coastline = joinData(coastLine, csvData);
        //create color scale
        var colorScale = makeColorScale(csvData);
        //draw coast
        setEnumerationUnits (coastline, svg, path, colorScale);

    };
    function clicked(d) {
        var x, y, k;

        if (d && centered !== d) {
          var centroid = path.centroid(d);
          x = centroid[0];
          y = centroid[1];
          k = 4;
          centered = d;
        } else {
          x = width / 2;
          y = height / 2;
          k = 1;
          centered = null;
        }

        g.selectAll("path")
            .classed("active", centered && function(d) { return d === centered; });

        g.transition()
            .duration(750)
            .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
            .style("stroke-width", 1.5 / k + "px");
    };

    //function to create color scale generator
    function makeColorScale(data){
        var colorClasses = [
            "#D7191C",
            "#FDAE61",
            "#FFFFBF",
            "#A6D96A",
            "#1A9641"
        ];

        //create color scale generator
        var colorScale = d3.scale.threshold()
            .domain([1.1, 2.1, 3.1, 4.1])
            .range(colorClasses);

        // //build array of all values of the expressed attribute
        // var domainArray = [];
        // for (var i=0; i<data.length; i++){
        //       var val = parseFloat(data[i][expressed]);
        //       domainArray.push(val);
        // };
        // //cluser data using ckmeans clustering algorithm to create natural breaks
        // var clusters = ss.ckmeans(domainArray, 5);
        // //reset domain array to cluster minimums
        // domainArray = clusters.map(function(d){
        //     return d3.max(d);
        // });
        // //remove first value from domain array to create class breakpoints
        // domainArray.shift();
        //
        // //assign array of last 4 cluster minimus as domain
        // colorScale.domain(domainArray);
        // console.log(clusters);
        return colorScale;
    }

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
                    attrArray.forEach(function(attr){
                        var val =  parseFloat(csvCoast[attr]) //get CSV attribute values
                        geojsonProps[attr] = val; //assgin attribute and value to geojson properties
                    });
                };
            };
        };
        return coastLine;
    };

    function choropleth(props, colorScale){
        //checks that attribute value is a number
        var val = parseFloat(props[expressed]);
        //if attribute value exists, assign a color; assign gray
        if (val && val != NaN){
            return colorScale(val);
        } else {
            return "#CCC";
        };
    };

    //create coastline enumeration area on map
    function setEnumerationUnits(coastLine, svg, path, colorScale){
        var coast = svg.selectAll(".coast")
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

        // //join CSV data to GeoJSON enumeration units
        // coastline = joinData(coastLine, csvData);
        // //create color scale
        // var colorScale = makeColorScale(csvData);
        //
        // setEnumerationUnits (coastline, map, path, colorScale);

    // d3.json("data/states.topojson", function(error, us) {
    //   if (error) throw error;

      // g.append("g")
      //     .attr("id", "states")
      //   .selectAll("path")
      //     .data(topojson.feature(us, us.objects.states).features)
      //   .enter().append("path")
      //     .attr("d", path)
      //     .on("click", clicked);
      //
      // g.append("path")
      //     .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
      //     .attr("id", "state-borders")
      //     .attr("d", path);
    // });
















// (function(){
// //pseudo-global variables
// //array of variables used in for loops
// var attrArray = ["ERRRISK", "GEOM", "SLRISK", "TIDERISK", "WAVERISK", "CVIRISK"]
// var expressed = attrArray[0]; //initial attribute
//
// //execute script when window is loaded
// window.onload = setMap();
//
//     function setMap(){
//
//         //set map frame dimensions
//         var width = 960, height = 460;
//
//         //create svg container for map
//         var map = d3.select("body")
//             .append("svg")
//             .attr("class", "map")
//             .attr("width", width)
//             .attr("height", height);
//
//         //create projection centered on 36N, 78W
//         var projection = d3.geo.conicConformal()
//             .center([0, 36])//set central coordinates of plane
//             .rotate([78, 0, 15])//set central meridian and parallel and rotation degree
//             .parallels([29.5, 45.5])//specify standard parallels
//             .scale(1000)
//             .translate([width / 2, height / 2]);
//
//         //generator to draw path of projection
//         var path = d3.geo.path()
//             .projection(projection);
//
//         //set variable to accessuse queue.js to parallelize asynchronous data loading
//         var q = d3_queue.queue();
//         //use queue to retrieve data from all files
//         q
//             .defer(d3.csv, "data/NormAttributes.csv")//load attribute data
//             .defer(d3.json, "data/States_WGS.topojson")//load state outline spatial data
//             .defer(d3.json, "data/ATL_GULF_WGS.topojson")//load coastal segment spatial data
//             .await(callback);
//         //function called once data has been retrieved from all .defer lines
//         function callback(error, csvData, statesData, coastData){
//
//             //convert topojsons into geojson objects; coastLine is an array full of objects
//             var unitedStates = topojson.feature(statesData, statesData.objects.States_WGS),
//                 coastLine = topojson.feature(coastData, coastData.objects.ATL_GULF_WGS).features;
//
//             //add states to map
//             var states = map.append("path")
//                 .datum(unitedStates)
//                 .attr("class", "states")
//                 .attr("d", path);
//
//             //join CSV data to GeoJSON enumeration units
//             coastline = joinData(coastLine, csvData);
//             //create color scale
//             var colorScale = makeColorScale(csvData);
//
//             setEnumerationUnits (coastline, map, path, colorScale);
//         };
//     };
//     //function to create color scale generator
//     function makeColorScale(data){
//         var colorClasses = [
//             "#D7191C",
//             "#FDAE61",
//             "#FFFFBF",
//             "#A6D96A",
//             "#1A9641"
//         ];
//
//         //create color scale generator
//         var colorScale = d3.scale.threshold()
//             .domain([1.1, 2.1, 3.1, 4.1])
//             .range(colorClasses);
//
//         // //build array of all values of the expressed attribute
//         // var domainArray = [];
//         // for (var i=0; i<data.length; i++){
//         //       var val = parseFloat(data[i][expressed]);
//         //       domainArray.push(val);
//         // };
//         // //cluser data using ckmeans clustering algorithm to create natural breaks
//         // var clusters = ss.ckmeans(domainArray, 5);
//         // //reset domain array to cluster minimums
//         // domainArray = clusters.map(function(d){
//         //     return d3.max(d);
//         // });
//         // //remove first value from domain array to create class breakpoints
//         // domainArray.shift();
//         //
//         // //assign array of last 4 cluster minimus as domain
//         // colorScale.domain(domainArray);
//         // console.log(clusters);
//         return colorScale;
//     }
//
//     //function to join geojson to csv data and return to callback function
//     function joinData(coastLine, csvData){
//         //loop through csv to assign each set of csv attribute valeus
//         for (var i=0; i<csvData.length; i++){
//             var csvCoast = csvData[i]; //current stretch of coast
//             var csvKey = csvCoast.NEWID //CSV primary key
//
//             //loop through geojson coastlines to find correct stretch of coast
//             for (var a=0; a<coastLine.length; a++) {
//                 var geojsonProps = coastLine[a].properties; //the current coastline's properties
//                 var geojsonKey = geojsonProps.ID; //the ID of the current coastline to join tho CSV attributes
//
//                 //when primary keys match, transfer csv data to geojson properties objects
//                 if (geojsonKey == csvKey) {
//
//                     //assign all attributes and values
//                     attrArray.forEach(function(attr){
//                         var val =  parseFloat(csvCoast[attr]) //get CSV attribute values
//                         geojsonProps[attr] = val; //assgin attribute and value to geojson properties
//                     });
//                 };
//             };
//         };
//         return coastLine;
//     };
//
//     function choropleth(props, colorScale){
//         //checks that attribute value is a number
//         var val = parseFloat(props[expressed]);
//         //if attribute value exists, assign a color; assign gray
//         if (val && val != NaN){
//             return colorScale(val);
//         } else {
//             return "#CCC";
//         };
//     };
//
//     //create coastline enumeration area on map
//     function setEnumerationUnits(coastLine, map, path, colorScale){
//         var coast = map.selectAll(".coast")
//             .data(coastLine)
//             .enter()
//             .append("path")
//             .attr("class", function(d){
//                 return "coast " + d.properties.ID;
//             })
//             .attr("d", path)
//             .style("stroke", function(d){
//                 return choropleth(d.properties, colorScale);
//             });
//     };
// })();



// (function(){
// //pseudo-global variables
// //array of variables used in for loops
// var attrArray = ["ERRRISK", "GEOM", "SLRISK", "TIDERISK", "WAVERISK", "CVIRISK"]
// var expressed = attrArray[0]; //initial attribute
//
// //execute script when window is loaded
// window.onload = setMap();
//
//     function setMap(){
//
//         //set map frame dimensions
//         var width = 960,
//             height = 460
//             // centered;
//
//         var svg = d3.select("body")
//             .append("svg")
//             .attr("width", width)
//             .attr("height", height);
//
//         //create svg container for map
//         var map = d3.select("body")
//             .append("svg")
//             .attr("class", "map")
//             .attr("width", width)
//             .attr("height", height);
//
//         //create projection centered on 36N, 78W
//         var projection = d3.geo.conicConformal()
//             .center([0, 36])//set central coordinates of plane
//             .rotate([78, 0, 15])//set central meridian and parallel and rotation degree
//             .parallels([29.5, 45.5])//specify standard parallels
//             .scale(1000)
//             .translate([width / 2, height / 2]);
//
//         //generator to draw path of projection
//         var path = d3.geo.path()
//             .projection(projection);
//
//         //set variable to accessuse queue.js to parallelize asynchronous data loading
//         var q = d3_queue.queue();
//         //use queue to retrieve data from all files
//         q
//             .defer(d3.csv, "data/NormAttributes.csv")//load attribute data
//             .defer(d3.json, "data/States_WGS.topojson")//load state outline spatial data
//             .defer(d3.json, "data/ATL_GULF_WGS.topojson")//load coastal segment spatial data
//             .await(callback);
//         //function called once data has been retrieved from all .defer lines
//         function callback(error, csvData, statesData, coastData){
//
//             //convert topojsons into geojson objects; coastLine is an array full of objects
//             var unitedStates = topojson.feature(statesData, statesData.objects.States_WGS),
//                 coastLine = topojson.feature(coastData, coastData.objects.ATL_GULF_WGS).features;
//
//             //add states to map
//             var states = map.append("path")
//                 .datum(unitedStates)
//                 .attr("class", "states")
//                 .attr("d", path);
//             console.log(states);
//             console.log(coastLine);
//             //join CSV data to GeoJSON enumeration units
//             coastline = joinData(coastLine, csvData);
//             //create color scale
//             var colorScale = makeColorScale(csvData);
//
//             setEnumerationUnits (coastline, map, path, colorScale);
//         };
//     };
//     //function to create color scale generator
//     function makeColorScale(data){
//         var colorClasses = [
//             "#D7191C",
//             "#FDAE61",
//             "#FFFFBF",
//             "#A6D96A",
//             "#1A9641"
//         ];
//
//         //create color scale generator
//         var colorScale = d3.scale.threshold()
//             .domain([1.1, 2.1, 3.1, 4.1])
//             .range(colorClasses);
//
//         // //build array of all values of the expressed attribute
//         // var domainArray = [];
//         // for (var i=0; i<data.length; i++){
//         //       var val = parseFloat(data[i][expressed]);
//         //       domainArray.push(val);
//         // };
//         // //cluser data using ckmeans clustering algorithm to create natural breaks
//         // var clusters = ss.ckmeans(domainArray, 5);
//         // //reset domain array to cluster minimums
//         // domainArray = clusters.map(function(d){
//         //     return d3.max(d);
//         // });
//         // //remove first value from domain array to create class breakpoints
//         // domainArray.shift();
//         //
//         // //assign array of last 4 cluster minimus as domain
//         // colorScale.domain(domainArray);
//         // console.log(clusters);
//         return colorScale;
//     }
//
//     //function to join geojson to csv data and return to callback function
//     function joinData(coastLine, csvData){
//         //loop through csv to assign each set of csv attribute valeus
//         for (var i=0; i<csvData.length; i++){
//             var csvCoast = csvData[i]; //current stretch of coast
//             var csvKey = csvCoast.NEWID //CSV primary key
//
//             //loop through geojson coastlines to find correct stretch of coast
//             for (var a=0; a<coastLine.length; a++) {
//                 var geojsonProps = coastLine[a].properties; //the current coastline's properties
//                 var geojsonKey = geojsonProps.ID; //the ID of the current coastline to join tho CSV attributes
//
//                 //when primary keys match, transfer csv data to geojson properties objects
//                 if (geojsonKey == csvKey) {
//
//                     //assign all attributes and values
//                     attrArray.forEach(function(attr){
//                         var val =  parseFloat(csvCoast[attr]) //get CSV attribute values
//                         geojsonProps[attr] = val; //assgin attribute and value to geojson properties
//                     });
//                 };
//             };
//         };
//         return coastLine;
//     };
//
//     function choropleth(props, colorScale){
//         //checks that attribute value is a number
//         var val = parseFloat(props[expressed]);
//         //if attribute value exists, assign a color; assign gray
//         if (val && val != NaN){
//             return colorScale(val);
//         } else {
//             return "#CCC";
//         };
//     };
//
//     //create coastline enumeration area on map
//     function setEnumerationUnits(coastLine, map, path, colorScale){
//         var coast = map.selectAll(".coast")
//             .data(coastLine)
//             .enter()
//             .append("path")
//             .attr("class", function(d){
//                 return "coast " + d.properties.ID;
//             })
//             .attr("d", path)
//             .style("stroke", function(d){
//                 return choropleth(d.properties, colorScale);
//             });
//     };
// })();
