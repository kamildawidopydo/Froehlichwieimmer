/**
 * Shared JSDoc typedefs for the Nachrichten module.
 * Pure documentation – this file emits no runtime values.
 */

/**
 * @typedef {Object} NewsArticle
 * @property {string} id
 * @property {string} slug
 * @property {string} guid
 * @property {string} title
 * @property {string|null} summary
 * @property {string|null} content
 * @property {string|null} image_url
 * @property {NewsCategorySlug} category
 * @property {string} source_url
 * @property {string} published_at
 * @property {string} language
 * @property {number} view_count
 * @property {number|null} [read_time_minutes]
 * @property {string|null} [video_embed_url]
 * @property {string|null} [video_thumbnail_url]
 * @property {string|null} [video_source_url]
 */

/**
 * @typedef {'news'|'business'|'culture'|'travel'|'next'|'my-europe'|'health'|'sport'|'climate'} NewsCategorySlug
 */

/**
 * @typedef {'recent'|'popular'} NewsTab
 */

export {};
