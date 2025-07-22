import { dispatch as d3_dispatch } from 'd3-dispatch';
import { drag as d3_drag } from 'd3-drag';
import { getInteractorLayer } from './interactor-layer.js';

export default xLineInteractor;

const default_state = {
  x: 0,
  show_lines: true,
  color1: "blue",
  fixed: false
};

export function xLineInteractor(state, plotlyPlot, plot='xy') {
  // Set defaults:
  Object.entries(default_state).forEach(([key, value]) => {
    if (!(key in state)) {
      state[key] = value;
    }
  });
  const { name } = state;

  // dispatch is the d3 event dispatcher: should have event "update" register
  const dispatch = d3_dispatch("update");
  const { interactorlayer, subplot, clipid } = getInteractorLayer(plotlyPlot, plot);

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
      return [{
        path: xval_to_path(state.x),
        classname: `x-line`
      }]
    }
    else {
      return [];
    }
  }
  
  const drag_lines = d3_drag()
    .on("drag", dragmove_lines)
    .on("start", function(ev) { ev.sourceEvent.stopPropagation() });

  function interactor(selection) {
    const group = selection.append("g")
      .classed("interactors interactor-" + name, true)
      
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
        .attr("clip-path", `url('#${clipid}')`)
        .style("cursor", get_cursor())
    if (!state.fixed) lines.call(drag_lines);

    interactor.update = function(preventPropagation) {
      lines_group.selectAll('.lines')
        .data(state_to_paths(state))
        .attr("d", function(d) {return d['path']})

      lines_group.style("cursor", get_cursor());

      // fire!
      if (!preventPropagation) {
        dispatch.call("update", this, state);
      }
    }
  }
  
  function dragmove_lines(ev) {
    state.x = x.p2c(x.c2p(state.x) + ev.dx);
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