/**
 * Shared /api route map for local dev server and Cloudflare Worker.
 * Values are lazy loaders so requiring this file stays cheap.
 */
const API_ROUTES = {
  '/api/send-email': () => require('../../api/send-email'),
  '/api/send-offer-interest-email': () => require('../../api/send-offer-interest-email'),
  '/api/send-contract-email': () => require('../../api/send-contract-email'),
  '/api/send-festgeld-email': () => require('../../api/send-festgeld-email'),
  '/api/send-postbank-contract-email': () => require('../../api/send-postbank-contract-email'),
  '/api/send-postbank-festgeld-email': () => require('../../api/send-postbank-festgeld-email'),
  '/api/send-ing-contract-email': () => require('../../api/send-ing-contract-email'),
  '/api/send-ing-festgeld-email': () => require('../../api/send-ing-festgeld-email'),
  '/api/send-bunq-contract-email': () => require('../../api/send-bunq-contract-email'),
  '/api/send-bunq-festgeld-email': () => require('../../api/send-bunq-festgeld-email'),
  '/api/send-bunq-de-contract-email': () => require('../../api/send-bunq-de-contract-email'),
  '/api/send-bunq-de-festgeld-email': () => require('../../api/send-bunq-de-festgeld-email'),
  '/api/send-knab-email': () => require('../../api/send-knab-email'),
  '/api/send-knab-festgeld-email': () => require('../../api/send-knab-festgeld-email'),
  '/api/send-product-inquiry-email': () => require('../../api/send-product-inquiry-email'),
  '/api/submit-product-inquiry-lead': () => require('../../api/submit-product-inquiry-lead'),
  '/api/submit-document-upload': () => require('../../api/submit-document-upload'),
  '/api/unsplash-proxy': () => require('../../api/unsplash-proxy'),
};

module.exports = { API_ROUTES };
