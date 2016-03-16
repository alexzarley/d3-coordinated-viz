//execute script when window is loaded
window.onload = setMap();

function setMap(){
    //use queue.js to parallelize asynchronous data loading
    queue()
        .defer(d3.csv, "data/CVIAttr.csv")//load attribute data
        .defer(d3.json, "data/States_WGS.topojson")//load state outline spatial data
        .defer(d3.json, "data/ATL_GULF_WGS.topojson")//load coastal segment spatial data
        .await(callback);

    function callback(error, csvData, states, coast){
        console.log(error);
        console.log(csvData);
        console.log(states);
        console.log(coast);
    }
};
