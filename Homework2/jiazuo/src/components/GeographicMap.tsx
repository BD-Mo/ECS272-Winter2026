import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';
import { ComponentSize, Margin, CountryData } from '../types';
import { loadBookData, aggregateByCountry } from '../utils/dataLoader';

const COUNTRY_NAME_MAP: { [key: string]: string } = {
  'USA': 'United States of America',
  'UK': 'United Kingdom',
  'Brazil': 'Brazil',
  'India': 'India',
  'Germany': 'Germany',
  'France': 'France',
  'Japan': 'Japan',
  'China': 'China',
  'Russia': 'Russia',
  'Canada': 'Canada',
  'Australia': 'Australia',
  'Italy': 'Italy',
  'Spain': 'Spain',
  'Mexico': 'Mexico',
  'South Korea': 'South Korea',
  'Netherlands': 'Netherlands',
  'Sweden': 'Sweden',
  'Poland': 'Poland',
  'Turkey': 'Turkey',
  'Argentina': 'Argentina',
};

export default function GeographicMap() {
  const [countryData, setCountryData] = useState<CountryData[]>([]);
  const [geoData, setGeoData] = useState<any>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
  const margin: Margin = { top: 45, right: 15, bottom: 50, left: 15 };
  
  const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200);
  useResizeObserver({ ref: chartRef, onResize });

  useEffect(() => {
    const loadData = async () => {
      const books = await loadBookData();
      const aggregated = aggregateByCountry(books);
      setCountryData(aggregated);
      
      try {
        const worldData = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
        setGeoData(worldData);
      } catch (error) {
        console.error('Error loading world map:', error);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!geoData || countryData.length === 0 || size.width === 0 || size.height === 0) return;
    drawMap();
  }, [geoData, countryData, size]);

  function drawMap() {
    d3.select('#map-svg').selectAll('*').remove();
    
    const svg = d3.select('#map-svg');
    const width = size.width - margin.left - margin.right;
    const height = size.height - margin.top - margin.bottom;
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    
    const projection = d3.geoNaturalEarth1()
      .scale(width / 5.5)
      .translate([width / 2, height / 2])
      .center([0, 15]);
    
    const path = d3.geoPath().projection(projection);
    
    const countryMap = new Map<string, CountryData>();
    countryData.forEach(d => {
      const mappedName = COUNTRY_NAME_MAP[d.country] || d.country;
      countryMap.set(mappedName, d);
    });
    
    const maxCount = d3.max(countryData, d => d.count) || 1;
    const colorScale = d3.scaleSequential()
      .domain([0, maxCount])
      .interpolator(d3.interpolateBlues);
    
    const countries = (window as any).topojson.feature(geoData, geoData.objects.countries);
    
    const filteredCountries = countries.features.filter((d: any) => 
      d.properties.name !== 'Antarctica'
    );
    
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'map-tooltip')
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
    
    g.selectAll('path')
      .data(filteredCountries)
      .join('path')
      .attr('d', path as any)
      .attr('fill', (d: any) => {
        const countryName = d.properties.name;
        const data = countryMap.get(countryName);
        return data ? colorScale(data.count) : '#f5f5f5';
      })
      .attr('stroke', '#999')
      .attr('stroke-width', 0.5)
      .on('mouseover', function(event, d: any) {
        const countryName = d.properties.name;
        const data = countryMap.get(countryName);
        
        if (data) {
          d3.select(this)
            .attr('stroke-width', 1.5)
            .attr('stroke', '#333');
          
          tooltip
            .style('visibility', 'visible')
            .html(`
              <strong>${countryName}</strong><br/>
              Books: ${data.count}<br/>
              Avg Rating: ${data.avgRating.toFixed(2)}
            `);
        }
      })
      .on('mousemove', function(event) {
        tooltip
          .style('top', (event.pageY - 10) + 'px')
          .style('left', (event.pageX + 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('stroke-width', 0.5)
          .attr('stroke', '#999');
        
        tooltip.style('visibility', 'hidden');
      });
    
    svg.append('text')
      .attr('x', size.width / 2)
      .attr('y', 20)
      .style('text-anchor', 'middle')
      .style('font-size', '15px')
      .style('font-weight', 'bold')
      .text('Global Distribution of Popular Books');
    
   
    const legendWidth = 280;
    const legendHeight = 12;
    const legendX = (size.width - legendWidth) / 2;
    const legendY = size.height - 35;
    
    const legendScale = d3.scaleLinear()
      .domain([0, maxCount])
      .range([0, legendWidth]);
    
    const legendAxis = d3.axisBottom(legendScale)
      .ticks(5)
      .tickFormat(d3.format('d'));
    
    const defs = svg.append('defs');
    const linearGradient = defs.append('linearGradient')
      .attr('id', 'legend-gradient');
    
    const stops = d3.range(0, 1.01, 0.1);
    stops.forEach(t => {
      linearGradient.append('stop')
        .attr('offset', `${t * 100}%`)
        .attr('stop-color', colorScale(t * maxCount));
    });
    
    const legend = svg.append('g')
      .attr('transform', `translate(${legendX}, ${legendY})`);
    
    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#legend-gradient)')
      .style('stroke', '#999')
      .style('stroke-width', 0.5);
    
    legend.append('g')
      .attr('transform', `translate(0, ${legendHeight})`)
      .call(legendAxis)
      .selectAll('text')
      .style('font-size', '10px');
    
    legend.append('text')
      .attr('x', legendWidth / 2)
      .attr('y', -4)
      .style('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .text('Number of Books');
  }

  return (
    <div ref={chartRef} className='chart-container' style={{ width: '100%', height: '100%' }}>
      <svg id='map-svg' width='100%' height='100%'></svg>
      <script src="https://cdn.jsdelivr.net/npm/topojson@3"></script>
    </div>
  );
}
