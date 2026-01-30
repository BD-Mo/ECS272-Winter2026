import GeographicMap from './components/GeographicMap';
import ScatterPlot from './components/ScatterPlot';
import SankeyDiagram from './components/SankeyDiagram';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { grey, blue } from '@mui/material/colors';

const theme = createTheme({
  palette: {
    primary: {
      main: blue[700],
    },
    secondary: {
      main: grey[700],
    },
  },
});

function Layout() {
  return (
    <Box 
      sx={{ 
        width: '98vw', 
        height: '95vh', 
        display: 'flex',
        padding: 2,
        gap: 2,
        backgroundColor: grey[50],
        overflow: 'hidden'
      }}
    >
      {}
      <Box sx={{ 
        flex: '0 0 60%', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 3,
        minWidth: 0 
      }}>
        {}
        <Box sx={{ flex: '0 0 45%', minHeight: 0 }}>
          <Paper elevation={3} sx={{ height: '100%', padding: 0.5 }}>
            <GeographicMap />
          </Paper>
        </Box>
        
        {}
        <Box sx={{ flex: '1 1 55%', minHeight: 0 }}>
          <Paper elevation={3} sx={{ height: '100%', padding: 0.5 }}>
            <ScatterPlot />
          </Paper>
        </Box>
      </Box>
      
      {}
      <Box sx={{ flex: '1 1 40%', minWidth: 0 }}>
        <Paper elevation={3} sx={{ height: '100%', padding: 0.5 }}>
          <SankeyDiagram />
        </Paper>
      </Box>
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Layout />
    </ThemeProvider>
  );
}

export default App;
