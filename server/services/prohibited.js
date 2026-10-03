const PROHIBITED_KEYWORDS = [
  'gun', 'firearm', 'rifle', 'pistol', 'ammo', 'ammunition', 'bullet', 'shotgun', 'weapon',
  'knife', 'dagger', 'sword', 'machete', 'explosive', 'grenade', 'dynamite', 'bomb',
  'firework', 'pyrotechnic', 'narcotic', 'drug', 'marijuana', 'weed', 'cocaine', 'heroin',
  'meth', 'prescription medicine', 'viagra', 'steroid', 'chemical weapon', 'hazardous chemical',
  'radioactive', 'uranium', 'poison', 'cyanide', 'stolen', 'counterfeit', 'replica watch',
  'fake id', 'passport', 'police badge', 'ivory', 'endangered animal', 'human organ',
  'body part', 'lockpick', 'hacking device', 'skimmer'
];

function checkProhibitedItem(title = '', description = '') {
  const combined = `${title.toLowerCase()} ${description.toLowerCase()}`;

  for (const keyword of PROHIBITED_KEYWORDS) {
    // Check whole word or token
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(combined)) {
      return {
        prohibited: true,
        keyword: keyword,
        reason: `Listing mentions '${keyword}', which is on the prohibited/illegal items blacklist.`
      };
    }
  }

  return { prohibited: false };
}

module.exports = {
  checkProhibitedItem,
  PROHIBITED_KEYWORDS
};
