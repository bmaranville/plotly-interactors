import { dispatch as d3_dispatch } from 'd3-dispatch';
import { select as d3_select } from 'd3-selection';
import { drag as d3_drag } from 'd3-drag';

export default angleSliceInteractor;

const default_state = {
  cx: 1,
  cy: 1,
  mirror: true,
  angle_offset: Math.PI/4.0,
  angle_range: Math.PI/10.0,
  fixed: false,
  point_radius: 6,
  color1: 'red',
  color2: 'blue',
  show_lines: true,
  show_center: true,
};

export function angleSliceInteractor(state, plotlyPlot, plot='xy') {
  // Set defaults:
  Object.entries(default_state).forEach(([key, value]) => {
    if (!(key in state)) {
      state[key] = value;
    }
  });
  const { name } = state;
  // state: {cx: ..., cy: ..., angle_offset: ..., angle_range: ...}
  // angle is in pixel coords

  // dispatch is the d3 event dispatcher: should have event "update" register
  var dispatch = d3_dispatch("update");
  const subplot = plotlyPlot._fullLayout._plots[plot];
  const clipId = subplot.clipId.replace(/plot$/, '');
  const shapelayer = plotlyPlot._fullLayout._shapeUpperLayer;
  const layer_above = d3_select(shapelayer.node().parentNode);
  // create interactor layer, if not exists:
  layer_above.selectAll("g.interactorlayer")
    .data(["interactors"])
    .enter().append("g")
    .classed("interactorlayer", true);
  const interactorlayer = layer_above.selectAll("g.interactorlayer");
  let x = subplot.xaxis;
  let y = subplot.yaxis;
  function x_c2p(xc) {
    return x.c2p(xc) + x._offset;
  }
  function y_c2p(yc) {
    return y.c2p(yc) + y._offset;
  }
  
  // TODO: need to check for linear scale somehow - doesn't work otherwise


  function get_cursor() {
    return (state.fixed) ? "auto" : "move";
  }
  
  function angle_to_path(cx, cy, angle) {
    const yd = y.range.map(y_c2p);
    const xd = x.range.map(x_c2p);
    const rm = Math.sqrt(Math.pow(xd[1] - xd[0], 2) + Math.pow(yd[1] - yd[0], 2));        

    const s = Math.sin(angle),
        c = Math.cos(angle),
        cxp = x_c2p(cx),
        cyp = y_c2p(cy);
        
    const y1 = cyp - rm * s,
        y2 = cyp + rm * s,
        x1 = cxp + rm * c,
        x2 = cxp - rm * c;
        
    let pathstring = ""; 
    // start in the center and draw to the edge
    pathstring += "M" + cxp.toFixed();
    pathstring += "," + cyp.toFixed();
    pathstring += "L" + x1.toFixed();
    pathstring += "," + y1.toFixed();
    if (state.mirror) {
      // and back to the center to draw the other sector
      pathstring += "M" + cxp.toFixed();
      pathstring += "," + cyp.toFixed();
      pathstring += "L" + x2.toFixed();
      pathstring += "," + y2.toFixed();
    }
    return pathstring
  }
         
  var state_to_paths = function(state) {
    // convert from cx, cy, angle_offset and angle_range to paths for
    // boundaries and center lines
    
    // calculate angles of graph corners
    if (state.show_lines) {
      var centerline = angle_to_path(state.cx, state.cy, state.angle_offset), 
          upperline = angle_to_path(state.cx, state.cy, state.angle_offset + state.angle_range/2.0), 
          lowerline = angle_to_path(state.cx, state.cy, state.angle_offset - state.angle_range/2.0);
      
      return [
        {
          "path": centerline,
          "classname": "centerline"
        },
        {
          "path": upperline, 
          "classname": "upperline"
        },
        {
          "path": lowerline, 
          "classname": "lowerline"
        }
      ]
    }
    else {
      return [];
    }
  }
  
  var state_to_center = function(state) {
    if (state.show_center) {
      return [
        [state.cx, state.cy],
      ]
    }
    else { 
      return [];
    }
  }
  
  var drag_center = d3_drag()
    .on("start", function(ev) { ev.sourceEvent.stopPropagation(); })
    .on("drag", dragmove_center)

  var drag_lines = d3_drag()
    .on("drag", dragmove_lines)
    .on("start", function(ev) { ev.sourceEvent.stopPropagation(); });

  function interactor(selection, x_offset=0, y_offset=0) {
    var group = selection.append("g")
      .classed("interactors interactor-" + name, true)
      .style("cursor", get_cursor())
      .style("pointer-events", "all")
      .attr("transform", "translate(" + x_offset + "," + y_offset + ")");  
    var lines_group = group.append("g")
          .attr("class", "lines_group")
          .style("fill", "none")
          .attr("vector-effect", "non-scaling-stroke")
          .style("stroke", state.color2)
          .style("stroke-width", "4px");
          
    var lines = lines_group.selectAll(".lines")
      .data(state_to_paths(state))
        .enter().append("path")
        .attr("class", function(d) {return d['classname']})
        .attr("vector-effect", "non-scaling-stroke")
        .classed("lines", true)
        .attr("d", function(d) {return d['path']})
        .attr("clip-path", `url('#${clipId}')`)
    if (!state.fixed) {
      lines.call(drag_lines);
      lines
        
    }
    
    var center_group = group.append("g")
      .classed("center_group", true)
      .attr("fill", state.color1)
      .selectAll("center")
      .data(state_to_center(state))
        .enter().append("circle")
        .classed("center", true)
        .attr("r", state.point_radius)
        .attr("cx", function(d) {return x_c2p(d[0])})
        .attr("cy", function(d) {return y_c2p(d[1])})
        .attr("clip-path", `url('#${clipId}')`)
    if (!state.fixed) {
      center_group.call(drag_center);
    } 

    interactor.update = function(preventPropagation) {
      group.select('.center')
        .attr("cx", x_c2p(state.cx))
        .attr("cy", y_c2p(state.cy));
      
      lines_group.selectAll('.lines')
        .data(state_to_paths(state))
        .attr("d", function(d) {return d['path']})

      // fire!
      if (!preventPropagation) {
        dispatch.call("update", this, state);
      }
    }
    
  }
  
  function dragmove_center(ev) {
    state.cx = x.p2c(x.c2p(state.cx) + ev.dx);
    state.cy = y.p2c(y.c2p(state.cy) + ev.dy);
    interactor.update();
  }
  
  
  function dragmove_lines(ev) {
    var new_angle = Math.atan2(y_c2p(state.cy) - ev.y, ev.x - x_c2p(state.cx));
    if (d3_select(this).classed("centerline")) {
      state.angle_offset = new_angle;
    }
    else if (d3_select(this).classed("upperline")) {
      state.angle_range = 2.0 * (new_angle - state.angle_offset);
    }
    else if (d3_select(this).classed("lowerline")) {
      state.angle_range = -2.0 * (new_angle - state.angle_offset);
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
    interactor.update(true);
  }
  
  interactor(interactorlayer);
  plotlyPlot.on('plotly_relayout', relayout);
  plotlyPlot.on('plotly_afterplot', relayout);
  plotlyPlot.on('plotly_relayouting', relayout);
   
  interactor.state = state;
  interactor.dispatch = dispatch;
  
  return interactor
}
