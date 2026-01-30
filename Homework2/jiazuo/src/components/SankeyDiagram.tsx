import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';
import { ComponentSize, Margin, SankeyData } from '../types';
import { loadBookData, prepareSankeyData } from '../utils/dataLoader';

export default function SankeyDiagram() {
  const [sankeyData, setSankeyData] = useState<SankeyData | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
  const margin: Margin = { top: 55, right: 85, bottom: 25, left: 85 };
  
  const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200);
  useResizeObserver({ ref: chartRef, onResize });

  useEffect(() => {
    const loadData = async () => {
      const books = await loadBookData();
      const sankey = prepareSankeyData(books);
      setSankeyData(sankey);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!sankeyData || size.width === 0 || size.height === 0) return;
    drawSankey();
  }, [sankeyData, size]);

  function drawSankey() {
    if (!sankeyData) return;
    
    d3.select('#sankey-svg').selectAll('*').remove();
    
    const svg = d3.select('#sankey-svg');
    const width = size.width - margin.left - margin.right;
    const height = size.height - margin.top - margin.bottom;
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    
    const genreColors = d3.schemeSet2; // 和散点图一致
    const ageColors = ['#fc8d62', '#e78ac3', '#ffd92f'];
    const movieColors = ['#8da0cb', '#a6d854'];
    
    const colorMap = new Map<string, string>();
    
    
    const ageNodes = ['Children', 'Young Adult', 'Adult'];
    const movieNodes = ['Adapted to Movie', 'Not Adapted'];
    
    
    ageNodes.forEach((node, i) => {
      colorMap.set(node, ageColors[i]);
    });
    
    
    movieNodes.forEach((node, i) => {
      colorMap.set(node, movieColors[i]);
    });
    
    
    let genreColorIndex = 0;
    sankeyData.nodes.forEach(node => {
      if (!ageNodes.includes(node.name) && !movieNodes.includes(node.name)) {
        colorMap.set(node.name, genreColors[genreColorIndex % genreColors.length]);
        genreColorIndex++;
      }
    });
    
    const sankeyGenerator = sankey<any, any>()
      .nodeId(d => d.id)
      .nodeWidth(25)
      .nodePadding(30)
      .extent([[0, 0], [width, height]]);
    
    const graph = {
      nodes: sankeyData.nodes.map(d => ({ ...d })),
      links: sankeyData.links.map(d => ({ ...d }))
    };
    
    const { nodes, links } = sankeyGenerator(graph);
    
    
    g.append('g')
      .selectAll('path')
      .data(links)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', (d: any) => colorMap.get(d.source.name) || '#ccc')
      .attr('stroke-width', (d: any) => Math.max(1, d.width))
      .attr('fill', 'none')
      .attr('opacity', 0.5)
      .on('mouseover', function(event, d: any) {
        d3.select(this)
          .attr('opacity', 0.8)
          .attr('stroke-width', Math.max(2, d.width + 2));
      })
      .on('mouseout', function(event, d: any) {
        d3.select(this)
          .attr('opacity', 0.5)
          .attr('stroke-width', Math.max(1, d.width));
      })
      .append('title')
      .text((d: any) => `${d.source.name} → ${d.target.name}\n${d.value} books`);
    
    
    const nodeGroups = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g');
    
    nodeGroups.append('rect')
      .attr('x', (d: any) => d.x0)
      .attr('y', (d: any) => d.y0)
      .attr('height', (d: any) => d.y1 - d.y0)
      .attr('width', (d: any) => d.x1 - d.x0)
      .attr('fill', (d: any) => colorMap.get(d.name) || '#ccc')
      .attr('stroke', '#333')
      .attr('stroke-width', 1.5)
      .append('title')
      .text((d: any) => `${d.name}\n${d.value} books`);
    
    // Add node labels
    nodeGroups.append('text')
      .attr('x', (d: any) => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
      .attr('y', (d: any) => (d.y1 + d.y0) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d: any) => d.x0 < width / 2 ? 'start' : 'end')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .text((d: any) => d.name.length > 18 ? d.name.substring(0, 16) + '...' : d.name);
    
    
    svg.append('text')
      .attr('x', size.width / 2)
      .attr('y', 22)
      .style('text-anchor', 'middle')
      .style('font-size', '15px')
      .style('font-weight', 'bold')
      .text('Book Flow: Genre → Age Category → Movie Adaptation');
    
    
      const layerLabels = [
        { x: margin.left + 12, text: 'Genre' },
        { x: margin.left + width / 2, text: 'Age Category' },
        { x: margin.left + width - 12, text: 'Movie Status' }
      ];
      
      layerLabels.forEach(label => {
        svg.append('text')
          .attr('x', label.x)
          .attr('y', margin.top - 10)
          .style('text-anchor', label.text === 'Movie Status' ? 'end' : (label.text === 'Genre' ? 'start' : 'middle'))
          .style('font-size', '12px')
          .style('font-weight', 'bold')
          .style('fill', '#000')
          .text(label.text);
      });
    
  }

  return (
    <div ref={chartRef} className='chart-container' style={{ width: '100%', height: '100%' }}>
      <svg id='sankey-svg' width='100%' height='100%'></svg>
    </div>
  );
}
