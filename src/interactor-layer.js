import { select as d3_select } from 'd3-selection';

export function getInteractorLayer(plotlyPlot, plot='xy') {
  const subplot = plotlyPlot._fullLayout._plots[plot];
  const shapelayer = plotlyPlot._fullLayout._shapeUpperLayer;
  const layer_above = d3_select(shapelayer.node().parentNode);
  // create interactor layer, if not exists:
  layer_above.selectAll("g.interactorlayer")
    .data(["interactors"])
    .enter().append("g")
    .classed("interactorlayer", true);
  const interactorlayer = layer_above.selectAll("g.interactorlayer");
  const clipid = subplot.clipId.replace(/plot$/, '');
  return { interactorlayer, subplot, clipid };
}