import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';
import { BookData, ComponentSize, Margin } from '../types';
import { loadBookData, getTopGenres } from '../utils/dataLoader';

export default function ScatterPlot() {
  const [books, setBooks] = useState<BookData[]>([]);
  const [topGenres, setTopGenres] = useState<string[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
  const margin: Margin = { top: 55, right: 90, bottom: 60, left: 60 };
  
  const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200);
  useResizeObserver({ ref: chartRef, onResize });

  useEffect(() => {
    const loadData = async () => {
      const data = await loadBookData();
      setBooks(data);
      const genres = getTopGenres(data, 8);
      setTopGenres(genres);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (books.length === 0 || size.width === 0 || size.height === 0) return;
    drawChart();
  }, [books, size, topGenres]);

  function drawChart() {
    d3.select('#scatter-svg').selectAll('*').remove();
    
    const svg = d3.select('#scatter-svg');
    const width = size.width - margin.left - margin.right;
    const height = size.height - margin.top - margin.bottom;
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const filteredBooks = books.filter(d => 
      d.pageCount < 1500 && 
      d.rating_average >= 3.0
    );
    
    const xScale = d3.scaleLinear()
      .domain([0, d3.max(filteredBooks, d => d.pageCount) || 1000])
      .range([0, width])
      .nice();
    
    const yScale = d3.scaleLinear()
      .domain([3.0, 5.0])
      .range([height, 0])
      .nice();
    
    const colorScale = d3.scaleOrdinal<string>()
      .domain(topGenres)
      .range(d3.schemeSet2);
    
    const sizeScale = d3.scaleLinear()
      .domain(d3.extent(filteredBooks, d => d.publicationYear) as [number, number])
      .range([3, 9]);
    
    
    g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .call(d3.axisLeft(yScale)
        .tickSize(-width)
        .tickFormat(() => ''));
    
    g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale)
        .tickSize(-height)
        .tickFormat(() => ''));
    
    
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(8))
      .selectAll('text')
      .style('font-size', '10px');
    
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(6))
      .selectAll('text')
      .style('font-size', '10px');
    
    
    g.append('text')
      .attr('x', width / 2)
      .attr('y', height + 40)
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text('Page Count');
    
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -40)
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text('Average Rating');
    
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'scatter-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background-color', 'white')
      .style('border', '1px solid #ddd')
      .style('border-radius', '4px')
      .style('padding', '8px')
      .style('font-size', '11px')
      .style('pointer-events', 'none')
      .style('z-index', '1000')
      .style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)');
    
    
    g.selectAll('circle')
      .data(filteredBooks)
      .join('circle')
      .attr('cx', d => xScale(d.pageCount))
      .attr('cy', d => yScale(d.rating_average))
      .attr('r', d => sizeScale(d.publicationYear))
      .attr('fill', d => topGenres.includes(d.genre) ? colorScale(d.genre) : '#ddd')
      .attr('opacity', 0.65)
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.8)
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('opacity', 1)
          .attr('stroke', '#333')
          .attr('stroke-width', 2);
        
        tooltip
          .style('visibility', 'visible')
          .html(`
            <strong>${d.title}</strong><br/>
            Author: ${d.author}<br/>
            Genre: ${d.genre}<br/>
            Rating: ${d.rating_average.toFixed(2)}<br/>
            Pages: ${d.pageCount}<br/>
            Year: ${d.publicationYear}
          `);
      })
      .on('mousemove', function(event) {
        tooltip
          .style('top', (event.pageY - 10) + 'px')
          .style('left', (event.pageX + 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('opacity', 0.65)
          .attr('stroke', '#fff')
          .attr('stroke-width', 0.8);
        
        tooltip.style('visibility', 'hidden');
      });
    
    
    const legend = g.append('g')
      .attr('transform', `translate(${width + 12}, 0)`);
    
    legend.append('text')
      .attr('x', 0)
      .attr('y', -5)
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .text('Top Genres');
    
    topGenres.forEach((genre, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 17 + 5})`);
      
      legendRow.append('circle')
        .attr('cx', 5)
        .attr('cy', 5)
        .attr('r', 5)
        .attr('fill', colorScale(genre))
        .attr('opacity', 0.7);
      
      legendRow.append('text')
        .attr('x', 14)
        .attr('y', 9)
        .style('font-size', '10px')
        .text(genre.length > 11 ? genre.substring(0, 11) + '...' : genre);
    });
    
    
    svg.append('text')
      .attr('x', size.width / 2)
      .attr('y', 22)
      .style('text-anchor', 'middle')
      .style('font-size', '15px')
      .style('font-weight', 'bold')
      .text('Book Ratings vs. Page Count by Genre');
    
    svg.append('text')
      .attr('x', size.width / 2)
      .attr('y', 38)
      .style('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('fill', '#666')
      .text('Circle size indicates publication year (larger = more recent)');
  }

  return (
    <div ref={chartRef} className='chart-container' style={{ width: '100%', height: '100%' }}>
      <svg id='scatter-svg' width='100%' height='100%'></svg>
    </div>
  );
}
