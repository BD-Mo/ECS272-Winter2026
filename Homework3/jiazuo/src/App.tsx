import { useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import BarChart from './components/BarChart';
import ScatterPlot from './components/ScatterPlot';
import SankeyDiagram from './components/SankeyDiagram';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { grey, blue } from '@mui/material/colors';
import { BookData } from './types';
import { loadBookData, getTopGenres, getRatingTier } from './utils/dataLoader';

const theme = createTheme({
  palette: {
    primary: { main: blue[700] },
    secondary: { main: grey[700] },
  },
});

function Layout() {
  const [allBooks, setAllBooks] = useState<BookData[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [brushedIds, setBrushedIds] = useState<Set<number>>(new Set());
  const [selectedSankeyNode, setSelectedSankeyNode] = useState<string | null>(null);

  useEffect(() => {
    loadBookData().then(setAllBooks);
  }, []);

  const topGenres = useMemo(() => getTopGenres(allBooks, 8), [allBooks]);

  const genreColorScale = useMemo(() =>
    d3.scaleOrdinal<string>()
      .domain([...topGenres, 'Others'])
      .range([...d3.schemeSet2, '#ccc']),
    [topGenres]
  );

  const handleGenreSelect = (genre: string | null) => {
    setSelectedGenre(genre);
    setBrushedIds(new Set());
    setSelectedSankeyNode(null);
  };

  const handleBrushChange = (ids: Set<number>) => {
    setBrushedIds(ids);
    setSelectedSankeyNode(null);
  };

  const handleNodeSelect = (nodeId: string | null) => {
    setSelectedSankeyNode(nodeId);
    setBrushedIds(new Set());
  };

  const sankeyHighlightIds: Set<number> = useMemo(() => {
    if (!selectedSankeyNode) return new Set();
    const result = new Set<number>();
    allBooks.forEach(b => {
      const genre = topGenres.includes(b.genre) ? b.genre : 'Others';
      const genreId = `g_${genre}`;
      const ratingId = `r_${getRatingTier(b.rating_average)}`;
      const movieId = `m_${b.adapted_to_movie ? 'Adapted to Movie' : 'Not Adapted'}`;
      if ([genreId, ratingId, movieId].includes(selectedSankeyNode)) {
        result.add(b.id);
      }
    });
    return result;
  }, [selectedSankeyNode, allBooks, topGenres]);

  const scatterHighlightIds = brushedIds.size > 0 ? brushedIds : sankeyHighlightIds;

  return (
    <Box sx={{
      width: '98vw',
      height: '98vh',
      display: 'flex',
      padding: 1.5,
      gap: 1.5,
      backgroundColor: grey[100],
      overflow: 'hidden',
      boxSizing: 'border-box',
    }}>
      <Box sx={{ flex: '0 0 60%', display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0 }}>
        <Box sx={{ flex: '0 0 42%', minHeight: 0 }}>
          <Paper elevation={2} sx={{ height: '100%', padding: 0.5 }}>
            <BarChart
              allBooks={allBooks}
              selectedGenre={selectedGenre}
              onGenreSelect={handleGenreSelect}
              topGenres={topGenres}
              genreColorScale={genreColorScale}
            />
          </Paper>
        </Box>
        <Box sx={{ flex: '1 1 58%', minHeight: 0 }}>
          <Paper elevation={2} sx={{ height: '100%', padding: 0.5 }}>
            <ScatterPlot
              allBooks={allBooks}
              selectedGenre={selectedGenre}
              highlightIds={scatterHighlightIds}
              onBrushChange={handleBrushChange}
              topGenres={topGenres}
              genreColorScale={genreColorScale}
            />
          </Paper>
        </Box>
      </Box>
      <Box sx={{ flex: '1 1 40%', minWidth: 0 }}>
        <Paper elevation={2} sx={{ height: '100%', padding: 0.5 }}>
          <SankeyDiagram
            allBooks={allBooks}
            selectedGenre={selectedGenre}
            brushedIds={brushedIds}
            selectedSankeyNode={selectedSankeyNode}
            onNodeSelect={handleNodeSelect}
            topGenres={topGenres}
            genreColorScale={genreColorScale}
          />
        </Paper>
      </Box>
    </Box>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <Layout />
    </ThemeProvider>
  );
}