//execute script when window is loaded
window.onload = setMap();

function setMap(){

    //set map frame dimensions
    var width = 960, height = 460;

    //create svg container for map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

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

    //set variable to accessuse queue.js to parallelize asynchronous data loading
    var q = d3_queue.queue();
    //use queue to retrieve data from all files
    q
        .defer(d3.csv, "data/CVIAttr.csv")//load attribute data
        .defer(d3.json, "data/States_WGS.topojson")//load state outline spatial data
        .defer(d3.json, "data/ATL_GULF_WGS.topojson")//load coastal segment spatial data
        .await(callback);
    //function called once data has been retrieved from all .defer lines
    function callback(error, csvData, statesData, coastData){

        //convert topojsons into geojson objects
        var unitedStates = topojson.feature(statesData, statesData.objects.States_WGS),
            coastLine = topojson.feature(coastData, coastData.objects.ATL_GULF_WGS).features;

        //add states to map
        var states = map.append("path")
            .datum(unitedStates)
            .attr("class", "states")
            .attr("d", path);

        //add coastline to map
        var coast = map.selectAll(".coast")
            .data(coastLine)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "coast " + d.properties.ID;
            })
            .attr("d", path);
    };
};
