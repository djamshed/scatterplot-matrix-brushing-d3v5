import {
  axisBottom,
  axisLeft,
  brush,
  brushSelection,
  csv,
  extent,
  keys,
  scaleLinear,
  scaleOrdinal,
  schemeCategory10,
  select,
} from 'd3';


const SIZE = 230
const PADDING = 20

const x = scaleLinear()
  .range([PADDING / 2, SIZE - PADDING / 2]);

const y = scaleLinear()
  .range([SIZE - PADDING / 2, PADDING / 2]);

let brushCell;
const brushFx = brush()
  .extent([[0, 0], [SIZE, SIZE]])

const xAxis = axisBottom()
  .scale(x)
  .ticks(6);

const yAxis = axisLeft()
  .scale(y)
  .ticks(6);

const color = scaleOrdinal().range(schemeCategory10)

export default async function App() {
  const data = await csv('data.csv')
  scatterplotMatrix(data)
}

function scatterplotMatrix(data) {
  brushFx
    .on('start', brushStart)
    .on('brush', brushmove)
    .on('end', brushend)


  const domainByTrait = {}
  const traits = keys(data[0]).filter(d => d !== 'species')
  const n = traits.length

  traits.forEach(trait => {
    domainByTrait[trait] = extent(data, d => d[trait]);
  });

  xAxis.tickSize(SIZE * n);
  yAxis.tickSize(-SIZE * n);

  const svg = select('#app').append('svg')
    .attr('width', SIZE * n + PADDING)
    .attr('height', SIZE * n + PADDING)
    .append('g')
    .attr('transform', 'translate(' + PADDING + ',' + PADDING / 2 + ')');

  svg.selectAll('.x.axis')
    .data(traits)
    .enter().append('g')
    .attr('class', 'x axis')
    .attr('transform', (d, i) => 'translate(' + (n - i - 1) * SIZE + ',0)')
    .each(d => {
      x.domain(domainByTrait[d]);
      select(this).call(xAxis);
    });

  svg.selectAll('.y.axis')
    .data(traits)
    .enter().append('g')
    .attr('class', 'y axis')
    .attr('transform', (d, i) => 'translate(0,' + i * SIZE + ')')
    .each(d => {
      y.domain(domainByTrait[d]);
      select(this).call(yAxis);
    });

  const cell = svg.selectAll('.cell')
    .data(cross(traits, traits))
    .enter().append('g')
    .attr('class', 'cell')
    .attr('transform', d => 'translate(' + (n - d.i - 1) * SIZE + ',' + d.j * SIZE + ')')
    .each(plot);

  // Titles for the diagonal.
  cell.filter(d => d.i === d.j).append('text')
    .attr('x', PADDING)
    .attr('y', PADDING)
    .attr('dy', '.71em')
    .text(d => d.x);

  cell.call(brushFx);

  function plot(p) {
    const cell = select(this);

    x.domain(domainByTrait[p.x]);
    y.domain(domainByTrait[p.y]);

    cell.append('rect')
      .attr('class', 'frame')
      .attr('x', PADDING / 2)
      .attr('y', PADDING / 2)
      .attr('width', SIZE - PADDING)
      .attr('height', SIZE - PADDING);

    cell.selectAll('circle')
      .data(data)
      .enter().append('circle')
      .attr('cx', d => x(d[p.x]))
      .attr('cy', d => y(d[p.y]))
      .attr('r', 4)
      .style('fill', d => color(d.species));
  }

  // Clear the previously-active brush, if any.
  function brushStart(p) {
    if (brushCell !== this) {
      select(brushCell).call(brushFx.move, null);
      brushCell = this;
      x.domain(domainByTrait[p.x]);
      y.domain(domainByTrait[p.y]);
    }
  }

  // Highlight the selected circles.
  function brushmove(p) {
    const e = brushSelection(this);
    svg.selectAll('circle').classed('hidden', d =>
      e && (
        e[0][0] > x(+d[p.x]) || x(+d[p.x]) > e[1][0]
        || e[0][1] > y(+d[p.y]) || y(+d[p.y]) > e[1][1]
      )
    );
  }

  // If the brush is empty, select all circles.
  function brushend() {
    const e = brushSelection(this);
    if (!e) svg.selectAll('.hidden').classed('hidden', false);
  }
}

function cross(a, b) {
  const c = [], n = a.length, m = b.length;
  let i, j;
  for (i = -1; ++i < n;) for (j = -1; ++j < m;)
    c.push({ x: a[i], i: i, y: b[j], j: j });
  return c;
}
