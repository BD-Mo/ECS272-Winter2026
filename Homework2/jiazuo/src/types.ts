// Component sizing and margin types
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

// Generic bar chart types (from original template)
export interface Bar {
  value: number;
}

// Book data types
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

// Aggregated data types for visualizations
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

// Sankey diagram node and link types
export interface SankeyNode {
  id: string;
  name: string;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}
