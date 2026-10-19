export const MINIMUM_AGE_YEARS = 18;

export const UNDER_AGE_MESSAGE =
  'Sie müssen mindestens 18 Jahre alt sein, um fortzufahren.';

const parseBirthDate = (birthDate) => {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const calculateAge = (birthDate, referenceDate = new Date()) => {
  const birth = parseBirthDate(birthDate);
  const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  if (!birth) return null;

  let age = ref.getFullYear() - birth.getFullYear();
  const monthDiff = ref.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
};

export const isAtLeastAge = (birthDate, minAge = MINIMUM_AGE_YEARS) => {
  const age = calculateAge(birthDate);
  return age !== null && age >= minAge;
};

export const isAtLeast18 = (birthDate) => isAtLeastAge(birthDate, MINIMUM_AGE_YEARS);

export const maxBirthDateForMinimumAge = (minAge = MINIMUM_AGE_YEARS) => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  d.setFullYear(d.getFullYear() - minAge);
  return d;
};
