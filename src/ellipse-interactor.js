import { dispatch as d3_dispatch } from 'd3-dispatch';
import { drag as d3_drag } from 'd3-drag';
import { getInteractorLayer } from './interactor-layer';

export default ellipseInteractor;

const default_state = {
  cx: 1,
  cy: 1,
  rx: 1,
  ry: 1,
  fixed: false,
  point_radius: 6,
  color1: 'red',
  color2: 'blue',
  show_lines: true,
  show_center: true,
  show_points: true,
};

export function ellipseInteractor(state, plotlyPlot, plot='xy') {
  // set defaults:
  if (!('ry' in state)) {
    state.ry = Math.abs(state.rx ?? default_state.rx);
  }
  Object.entries(default_state).forEach(([key, value]) => {
    if (!(key in state)) {
      state[key] = value;
    }
  });
  const { name } = state;
  // dispatch is the d3 event dispatcher: should have event "update" register
  // state: {cx: ..., cy: ..., rx: ..., ry: ...}
  // if dragging the ellipse itself, the eccentricity (ry/rx) is preserved
  const dispatch = d3_dispatch("update", "start", "end");
  const { interactorlayer, subplot, clipid } = getInteractorLayer(plotlyPlot, plot);

  let x = subplot.xaxis;
  let y = subplot.yaxis;
  function x_c2p(xc) {
    return x.c2p(xc) + x._offset;
  }
  function y_c2p(yc) {
    return y.c2p(yc) + y._offset;
  }
  //if (x.name != 'i' || y.name != 'i') {
  //  throw "circle only defined for linear scales";
  //  return
  //}
  const cursor = (state.fixed) ? "auto" : "move";
         
  function state_to_ellipse(state) {
    // convert from xmin, xmax... to pairs of points for circle
    if (state.show_lines) {
      return [
        {cx: state.cx, cy: state.cy, rx: state.rx, ry: state.ry}
      ]
    }
    else {
      return [];
    }
  }
  
  function state_to_points(state) {
    if (state.show_points) {
      return [
        [state.cx + state.rx, state.cy],
        [state.cx, state.cy + state.ry]
      ]
    }
    else { 
      return [];
    }
  }
  
  function state_to_center(state) {
    if (state.show_center) {
      return [
        [state.cx, state.cy],
      ]
    }
    else { 
      return [];
    }
  }
  
  const drag_corner = d3_drag()
    .on("drag", dragmove_corner)
    .on("start", function(event) {
      event.sourceEvent.stopPropagation();
      dispatch.call("start");
    })
    .on("end", function() { dispatch.call("end") });
  
  const drag_center = d3_drag()
    .on("drag", dragmove_center)
    .on("start", function(event) {
      event.sourceEvent.stopPropagation();
      dispatch.call("start");
    })
    .on("end", function() { dispatch.call("end") });
    
  const drag_edge = d3_drag()
    .on("drag", dragmove_edge)
    .on("start", function(event) {
      event.sourceEvent.stopPropagation();
      dispatch.call("start");
    })
    .on("end", function() { dispatch.call("end") });
  

  function interactor(selection) {
    const group = selection.append("g")
      .classed("interactors interactor-" + name, true)
      .style("pointer-events", "all")

    const edges = group.append("g")
          .attr("class", "edges")
          .style("stroke", state.color1)
          .style("stroke-linecap", "round")
          .selectAll(".edge")
        .data(state_to_ellipse(state))
          .enter().append("ellipse")
          .classed("edge", true)
          .attr("fill", state.fill)
          .attr("fill-opacity", 0.1)
          .attr("stroke-width", "4px")
          .attr("cx", function(d) {return x_c2p(d['cx'])})
          .attr("cy", function(d) {return y_c2p(d['cy'])})
          .attr("rx", function(d) {return Math.abs(x_c2p(d['rx'] + d['cx']) - x_c2p(d['cx']))})
          .attr("ry", function(d) {return Math.abs(y_c2p(d['ry'] + d['cy']) - y_c2p(d['cy']))})
          .attr("clip-path", `url('#${clipid}')`);         
    // if (!state.fixed) edges.call(drag_edge);
    
    const corners = group.append("g")
      .classed("corners", true)
      .attr("fill", state.color1)
      .selectAll("corner")
      .data(state_to_points(state))
        .enter().append("circle")
        .classed("corner", true)
        .style("cursor", function(d, i) { return (i == 0) ? "ew-resize" : "ns-resize" })
        .attr("vertex", function(d,i) { return i.toFixed()})
        .attr("r", state.point_radius)
        .attr("cx", function(d) {return x_c2p(d[0])})
        .attr("cy", function(d) {return y_c2p(d[1])})
        .attr("clip-path", `url('#${clipid}')`);
    if (!state.fixed) corners.call(drag_corner);
    
    const center_group = group.append("g")
      .classed("center_group", true)
      .attr("fill", state.color1)
      .selectAll("center")
      .data(state_to_center(state))
        .enter().append("circle")
        .classed("center", true)
        .style("cursor", cursor)
        .attr("r", state.point_radius)
        .attr("cx", function(d) {return x_c2p(d[0])})
        .attr("cy", function(d) {return y_c2p(d[1])})
        .attr("clip-path", `url('#${clipid}')`);
    if (!state.fixed) center_group.call(drag_center);

    interactor.update = function(preventPropagation) {
      const cursor = (state.fixed) ? "auto" : "move";
      // group.style("cursor", cursor);
      group.selectAll('.center').data(state_to_center(state))
        .attr("cx", function(d) { return x_c2p(d[0]); })
        .attr("cy", function(d) { return y_c2p(d[1]); });
        
      group.selectAll('.corner').data(state_to_points(state))
        .attr("cx", function(d) { return x_c2p(d[0]); })
        .attr("cy", function(d) { return y_c2p(d[1]); });
        
      group.selectAll('.edge').data(state_to_ellipse(state))
        .attr("cx", function(d) {return x_c2p(d['cx'])})
        .attr("cy", function(d) {return y_c2p(d['cy'])})
        .attr("rx", function(d) {return Math.abs(x_c2p(d['rx'] + d['cx']) - x_c2p(d['cx']))})
        .attr("ry", function(d) {return Math.abs(y_c2p(d['ry'] + d['cy']) - y_c2p(d['cy']))});
        
      // fire!
      if (!preventPropagation) {
        dispatch.call("update", this, state);
      }
    }
  }
  
  function dragmove_corner(event) {
    const new_x = x.p2c(event.x - x._offset);
    const new_y = y.p2c(event.y - y._offset);
    const vertex = parseInt(this.getAttribute("vertex"));
    // enforce relationship between corners:
    switch (vertex) {
      case 0:
        state.rx = new_x - state.cx;
        break
      case 1:
        state.ry = new_y - state.cy;
        break
      default:
    }
    interactor.update();
  }
  
  function dragmove_center(event) {
    state.cx = x.p2c(x.c2p(state.cx) + event.dx);
    state.cy = y.p2c(y.c2p(state.cy) + event.dy);
    interactor.update();
  }
  
  
  function dragmove_edge(event) {
    const eccentricity = state.ry / state.rx;
    const new_x = x.p2c(event.x - x._offset);
    const new_y = y.p2c(event.y - y._offset);
    const new_rx = Math.sqrt(Math.pow(new_x - state.cx, 2) + Math.pow(new_y - state.cy, 2)/Math.pow(eccentricity, 2));
    const new_ry = eccentricity * new_rx;
    state.rx = new_rx;
    state.ry = new_ry;
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
