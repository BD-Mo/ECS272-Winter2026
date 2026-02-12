import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';
import { ComponentSize, Margin, SankeyDiagramProps } from '../types';
import { prepareSankeyData, getRatingTier } from '../utils/dataLoader';

export default function SankeyDiagram({ allBooks, selectedGenre, brushedIds, selectedSankeyNode, onNodeSelect, topGenres, genreColorScale }: SankeyDiagramProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
  const margin: Margin = { top: 55, right: 100, bottom: 25, left: 100 };

  const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200);
  useResizeObserver({ ref: chartRef, onResize });

  const filteredBooks = allBooks.filter(b => {
    if (selectedGenre && b.genre !== selectedGenre) return false;
    return true;
  });

  const sankeyData = prepareSankeyData(filteredBooks, topGenres);

  useEffect(() => {
    if (allBooks.length === 0 || size.width === 0 || size.height === 0) return;
    drawSankey();
  }, [sankeyData, size, brushedIds, selectedSankeyNode]);

  function drawSankey() {
    d3.select('#sankey-svg').selectAll('*').remove();

    const svg = d3.select('#sankey-svg');
    const width = size.width - margin.left - margin.right;
    const height = size.height - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const ratingTierOrder = ['Acclaimed (4.5+)', 'Highly Rated (4.0-4.5)', 'Well Rated (3.5-4.0)', 'Average (< 3.5)'];
    const ratingColors = ['#1a6b3c', '#4caf7d', '#a8d5b5', '#d4edda'];
    const colorMap = new Map<string, string>();

    topGenres.forEach(g => colorMap.set(g, genreColorScale(g)));
    colorMap.set('Others', '#ccc');
    ratingTierOrder.forEach((tier, i) => colorMap.set(tier, ratingColors[i]));
    colorMap.set('Adapted to Movie', '#e65100');
    colorMap.set('Not Adapted', '#bdbdbd');

    const sankeyGen = sankey<any, any>()
      .nodeId(d => d.id)
      .nodeWidth(20)
      .nodePadding(12)
      .extent([[0, 0], [width, height]]);

    const graph = {
      nodes: sankeyData.nodes.map(d => ({ ...d })),
      links: sankeyData.links.map(d => ({ ...d }))
    };

    const { nodes, links } = sankeyGen(graph);

    const hasBrushed = brushedIds.size > 0;
    const hasNodeSelect = !!selectedSankeyNode;

    const brushedNodeIds = new Set<string>();
    if (hasBrushed) {
      filteredBooks.forEach(b => {
        if (!brushedIds.has(b.id)) return;
        const genre = topGenres.includes(b.genre) ? b.genre : 'Others';
        brushedNodeIds.add(`g_${genre}`);
        brushedNodeIds.add(`r_${getRatingTier(b.rating_average)}`);
        brushedNodeIds.add(`m_${b.adapted_to_movie ? 'Adapted to Movie' : 'Not Adapted'}`);
      });
    }

    const getNodeOpacity = (nodeId: string) => {
      if (hasBrushed) return brushedNodeIds.has(nodeId) ? 1.0 : 0.15;
      if (hasNodeSelect) return nodeId === selectedSankeyNode ? 1.0 : 0.25;
      return 1.0;
    };

    const getLinkOpacity = (link: any) => {
      const srcId = link.source.id;
      const tgtId = link.target.id;
      if (hasBrushed) return (brushedNodeIds.has(srcId) && brushedNodeIds.has(tgtId)) ? 0.75 : 0.05;
      if (hasNodeSelect) return (srcId === selectedSankeyNode || tgtId === selectedSankeyNode) ? 0.75 : 0.05;
      return 0.45;
    };

    g.append('g')
      .selectAll('path')
      .data(links)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', (d: any) => colorMap.get(d.source.name) || '#ccc')
      .attr('stroke-width', (d: any) => Math.max(1, d.width))
      .attr('fill', 'none')
      .attr('opacity', 0)
      .transition().duration(450)
      .attr('opacity', (d: any) => getLinkOpacity(d))
      .selection()
      .on('mouseover', function (event, d: any) {
        d3.select(this).attr('opacity', 0.85).attr('stroke-width', Math.max(2, d.width + 2));
      })
      .on('mouseout', function (event, d: any) {
        d3.select(this).transition().duration(200)
          .attr('opacity', getLinkOpacity(d))
          .attr('stroke-width', Math.max(1, d.width));
      })
      .append('title')
      .text((d: any) => `${d.source.name} → ${d.target.name}\n${d.value} books`);

    const nodeGroups = g.append('g').selectAll('g').data(nodes).join('g')
      .style('cursor', 'pointer')
      .on('click', function (event, d: any) {
        onNodeSelect(selectedSankeyNode === d.id ? null : d.id);
      });

    nodeGroups.append('rect')
      .attr('x', (d: any) => d.x0)
      .attr('y', (d: any) => d.y0)
      .attr('height', (d: any) => d.y1 - d.y0)
      .attr('width', (d: any) => d.x1 - d.x0)
      .attr('fill', (d: any) => colorMap.get(d.name) || '#ccc')
      .attr('stroke', (d: any) => d.id === selectedSankeyNode ? '#222' : '#555')
      .attr('stroke-width', (d: any) => d.id === selectedSankeyNode ? 2.5 : 1)
      .attr('opacity', 0)
      .transition().duration(450)
      .attr('opacity', (d: any) => getNodeOpacity(d.id))
      .selection()
      .on('mouseover', function (event, d: any) {
        d3.select(this).attr('opacity', 1).attr('stroke', '#111').attr('stroke-width', 2);
      })
      .on('mouseout', function (event, d: any) {
        d3.select(this).transition().duration(200)
          .attr('opacity', getNodeOpacity(d.id))
          .attr('stroke', d.id === selectedSankeyNode ? '#222' : '#555')
          .attr('stroke-width', d.id === selectedSankeyNode ? 2.5 : 1);
      })
      .append('title')
      .text((d: any) => `${d.name}\n${d.value} books\nClick to highlight scatter plot`);

      const WRAP_NAMES: Record<string, string[]> = {
        'Highly Rated (4.0-4.5)': ['Highly Rated', '(4.0-4.5)'],
        'Well Rated (3.5-4.0)': ['Well Rated', '(3.5-4.0)'],
      };
      
      const textGroups = nodeGroups.append('text')
        .attr('x', (d: any) => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr('y', (d: any) => (d.y1 + d.y0) / 2)
        .attr('text-anchor', (d: any) => d.x0 < width / 2 ? 'start' : 'end')
        .style('font-size', '10px')
        .style('font-weight', (d: any) => d.id === selectedSankeyNode ? '700' : '500')
        .attr('opacity', (d: any) => getNodeOpacity(d.id));
      
      textGroups.each(function (d: any) {
        const el = d3.select(this);
        const lines = WRAP_NAMES[d.name];
        if (lines) {
          lines.forEach((line, i) => {
            el.append('tspan')
              .attr('x', d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
              .attr('dy', i === 0 ? '-0.3em' : '1.2em')
              .text(line);
          });
        } else {
          el.append('tspan')
            .attr('dy', '0.35em')
            .text(d.name.length > 18 ? d.name.substring(0, 16) + '…' : d.name);
        }
      });

    svg.append('text').attr('x', size.width / 2).attr('y', 22)
      .style('text-anchor', 'middle').style('font-size', '15px').style('font-weight', 'bold')
      .text('Genre → Rating Tier → Movie Adaptation');

    svg.append('text').attr('x', size.width / 2).attr('y', 37)
      .style('text-anchor', 'middle').style('font-size', '10px').style('fill', '#888')
      .text(
        hasBrushed ? `Showing ${brushedIds.size} brushed books` :
        hasNodeSelect ? 'Node selected — click again to deselect' :
        'Click a node to highlight scatter plot'
      );

    const layerLabels = [
      { x: margin.left -8, text: 'Genre', anchor: 'start' },
      { x: margin.left + width / 2, text: 'Rating Tier', anchor: 'middle' },
      { x: margin.left + width +26, text: 'Movie Status', anchor: 'end' },
    ];
    layerLabels.forEach(label => {
      svg.append('text').attr('x', label.x).attr('y', margin.top - 5)
        .style('text-anchor', label.anchor).style('font-size', '12px')
        .style('font-weight', 'bold').style('fill', '#333').text(label.text);
    });
  }

  return (
    <div ref={chartRef} className='chart-container' style={{ width: '100%', height: '100%' }}>
      <svg id='sankey-svg' width='100%' height='100%'></svg>
    </div>
  );
}
