export default xSliceInteractor;

export function xSliceInteractor(state, plotlyPlot, d3, plot='xy') {
  // dispatch is the d3 event dispatcher: should have event "update" register
  var name = state.name;
  var dispatch = d3.dispatch("update");
  const subplot = plotlyPlot._fullLayout._plots[plot];
  const plotdiv = subplot.plot;
  let x = subplot.xaxis;
  let y = subplot.yaxis;
 
  var show_lines = (state.show_lines == null) ? true : state.show_lines;
  var show_range = (state.show_range == null) ? true : state.show_range;
  var fixed = (state.fixed == null) ? false : state.fixed;
  var cursor = (fixed) ? "auto" : "ew-resize";
    
  var xval_to_path = function(xval) {
    const xd = x.range;
    const yd = y.range.map(y.c2p);
    var pathstring = ""; 
    // start in the center and draw to the edge
    pathstring += "M" + x.c2p(xval).toFixed();
    pathstring += "," + yd[0].toFixed();
    pathstring += "L" + x.c2p(xval).toFixed();
    pathstring += "," + yd[1].toFixed();
    return pathstring
  }
         
  var state_to_paths = function(state) {
    // convert from cx, cy, angle_offset and angle_range to paths for
    // boundaries and center lines
    
    // calculate angles of graph corners
    if (show_lines) {
      var x1_line = xval_to_path(state.x1), 
          x2_line = xval_to_path(state.x2);
      
      return [
        {
          "path": x1_line,
          "classname": "x1 x-slice"
        },
        {
          "path": x2_line, 
          "classname": "x2 x-slice"
        }
      ]
    }
    else {
      return [];
    }
  }
  
  var state_to_rect = function(state) {
    if (show_range) {
      const [ y0, y1 ] = y.range.map(y.c2p).toSorted((a, b) => a - b);
      const [ x0, x1 ] = [ state.x1, state.x2 ].map(x.c2p).toSorted((a, b) => a - b);
      const rect = {
        "x": x0,
        "y": y0,
        "width": x1 - x0,
        "height": y1 - y0
      }
      return rect
    }
    else { 
      return null
    }
  }
    
  var drag_lines = d3.behavior.drag()
    .on("drag", dragmove_lines)
    .on("dragstart", function() { d3.event.sourceEvent.stopPropagation() });

  function interactor(selection) {
    var group = selection.append("g")
      .classed("interactors interactor-" + name, true)
      .style("pointer-events", "all")
      
    var fill = group.append("rect")
          .attr("class", "range-fill")
          .style("stroke", "none")
          .datum(state_to_rect(state))   
    fill
      .style("fill", state.color1)
          .attr("opacity", 0.1)
          .attr("x", function(d) {return d.x})
          .attr("y", function(d) {return d.y})
          .attr("width", function(d) {return d.width})
          .attr("height", function(d) {return d.height})
          
    var lines_group = group.append("g")
          .attr("class", "lines-group")
          .style("fill", "none")
          .style("cursor", cursor)
          .style("stroke", state.color1)
          .style("stroke-width", "7px");
          
    var lines = lines_group.selectAll(".lines")
      .data(state_to_paths(state))
        .enter().append("path")
        .attr("class", function(d) {return d['classname']})
        .classed("lines", true)
        .attr("d", function(d) {return d['path']})
        .style("cursor", cursor)
    if (!fixed) lines.call(drag_lines);
    
    
    
    interactor.update = function(preventPropagation) {      
      group.selectAll('rect').datum(state_to_rect(state))
        .attr("x", function(d) {return d.x})
        .attr("y", function(d) {return d.y})
        .attr("width", function(d) {return d.width})
        .attr("height", function(d) {return d.height})
        
      group.selectAll('.lines')
        .data(state_to_paths(state))
        .attr("d", function(d) {return d['path']})
      // fire!
      if (!preventPropagation) {
        dispatch.update();
      }
    }
  }
  
  function dragmove_lines() {
    var new_x = x.p2c(d3.event.x);
    if (d3.select(this).classed("x1")) {
        state.x1 = new_x;
    }
    else {
        state.x2 = new_x;
    }
    interactor.update();
  }
  
  interactor.x = function(_) {
    if (!arguments.length) return x;
    x = _;
    return interactor;
  };

  interactor.y = function(_) {
    if (!arguments.length) return y;
    y = _;
    return interactor;
  };
  
  function relayout() {
    x = subplot.xaxis;
    y = subplot.yaxis;
    interactor.update();
  }

  interactor(plotdiv);
  plotlyPlot.on('plotly_relayout', relayout);
  plotlyPlot.on('plotly_afterplot', relayout);
   
  interactor.state = state;
  interactor.dispatch = dispatch;
  
  return interactor
}