export const wordPairs = [
  { civilian: 'Apple', spy: 'Pear' },
  { civilian: 'Dog', spy: 'Cat' },
  { civilian: 'Coffee', spy: 'Tea' },
  { civilian: 'Pizza', spy: 'Burger' },
  { civilian: 'Beach', spy: 'Pool' },
  { civilian: 'Guitar', spy: 'Violin' },
  { civilian: 'Doctor', spy: 'Nurse' },
  { civilian: 'Football', spy: 'Basketball' },
  { civilian: 'Rain', spy: 'Snow' },
  { civilian: 'Laptop', spy: 'Tablet' },
  { civilian: 'Bus', spy: 'Train' },
  { civilian: 'Cinema', spy: 'Theatre' },
  { civilian: 'Chicken', spy: 'Duck' },
  { civilian: 'River', spy: 'Lake' },
  { civilian: 'Phone', spy: 'Camera' },
  { civilian: 'Sword', spy: 'Knife' },
  { civilian: 'Castle', spy: 'Palace' },
  { civilian: 'Astronaut', spy: 'Pilot' },
  { civilian: 'Shark', spy: 'Dolphin' },
  { civilian: 'Diamond', spy: 'Crystal' },
];

export const getRandomWordPair = () => {
  return wordPairs[Math.floor(Math.random() * wordPairs.length)];
};
