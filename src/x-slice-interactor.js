import { dispatch as d3_dispatch } from 'd3-dispatch';
import { select as d3_select } from 'd3-selection';
import { drag as d3_drag } from 'd3-drag';

export default xSliceInteractor;

const default_state = {
  x1: 0,
  x2: 0,
  show_lines: true,
  show_range: true,
  color1: "blue",
  fixed: false
};

export function xSliceInteractor(state, plotlyPlot, plot='xy') {
  // Set defaults:
  Object.entries(default_state).forEach(([key, value]) => {
    if (!(key in state)) {
      state[key] = value;
    }
  });
  const { name } = state;

  // dispatch is the d3 event dispatcher: should have event "update" register
  const dispatch = d3_dispatch("update");
  const subplot = plotlyPlot._fullLayout._plots[plot];
  const clipId = subplot.clipId.replace(/plot$/, '');
  const shapelayer = plotlyPlot._fullLayout._shapeUpperLayer;
  // create interactor layer, if not exists:
  const layer_above = d3_select(shapelayer.node().parentNode);
  // create interactor layer, if not exists:
  layer_above.selectAll("g.interactorlayer")
    .data(["interactors"])
    .enter().append("g")
    .classed("interactorlayer", true);
  const interactorlayer = layer_above.selectAll("g.interactorlayer");
  let x = subplot.xaxis;
  let y = subplot.yaxis;
   
  function get_cursor() {
    return (state.fixed) ? "auto" : "ew-resize";
  }
    
  function xval_to_path(xval) {
    const yp = y.range.map((r) => (y.c2p(r) + y._offset));
    const xp = x.c2p(xval) + x._offset;
    const pathstring = `M${xp},${yp[0]}L${xp},${yp[1]}`;
    return pathstring
  }
         
  function state_to_paths(state) {
    if (state.show_lines) {
      const lines = ["x1", "x2"].map((n) => ({
        path: xval_to_path(state[n]),
        classname: `${n} x-slice`
      }));
      return lines;
    }
    else {
      return [];
    }
  }
  
  function state_to_rect(state) {
    if (state.show_range) {
      const [ y0, y1 ] = y.range
        .map((r) => (y.c2p(r) + y._offset))
        .toSorted((a, b) => a - b);
      const dy = y1 - y0;
      const [ x0, x1 ] = [ state.x1, state.x2 ]
        .map((xc) => (x.c2p(xc) + x._offset))
        .toSorted((a, b) => a - b);
      const rect = {
        "x": x0,
        "y": y0,
        "width": x1 - x0,
        "height": dy,
      }
      return rect
    }
    else { 
      return null
    }
  }
    
  const drag_lines = d3_drag()
    .on("drag", dragmove_lines)
    .on("start", function(ev) { ev.sourceEvent.stopPropagation() });

  function interactor(selection) {
    const group = selection.append("g")
      .classed("interactors interactor-" + name, true)
      
    const fill = group.append("rect")
          .attr("class", "range-fill")
          .style("stroke", "none")
          .attr("clip-path", `url('#${clipId}')`)
          .datum(state_to_rect(state))   
    fill
      .style("fill", state.color1)
          .attr("opacity", 0.1)
          .attr("x", function(d) {return d.x})
          .attr("y", function(d) {return d.y})
          .attr("width", function(d) {return d.width})
          .attr("height", function(d) {return d.height})
          
    const lines_group = group.append("g")
          .attr("class", "lines-group")
          .style("fill", "none")
          .style("pointer-events", "all")
          .style("cursor", get_cursor())
          .style("stroke", state.color1)
          .style("stroke-width", "7px");
          
    const lines = lines_group.selectAll(".lines")
      .data(state_to_paths(state))
        .enter().append("path")
        .attr("class", function(d) {return d['classname']})
        .attr("vector-effect", "non-scaling-stroke")
        .classed("lines", true)
        .attr("d", function(d) {return d['path']})
        .attr("clip-path", `url('#${clipId}')`)
        .style("cursor", get_cursor())
    if (!state.fixed) lines.call(drag_lines);

    interactor.update = function(preventPropagation) {
      group.selectAll('rect').datum(state_to_rect(state))
        .attr("x", function(d) {return d.x})
        .attr("y", function(d) {return d.y})
        .attr("width", function(d) {return d.width})
        .attr("height", function(d) {return d.height})
        
      lines_group.selectAll('.lines')
        .data(state_to_paths(state))
        .attr("d", function(d) {return d['path']})

      lines_group.style("cursor", get_cursor());

      // fire!
      if (!preventPropagation) {
        dispatch.call('update', state);
      }
    }
  }
  
  function dragmove_lines(ev) {
    if (this.classList.contains("x1")) {
      state.x1 = x.p2c(x.c2p(state.x1) + ev.dx);
    }
    else {
      state.x2 = x.p2c(x.c2p(state.x2) + ev.dx);
    }
    interactor.update();
  }
  
  function relayout() {
    x = subplot.xaxis;
    y = subplot.yaxis;
    interactor.update(true);
  }

  interactor(interactorlayer);
  plotlyPlot.on('plotly_relayout', relayout);
  plotlyPlot.on('plotly_relayouting', relayout);
  plotlyPlot.on('plotly_afterplot', relayout);
   
  interactor.state = state;
  interactor.dispatch = dispatch;
  
  return interactor
}