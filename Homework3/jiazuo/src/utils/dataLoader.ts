import * as d3 from 'd3';
import { BookData, CountryData, GenreData, SankeyData } from '../types';

export async function loadBookData(): Promise<BookData[]> {
  try {
    const data = await d3.csv('/data/top_1000_most_swapped_books.csv', (d) => {
      return {
        id: +d.id!,
        title: d.title!,
        author: d.author!,
        genre: d.genre!,
        language: d.language!,
        publicationYear: d.publicationYear ? +d.publicationYear : 0,
        publisher: d.publisher!,
        description: d.description!,
        pageCount: d.pageCount ? +d.pageCount : 0,
        tags: d.tags!,
        rating_average: d.rating_average ? +d.rating_average : 0,
        most_popular_country: d.most_popular_country!,
        bestseller_status: d.bestseller_status?.toUpperCase() === 'TRUE',
        awards: d.awards!,
        age_category: d.age_category!,
        adapted_to_movie: d.adapted_to_movie?.toUpperCase() === 'TRUE',
        movie_release_year: d.movie_release_year ? +d.movie_release_year : null,
        isbn: d.isbn!,
      } as BookData;
    });
    return data.filter(d => d.pageCount > 0 && d.rating_average > 0 && d.publicationYear > 0);
  } catch (error) {
    console.error('Error loading book data:', error);
    return [];
  }
}

export function aggregateByCountry(data: BookData[]): CountryData[] {
  const countryMap = new Map<string, { count: number; totalRating: number }>();
  data.forEach(book => {
    const country = book.most_popular_country;
    if (!country) return;
    const existing = countryMap.get(country) || { count: 0, totalRating: 0 };
    countryMap.set(country, {
      count: existing.count + 1,
      totalRating: existing.totalRating + book.rating_average,
    });
  });
  return Array.from(countryMap.entries()).map(([country, stats]) => ({
    country,
    count: stats.count,
    avgRating: stats.totalRating / stats.count,
  }));
}

export function aggregateByGenre(data: BookData[]): GenreData[] {
  const genreMap = new Map<string, { count: number; totalRating: number; totalPages: number }>();
  data.forEach(book => {
    const genre = book.genre;
    if (!genre) return;
    const existing = genreMap.get(genre) || { count: 0, totalRating: 0, totalPages: 0 };
    genreMap.set(genre, {
      count: existing.count + 1,
      totalRating: existing.totalRating + book.rating_average,
      totalPages: existing.totalPages + book.pageCount,
    });
  });
  return Array.from(genreMap.entries()).map(([genre, stats]) => ({
    genre,
    count: stats.count,
    avgRating: stats.totalRating / stats.count,
    avgPageCount: stats.totalPages / stats.count,
  }));
}

export function getRatingTier(rating: number): string {
  if (rating >= 4.5) return 'Acclaimed (4.5+)';
  if (rating >= 4.0) return 'Highly Rated (4.0-4.5)';
  if (rating >= 3.5) return 'Well Rated (3.5-4.0)';
  return 'Average (< 3.5)';
}

export function prepareSankeyData(data: BookData[], topGenreList: string[]): SankeyData {
  const links: Map<string, number> = new Map();
  const nodesMap: Map<string, string> = new Map();

  data.forEach(book => {
    if (!book.genre || !book.rating_average) return;

    const processedGenre = topGenreList.includes(book.genre) ? book.genre : 'Others';
    const ratingTier = getRatingTier(book.rating_average);
    const movieStatus = book.adapted_to_movie ? 'Adapted to Movie' : 'Not Adapted';

    const genreId = `g_${processedGenre}`;
    const ratingId = `r_${ratingTier}`;
    const movieId = `m_${movieStatus}`;

    nodesMap.set(genreId, processedGenre);
    nodesMap.set(ratingId, ratingTier);
    nodesMap.set(movieId, movieStatus);

    const link1 = `${genreId}|${ratingId}`;
    links.set(link1, (links.get(link1) || 0) + 1);

    const link2 = `${ratingId}|${movieId}`;
    links.set(link2, (links.get(link2) || 0) + 1);
  });

  const nodes = Array.from(nodesMap.entries()).map(([id, name]) => ({ id, name }));
  const linksArray = Array.from(links.entries()).map(([key, value]) => {
    const [source, target] = key.split('|');
    return { source, target, value };
  });

  return { nodes, links: linksArray };
}

export function getTopGenres(data: BookData[], n: number = 10): string[] {
  return aggregateByGenre(data)
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
    .map(d => d.genre);
}

export function filterByGenres(data: BookData[], genres: string[]): BookData[] {
  if (genres.length === 0) return data;
  return data.filter(book => genres.includes(book.genre));
}