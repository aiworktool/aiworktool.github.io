import type { GuideBook } from './types';

export const enDisclaimer =
  'These starter notes are compiled from public gameplay, will change with versions, and are not an official guide.';

export const enGuides: GuideBook = {
  'honor-of-kings': {
    slug: 'honor-of-kings',
    title: 'Honor of Kings',
    summary: 'Five people push lanes. Learn one role and one hero before ranked.',
    what: [
      'Each side has five players, three lanes, and a jungle. Destroy the enemy base. Kills are not the goal.',
      'Roles are clash lane, mid, farm lane, jungle, and roam. Stick to one role while you learn.',
    ],
    firstDays: [
      'Play co-op and unranked first. Try heroes in practice, keep one with few skills, then queue ranked.',
      'Arthur or Cheng Yaojin for clash, Hou Yi for farm, Xiao Qiao or Angela for mid, Yao or Cai Wenji for roam.',
      'For the first games: take minions, recall when low, and do not walk into a tower alone.',
      'Jungle needs the whole map, so skip it at first. Roam looks easy and watches the minimap.',
    ],
    resources: [
      'Buy heroes with gold. Save diamonds for emblems, not for heroes or cosmetics.',
      'Finish one emblem page for the damage type you actually play. Do not open five pages at once.',
      'Daily quests and the free battle-pass track pay gold more steadily than ranked grinding. Coupons are optional.',
    ],
    pitfalls: [
      'Chasing kills and ignoring minions leaves you under-leveled for every team fight.',
      'After a death, check whether you dove a tower or missed the map before blaming teammates.',
      'Do not spend emblem shards upgrading low tiers just to fill slots. Save them for the page you use.',
      'Swapping hero and role after every loss usually loses faster. Learn one role first.',
    ],
    disclaimer: enDisclaimer,
  },
  'delta-force': {
    slug: 'delta-force',
    title: 'Delta Force',
    summary: 'Bring a kit, loot, and extract alive. There is also a large-scale battle mode.',
    what: [
      'Operations is the extraction mode: enter with gear, loot, and reach an extract to keep it.',
      'If you die, most of your kit stays behind. Warfare is crowded, and it helps you learn gunfire.',
      'Selling extracted loot pays Tekniq Alloys, which buy meds, ammo, and the next kit.',
    ],
    firstDays: [
      'Start in Warfare, or the cheapest Operations map. Zero Dam is the usual first map because it is compact.',
      'Check the extract direction before you spawn. The first week is for learning exits, not wearing a full kit.',
      'Use the issued kit the game gives you. Do not bring a gun you just saved up on the first raid.',
      'When you hear a fight, decide if you can go around it. Getting out with loot beats one extra knock.',
    ],
    resources: [
      'Keep the backpack for items that are clearly worth more. The safe box is tiny: only your best small items.',
      'Issued-gear tickets have a cap. Check the mailbox before claiming all, or overflow becomes coins.',
      'While you are poor, skip raids that demand an expensive kit. High-tier raids cost more if you die.',
      'Ammo and meds for one raid come before attachments and skins.',
    ],
    pitfalls: [
      'Running toward gunfire with an empty bag is how new players lose the stash.',
      'Some extracts want a dropped bag or a weight limit. Reaching the door and failing the check wastes the raid.',
      'The safe box is not a warehouse. Armor and your main gun usually stay on the ground if you die.',
      'Spending the first profit on the most expensive kit means one death deletes several raids.',
    ],
    disclaimer: enDisclaimer,
  },
  'game-for-peace': {
    slug: 'game-for-peace',
    title: 'Game for Peace',
    summary: 'About a hundred people drop in. The zone shrinks. Last one standing wins.',
    what: [
      'A match drops about a hundred players onto one map. Standing outside the shrinking zone drains health.',
      'Guns, helmets, armor, and meds come from buildings, cars, and crates. Vehicles are for moving, not sightseeing.',
      'Besides the classic match there is a training range and faster modes. Learn a rifle there first.',
    ],
    firstDays: [
      'Play casual or bots before ranked. Recoil comes from shooting, not from memorizing a chart.',
      'Drop on an edge town. Skip famous hot drops such as airports and schools until you can win a landing fight.',
      'Grab a rifle and ammo first, then helmet, armor, and meds. Scopes and attachments come last.',
      'Look at the map as soon as the zone starts moving. Dying in the storm with a full gun is the expensive death.',
    ],
    resources: [
      'Coupons and crates do not improve your landing aim. Skins can wait.',
      'The free season track, daily quests, and events are enough to collect the usual currencies.',
      'Closet cosmetics do not change a fight. If time is short, play fewer games and listen for steps and the zone.',
    ],
    pitfalls: [
      'Lying down with the first sniper you find. A stable rifle and enough meds matter more at the start.',
      'Driving without the minimap puts you in the closing zone or into someone else’s convoy.',
      'Chasing every gunshot. Check armor, meds, and where your squad is first.',
      'Changing sensitivity after two losses. Leave it alone for a week, then nudge it toward the misses.',
    ],
    disclaimer: enDisclaimer,
  },
  tft: {
    slug: 'tft',
    title: 'Teamfight Tactics',
    summary: 'Eight players, automatic fights. Saving gold matters more than memorizing a comp.',
    what: [
      'You buy pieces, place them, and the fight plays itself. Level decides how many units you can field.',
      'Traits are bonuses for sharing a class or origin. Other players buy the same units, so no comp is guaranteed.',
      'Health is the score. A top-four finish is usually a successful game.',
    ],
    firstDays: [
      'Play normal or casual first. Learn when to level, when to roll the shop, and how items combine.',
      'Traits and recipes are in the client. Learn the one you are playing, not the whole list.',
      'Use a small trait you can already field. Do not bleed out waiting for one late unit.',
      'Tanks in front, damage behind. If the enemy jumps the backline, tuck damage toward the middle.',
    ],
    resources: [
      'At the end of a round, about 1 gold of interest per 10 gold is typical, and it caps near 50 gold.',
      'Streaks pay a little extra. A short loss streak is fine while healthy. Do not open-fort on low health.',
      'Combine components into an item this board can use. One right item beats a three-star you cannot finish.',
      'Leveling costs gold too. Rolling everything while your board is short on units wastes the interest.',
    ],
    pitfalls: [
      'Forcing a named comp after its units are gone. Pivot to the trait you already hold.',
      'Rolling to zero gold early leaves no interest and no money to level.',
      'Putting damage in the front row, or parking every tank in the back.',
      'Chasing three different three-stars. Make the board fight, then pick one unit to upgrade.',
    ],
    disclaimer: enDisclaimer,
  },
  genshin: {
    slug: 'genshin',
    title: 'Genshin Impact',
    summary: 'An open world of swapping characters, puzzles, and the main story. Stamina is resin.',
    what: [
      'You follow the story, solve puzzles, and fight with a party of up to four characters.',
      'Elements react, and those reactions are a large part of your damage. Exploring usually costs no resin.',
      'Original Resin is stamina. Domains, bosses, and ley lines spend it on claim. A full bar stops regenerating.',
    ],
    firstDays: [
      'Follow the main story. It teaches elements, gathering, and waypoints. More waypoints means less running.',
      'Build one team of four: a main attacker, a healer or shielder, and two reactors. Bench new pulls.',
      'Daily commissions do not spend resin. Finish them before you decide to enter a domain.',
      'Early resin goes to character and weapon ascension. Artifact stats are noisy on a half-built team.',
    ],
    resources: [
      'Resin returns about 1 point every 8 minutes, and the natural cap is 200. Spend it before it caps.',
      'Fragile Resin is a one-time refill. Spend it on a known ascension material, not on artifacts.',
      'Save primogems for a character or weapon you want. Aimless wishes, or buying resin, run you dry.',
      'Mora and experience books run out too. Finish one character before raising a second damage dealer.',
    ],
    pitfalls: [
      'Leveling seven or eight characters at once. When world level rises, none of them can clear.',
      'Farming artifacts every day while adventure rank is still low. Ascension materials first.',
      'Raising world level with no healer or shield. If elites wall the story, go back and build.',
      'Pulling only from this patch’s tier list. A weapon and materials matter more than the chart.',
    ],
    disclaimer: enDisclaimer,
  },
  'valorant-mobile': {
    slug: 'valorant-mobile',
    title: 'Valorant Mobile',
    summary: 'Five-player bomb rounds. Aim matters, and so do money and ability timing.',
    what: [
      'Five versus five, round by round. Plant the spike, defuse it, or eliminate the other team.',
      'Abilities, guns, and shields cost that round’s credits. Dying last round does not buy you a rifle.',
      'Valorant Mobile uses the same kind of rules as the PC game. Calling locations and waiting beats roaming alone.',
    ],
    firstDays: [
      'Use the range, deathmatch, or unrated first. Shooting while you move sprays. Stop, then shoot.',
      'Pick an agent whose kit you can explain. Heal or wall to support, or a gun-first agent to duel.',
      'Check credits every round. If the team is short, save together. Do not be the only rifle next to four pistols.',
      'Someone watches the flank while the spike is planted or defused. Call footsteps before you peek.',
    ],
    resources: [
      'Credits exist only inside the match. A saved round is what buys rifles and shields together on the next one.',
      'Abilities are consumables. Save smokes, walls, and heals for the execute or the plant.',
      'Skins and the pass do not change gun damage. Rank comes from rounds, not from spending.',
      'With little time, keep one agent and one main rifle. Swapping agents every day slows you down.',
    ],
    pitfalls: [
      'Buying the most expensive gun every round, then showing up naked on the round that matters.',
      'Clearing the whole map alone. After you die, your team still does not know where anyone is.',
      'Leaving the spike to take a fight. A cancelled plant or defuse usually loses the round.',
      'Nudging sensitivity every day. Freeze it, then move it toward the shots you miss.',
    ],
    disclaimer: enDisclaimer,
  },
};
