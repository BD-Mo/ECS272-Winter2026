import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';
import { BookData, ComponentSize, Margin, ScatterPlotProps } from '../types';

export default function ScatterPlot({ allBooks, selectedGenre, highlightIds, onBrushChange, topGenres, genreColorScale }: ScatterPlotProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
  const margin: Margin = { top: 30, right: 130, bottom: 60, left: 60 };

  const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200);
  useResizeObserver({ ref: chartRef, onResize });

  const filteredBooks: BookData[] = allBooks.filter(d => {
    if (d.pageCount <= 0 || d.rating_average < 3.0 || d.pageCount >= 1500) return false;
    if (selectedGenre && d.genre !== selectedGenre) return false;
    return true;
  });

  useEffect(() => {
    if (allBooks.length === 0 || size.width === 0 || size.height === 0) return;
    drawChart();
  }, [filteredBooks, size, topGenres, highlightIds]);

  function drawChart() {
    d3.select('#scatter-svg').selectAll('*').remove();

    const svg = d3.select('#scatter-svg');
    const width = size.width - margin.left - margin.right;
    const height = size.height - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear()
      .domain([0, d3.max(filteredBooks, d => d.pageCount) || 1000])
      .range([0, width]).nice();

    const yScale = d3.scaleLinear()
      .domain([3.0, 5.0]).range([height, 0]).nice();

    const yearExtent = d3.extent(filteredBooks, d => d.publicationYear) as [number, number];
    const sizeScale = d3.scaleLinear().domain(yearExtent).range([3, 9]);

    g.append('g').attr('class', 'grid').attr('opacity', 0.1)
      .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(() => ''));
    g.append('g').attr('class', 'grid').attr('opacity', 0.1)
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickSize(-height).tickFormat(() => ''));

    g.append('g').attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(8))
      .selectAll('text').style('font-size', '10px');
    g.append('g').call(d3.axisLeft(yScale).ticks(6))
      .selectAll('text').style('font-size', '10px');

    g.append('text').attr('x', width / 2).attr('y', height + 42)
      .style('text-anchor', 'middle').style('font-size', '12px').style('font-weight', 'bold')
      .text('Page Count');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -height / 2).attr('y', -42)
      .style('text-anchor', 'middle').style('font-size', '12px').style('font-weight', 'bold')
      .text('Average Rating');

    const tooltip = d3.select('body').select('.scatter-tooltip').empty()
      ? d3.select('body').append('div').attr('class', 'scatter-tooltip')
      : d3.select('body').select('.scatter-tooltip');

    tooltip
      .style('position', 'absolute').style('visibility', 'hidden')
      .style('background-color', 'white').style('border', '1px solid #ddd')
      .style('border-radius', '4px').style('padding', '8px')
      .style('font-size', '11px').style('pointer-events', 'none')
      .style('z-index', '1000').style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)');

    const hasHighlight = highlightIds.size > 0;

    g.selectAll('circle')
      .data(filteredBooks)
      .join(
        enter => enter.append('circle')
          .attr('cx', d => xScale(d.pageCount))
          .attr('cy', d => yScale(d.rating_average))
          .attr('r', 0)
          .attr('fill', d => topGenres.includes(d.genre) ? genreColorScale(d.genre) : '#ccc')
          .attr('stroke', '#fff')
          .attr('stroke-width', 0.8)
          .call(enter => enter.transition().duration(400)
            .attr('r', d => sizeScale(d.publicationYear))
            .attr('opacity', d => !hasHighlight ? 0.65 : highlightIds.has(d.id) ? 1.0 : 0.08)
          ),
        update => update
          .call(update => update.transition().duration(400)
            .attr('cx', d => xScale(d.pageCount))
            .attr('cy', d => yScale(d.rating_average))
            .attr('r', d => sizeScale(d.publicationYear))
            .attr('fill', d => topGenres.includes(d.genre) ? genreColorScale(d.genre) : '#ccc')
            .attr('opacity', d => !hasHighlight ? 0.65 : highlightIds.has(d.id) ? 1.0 : 0.08)
          ),
        exit => exit.call(exit => exit.transition().duration(300).attr('r', 0).attr('opacity', 0).remove())
      )
      .on('mouseover', function (event, d) {
        d3.select(this).raise().attr('stroke', '#333').attr('stroke-width', 2).attr('opacity', 1);
        tooltip.style('visibility', 'visible').html(
          `<strong>${d.title}</strong><br/>Author: ${d.author}<br/>Genre: ${d.genre}<br/>Rating: ${d.rating_average.toFixed(2)}<br/>Pages: ${d.pageCount}<br/>Year: ${d.publicationYear}`
        );
      })
      .on('mousemove', function (event) {
        tooltip.style('top', (event.pageY - 10) + 'px').style('left', (event.pageX + 10) + 'px');
      })
      .on('mouseout', function (event, d) {
        const op = !hasHighlight ? 0.65 : highlightIds.has(d.id) ? 1.0 : 0.08;
        d3.select(this).attr('stroke', '#fff').attr('stroke-width', 0.8).attr('opacity', op);
        tooltip.style('visibility', 'hidden');
      });

    const brush = d3.brush()
      .extent([[0, 0], [width, height]])
      .on('end', function (event) {
        if (!event.selection) { onBrushChange(new Set()); return; }
        const [[x0, y0], [x1, y1]] = event.selection as [[number, number], [number, number]];
        const selected = new Set<number>();
        filteredBooks.forEach(d => {
          const cx = xScale(d.pageCount);
          const cy = yScale(d.rating_average);
          if (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) selected.add(d.id);
        });
        onBrushChange(selected);
      });

    g.append('g').attr('class', 'brush').call(brush)
      .selectAll('.selection')
      .attr('stroke', '#555').attr('stroke-dasharray', '4,3')
      .attr('fill', 'rgba(100,100,200,0.1)');

    const legend = g.append('g').attr('transform', `translate(${width + 12}, 0)`);
    legend.append('text').attr('x', 0).attr('y', -5)
      .style('font-size', '11px').style('font-weight', 'bold').text('Genre');

    topGenres.forEach((genre, i) => {
      const row = legend.append('g').attr('transform', `translate(0, ${i * 17 + 5})`);
      row.append('circle').attr('cx', 5).attr('cy', 5).attr('r', 5)
        .attr('fill', genreColorScale(genre)).attr('opacity', 0.8);
      row.append('text').attr('x', 14).attr('y', 9).style('font-size', '10px')
        .text(genre.length > 12 ? genre.substring(0, 12) + '…' : genre);
    });

    const othersRow = legend.append('g').attr('transform', `translate(0, ${topGenres.length * 17 + 5})`);
    othersRow.append('circle').attr('cx', 5).attr('cy', 5).attr('r', 5)
      .attr('fill', '#ccc').attr('opacity', 0.8);
    othersRow.append('text').attr('x', 14).attr('y', 9).style('font-size', '10px').text('Others');

    const sizeLegendY = topGenres.length * 17 + 32;
    const sizeLegend = legend.append('g').attr('transform', `translate(0, ${sizeLegendY})`);
    sizeLegend.append('text').attr('x', 0).attr('y', 0)
      .style('font-size', '11px').style('font-weight', 'bold').text('Pub. Year');

    const sizeSteps = [
      { label: String(yearExtent[0]), r: sizeScale(yearExtent[0]) },
      { label: String(Math.round((yearExtent[0] + yearExtent[1]) / 2)), r: sizeScale((yearExtent[0] + yearExtent[1]) / 2) },
      { label: String(yearExtent[1]), r: sizeScale(yearExtent[1]) },
    ];

    sizeSteps.forEach((step, i) => {
      const row = sizeLegend.append('g').attr('transform', `translate(0, ${i * 20 + 10})`);
      row.append('circle').attr('cx', 5).attr('cy', 5).attr('r', step.r)
        .attr('fill', '#aaa').attr('opacity', 0.7).attr('stroke', '#fff').attr('stroke-width', 0.8);
      row.append('text').attr('x', 18).attr('y', 9).style('font-size', '10px').text(step.label);
    });

    svg.append('text').attr('x', size.width / 2).attr('y', 20)
      .style('text-anchor', 'middle').style('font-size', '15px').style('font-weight', 'bold')
      .text(selectedGenre ? `Ratings vs. Page Count — ${selectedGenre}` : 'Book Ratings vs. Page Count by Genre');

    if (!selectedGenre) {
      svg.append('text').attr('x', size.width / 2).attr('y', 34)
        .style('text-anchor', 'middle').style('font-size', '10px').style('fill', '#888')
        .text('Select a genre above · Drag to brush and highlight Sankey');
    }
  }

  return (
    <div ref={chartRef} className='chart-container' style={{ width: '100%', height: '100%' }}>
      <svg id='scatter-svg' width='100%' height='100%'></svg>
    </div>
  );
}