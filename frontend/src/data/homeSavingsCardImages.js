/**
 * Homepage Sparprodukt-Karten — Editorial-Fotos (je Produkt eigene Szene).
 * @see siteImages.products
 */
import siteImages from '@/data/siteImages';

export const HOME_SAVINGS_CARD_IMAGES = {
  festgeld: siteImages.products.festgeld.homeCard,
  flexgeld: siteImages.products.flexgeld.homeCard,
  tagesgeld: siteImages.products.tagesgeld.homeCard,
};

export const HOME_SAVINGS_CARD_ALT = {
  festgeld: 'Paar plant langfristige Anlage — Festgeld mit fester Laufzeit',
  flexgeld: 'Frau in ruhiger Landschaft — flexible Lebensgestaltung und Liquidität',
  tagesgeld: 'Alltagsszene mit frischen Lebensmitteln — tägliche Verfügbarkeit',
};

export const HOME_SAVINGS_CARD_OBJECT_POSITION = {
  festgeld: 'center 40%',
  flexgeld: 'center 35%',
  tagesgeld: 'center 42%',
};
