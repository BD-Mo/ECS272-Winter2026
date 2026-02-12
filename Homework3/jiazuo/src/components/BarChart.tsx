import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';
import { ComponentSize, Margin, BarChartProps } from '../types';
import { aggregateByGenre } from '../utils/dataLoader';

export default function BarChart({ allBooks, selectedGenre, onGenreSelect, topGenres, genreColorScale }: BarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
  const margin: Margin = { top: 45, right: 35, bottom: 70, left: 55 };

  const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200);
  useResizeObserver({ ref: chartRef, onResize });

  useEffect(() => {
    if (allBooks.length === 0 || size.width === 0 || size.height === 0) return;
    drawChart();
  }, [allBooks, size, selectedGenre, topGenres]);

  function drawChart() {
    d3.select('#bar-svg').selectAll('*').remove();

    const svg = d3.select('#bar-svg');
    const width = size.width - margin.left - margin.right;
    const height = size.height - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const allGenreData = aggregateByGenre(allBooks);
    const genreData = allGenreData
      .filter(d => topGenres.includes(d.genre))
      .sort((a, b) => b.count - a.count);

    const xScale = d3.scaleBand()
      .domain(genreData.map(d => d.genre))
      .range([0, width])
      .padding(0.25);

    const yScaleCount = d3.scaleLinear()
      .domain([0, d3.max(genreData, d => d.count) || 1])
      .range([height, 0])
      .nice();

    const yScaleRating = d3.scaleLinear()
      .domain([3.5, 4.5])
      .range([height, 0])
      .nice();

    g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.08)
      .call(d3.axisLeft(yScaleCount).tickSize(-width).tickFormat(() => ''));

    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .attr('transform', 'rotate(-30)')
      .style('text-anchor', 'end')
      .style('font-size', '10px');

    g.append('g')
      .call(d3.axisLeft(yScaleCount).ticks(5))
      .selectAll('text').style('font-size', '10px');

    g.append('g')
      .attr('transform', `translate(${width}, 0)`)
      .call(d3.axisRight(yScaleRating).ticks(5).tickFormat(d => `${d}`))
      .selectAll('text').style('font-size', '10px');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2).attr('y', -40)
      .style('text-anchor', 'middle').style('font-size', '11px').style('font-weight', 'bold')
      .text('Book Count');

    g.append('text')
      .attr('transform', 'rotate(90)')
      .attr('x', height / 2).attr('y', -(width + 48))
      .style('text-anchor', 'middle').style('font-size', '11px').style('font-weight', 'bold')
      .text('Avg Rating');

    const tooltip = d3.select('body').select('.bar-tooltip').empty()
      ? d3.select('body').append('div').attr('class', 'bar-tooltip')
      : d3.select('body').select('.bar-tooltip');

    tooltip
      .style('position', 'absolute').style('visibility', 'hidden')
      .style('background-color', 'white').style('border', '1px solid #ddd')
      .style('border-radius', '4px').style('padding', '8px')
      .style('font-size', '11px').style('pointer-events', 'none')
      .style('z-index', '1000').style('box-shadow', '0 2px 4px rgba(0,0,0,0.15)');

    g.selectAll('.bar')
      .data(genreData)
      .join(
        enter => enter.append('rect')
          .attr('class', 'bar')
          .attr('x', d => xScale(d.genre)!)
          .attr('width', xScale.bandwidth())
          .attr('y', height)
          .attr('height', 0)
          .attr('rx', 3)
          .call(enter => enter.transition().duration(500).ease(d3.easeCubicOut)
            .attr('y', d => yScaleCount(d.count))
            .attr('height', d => height - yScaleCount(d.count))
          ),
        update => update
          .call(update => update.transition().duration(400)
            .attr('y', d => yScaleCount(d.count))
            .attr('height', d => height - yScaleCount(d.count))
          )
      )
      .attr('fill', d => genreColorScale(d.genre))
      .attr('opacity', d => {
        if (!selectedGenre) return 0.85;
        return d.genre === selectedGenre ? 1.0 : 0.25;
      })
      .attr('stroke', d => d.genre === selectedGenre ? '#333' : 'none')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', function (event, d) {
        if (d.genre !== selectedGenre) {
          d3.select(this).transition().duration(150).attr('opacity', 0.95);
        }
        tooltip.style('visibility', 'visible').html(
          `<strong>${d.genre}</strong><br/>Books: ${d.count}<br/>Avg Rating: ${d.avgRating.toFixed(2)}<br/><em style="color:#888;font-size:10px">Click to filter</em>`
        );
      })
      .on('mousemove', function (event) {
        tooltip.style('top', (event.pageY - 10) + 'px').style('left', (event.pageX + 10) + 'px');
      })
      .on('mouseout', function (event, d) {
        const op = !selectedGenre ? 0.85 : d.genre === selectedGenre ? 1.0 : 0.25;
        d3.select(this).transition().duration(150).attr('opacity', op);
        tooltip.style('visibility', 'hidden');
      })
      .on('click', function (event, d) {
        onGenreSelect(d.genre === selectedGenre ? null : d.genre);
      });

    const line = d3.line<typeof genreData[0]>()
      .x(d => xScale(d.genre)! + xScale.bandwidth() / 2)
      .y(d => yScaleRating(d.avgRating))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(genreData)
      .attr('fill', 'none')
      .attr('stroke', '#555')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,3')
      .attr('opacity', 0.7)
      .attr('d', line);

    g.selectAll('.dot')
      .data(genreData)
      .join('circle')
      .attr('class', 'dot')
      .attr('cx', d => xScale(d.genre)! + xScale.bandwidth() / 2)
      .attr('cy', d => yScaleRating(d.avgRating))
      .attr('r', 4)
      .attr('fill', '#555')
      .attr('opacity', 0.8)
      .style('pointer-events', 'none');

    const legendG = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top - 18})`);

    legendG.append('rect').attr('x', 0).attr('y', -8).attr('width', 14).attr('height', 14)
      .attr('fill', '#aaa').attr('opacity', 0.85).attr('rx', 2);
    legendG.append('text').attr('x', 18).attr('y', 4)
      .style('font-size', '10px').text('Book Count (bars)');

    legendG.append('line').attr('x1', 120).attr('y1', 0).attr('x2', 134).attr('y2', 0)
      .attr('stroke', '#555').attr('stroke-width', 1.5).attr('stroke-dasharray', '4,3');
    legendG.append('circle').attr('cx', 127).attr('cy', 0).attr('r', 3).attr('fill', '#555');
    legendG.append('text').attr('x', 138).attr('y', 4)
      .style('font-size', '10px').text('Avg Rating (line)');

    if (selectedGenre) {
      legendG.append('text')
        .attr('x', width - 10).attr('y', 4)
        .style('text-anchor', 'end').style('font-size', '10px').style('fill', '#e65100')
        .text(`Selected: ${selectedGenre} — click again to deselect`);
    }

    svg.append('text').attr('x', size.width / 2).attr('y', 22)
      .style('text-anchor', 'middle').style('font-size', '15px').style('font-weight', 'bold')
      .text('Book Count & Average Rating by Genre');

    svg.append('text').attr('x', size.width / 2).attr('y', 36)
      .style('text-anchor', 'middle').style('font-size', '10px').style('fill', '#888')
      .text('Click a bar to drill down into the genre');
  }

  return (
    <div ref={chartRef} className='chart-container' style={{ width: '100%', height: '100%' }}>
      <svg id='bar-svg' width='100%' height='100%'></svg>
    </div>
  );
}