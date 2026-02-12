import * as d3 from 'd3';

export interface BookData {
  id: number;
  title: string;
  author: string;
  genre: string;
  language: string;
  publicationYear: number;
  publisher: string;
  description: string;
  pageCount: number;
  tags: string;
  rating_average: number;
  most_popular_country: string;
  bestseller_status: boolean;
  awards: string;
  age_category: string;
  adapted_to_movie: boolean;
  movie_release_year: number | null;
  isbn: string;
}

export interface CountryData {
  country: string;
  count: number;
  avgRating: number;
}

export interface GenreData {
  genre: string;
  count: number;
  avgRating: number;
  avgPageCount: number;
}

export interface SankeyNodeDatum {
  id: string;
  name: string;
}

export interface SankeyLinkDatum {
  source: string;
  target: string;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNodeDatum[];
  links: SankeyLinkDatum[];
}

export interface ComponentSize {
  width: number;
  height: number;
}

export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface BarChartProps {
  allBooks: BookData[];
  selectedGenre: string | null;
  onGenreSelect: (genre: string | null) => void;
  topGenres: string[];
  genreColorScale: d3.ScaleOrdinal<string, string>;
}

export interface ScatterPlotProps {
  allBooks: BookData[];
  selectedGenre: string | null;
  highlightIds: Set<number>;
  onBrushChange: (ids: Set<number>) => void;
  topGenres: string[];
  genreColorScale: d3.ScaleOrdinal<string, string>;
}

export interface SankeyDiagramProps {
  allBooks: BookData[];
  selectedGenre: string | null;
  brushedIds: Set<number>;
  selectedSankeyNode: string | null;
  onNodeSelect: (nodeId: string | null) => void;
  topGenres: string[];
  genreColorScale: d3.ScaleOrdinal<string, string>;
}