import * as d3 from 'd3';
import { BookData, CountryData, GenreData, SankeyData } from '../types';

/**
 * Load book data from CSV file
 */
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
    
    // Filter out invalid data
    return data.filter(d => 
      d.pageCount > 0 && 
      d.rating_average > 0 && 
      d.publicationYear > 0
    );
  } catch (error) {
    console.error('Error loading book data:', error);
    return [];
  }
}

/**
 * Aggregate data by country for geographic map
 */
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

/**
 * Aggregate data by genre
 */
export function aggregateByGenre(data: BookData[]): GenreData[] {
  const genreMap = new Map<string, { 
    count: number; 
    totalRating: number; 
    totalPages: number 
  }>();
  
  data.forEach(book => {
    const genre = book.genre;
    if (!genre) return;
    
    const existing = genreMap.get(genre) || { 
      count: 0, 
      totalRating: 0, 
      totalPages: 0 
    };
    
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

/**
 * Prepare Sankey diagram data: Genre -> Age Category -> Movie Adaptation
 */
export function prepareSankeyData(data: BookData[]): SankeyData {
  const links: Map<string, number> = new Map();
  const nodesMap: Map<string, string> = new Map(); // id -> display_name

  // --- 1. 聚合流派邏輯 ---
  // 統計每個流派出現的次數
  const genreCounts = new Map<string, number>();
  data.forEach(book => {
    if (book.genre) {
      genreCounts.set(book.genre, (genreCounts.get(book.genre) || 0) + 1);
    }
  });

  // 找出排名前 10 的流派
  const topGenres = Array.from(genreCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(entry => entry[0]);

  // --- 2. 處理數據生成節點與連線 ---
  data.forEach(book => {
    if (!book.genre || !book.age_category) return;

    // 如果不在前 10 名，則歸類為 'Others'
    const processedGenre = topGenres.includes(book.genre) ? book.genre : 'Others';
    const movieStatus = book.adapted_to_movie ? 'Adapted to Movie' : 'Not Adapted';

    // 為不同層級建立唯一 ID（防止環路）
    const genreId = `g_${processedGenre}`;
    const ageId = `a_${book.age_category}`;
    const movieId = `m_${movieStatus}`;

    // 儲存 ID 與顯示名稱的對應
    nodesMap.set(genreId, processedGenre);
    nodesMap.set(ageId, book.age_category);
    nodesMap.set(movieId, movieStatus);

    // 第一層連線: Genre -> Age Category
    const link1 = `${genreId}|${ageId}`;
    links.set(link1, (links.get(link1) || 0) + 1);

    // 第二層連線: Age Category -> Movie Status
    const link2 = `${ageId}|${movieId}`;
    links.set(link2, (links.get(link2) || 0) + 1);
  });

  // 轉換為 D3 格式
  const nodes = Array.from(nodesMap.entries()).map(([id, name]) => ({
    id,
    name,
  }));

  const linksArray = Array.from(links.entries()).map(([key, value]) => {
    const [source, target] = key.split('|');
    return { source, target, value };
  });

  return { nodes, links: linksArray };
}

/**
 * Get top N genres by count
 */
export function getTopGenres(data: BookData[], n: number = 10): string[] {
  const genreData = aggregateByGenre(data);
  return genreData
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
    .map(d => d.genre);
}

/**
 * Filter books by selected genres
 */
export function filterByGenres(data: BookData[], genres: string[]): BookData[] {
  if (genres.length === 0) return data;
  return data.filter(book => genres.includes(book.genre));
}
