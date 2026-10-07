/**
 * Offline first-aid guides. Content follows standard lay-rescuer first aid
 * (ILCOR/Red Cross-style guidance) and must be reviewed by Sanova's clinical
 * advisers and the Uganda Red Cross before public launch.
 */
export interface GuideStep {
  title: string;
  detail?: string;
}

export interface Guide {
  id: string;
  title: string;
  summary: string;
  icon: string; // Ionicons name
  urgent: boolean;
  callFirst: boolean;
  steps: GuideStep[];
  doNot?: string[];
  getHelpIf?: string[];
}

export const GUIDES: Guide[] = [
  {
    id: 'cpr',
    title: 'Not breathing (CPR)',
    summary: 'Unresponsive and not breathing normally',
    icon: 'heart',
    urgent: true,
    callFirst: true,
    steps: [
      { title: 'Check for danger', detail: 'Make sure you, bystanders and the person are safe from traffic, fire or electricity.' },
      { title: 'Check for a response', detail: 'Tap the shoulders and shout "Are you okay?"' },
      { title: 'Call for help', detail: 'Call 999 or 112 (use speaker phone) or ask someone else to call while you start.' },
      { title: 'Check breathing for up to 10 seconds', detail: 'Tilt the head back, lift the chin, and look, listen and feel. Gasping is NOT normal breathing.' },
      { title: 'Push hard and fast in the centre of the chest', detail: 'Heel of one hand on the centre of the chest, other hand on top. Push down about 5–6 cm, 100–120 times a minute. Let the chest rise fully between pushes.' },
      { title: 'Give rescue breaths if trained', detail: 'After 30 pushes, give 2 breaths (pinch nose, seal your mouth over theirs, blow until the chest rises). If you are not trained or unwilling, keep doing chest pushes only.' },
      { title: 'Do not stop', detail: 'Continue until the person starts breathing normally, a trained responder takes over, or you are too exhausted to continue. Swap with another person every 2 minutes if possible.' },
    ],
    getHelpIf: ['Always — every person who needed CPR must go to hospital.'],
  },
  {
    id: 'bleeding',
    title: 'Severe bleeding',
    summary: 'Blood flowing or spurting from a wound',
    icon: 'water',
    urgent: true,
    callFirst: true,
    steps: [
      { title: 'Protect yourself', detail: 'Use gloves or a plastic bag over your hands if available.' },
      { title: 'Press firmly on the wound', detail: 'Use a clean cloth, kitenge or your hand. Press hard and keep pressing for at least 10 minutes without lifting to check.' },
      { title: 'Add more cloth if blood soaks through', detail: 'Do not remove the first cloth — put more on top and keep pressing.' },
      { title: 'Lay the person down', detail: 'Keep them warm with a cloth or jacket and reassure them.' },
      { title: 'Bandage firmly', detail: 'Once bleeding slows, tie the cloth in place firmly but not so tight that fingers or toes go blue or cold.' },
      { title: 'Life-threatening bleeding from an arm or leg', detail: 'If pressure does not stop it and you are trained, apply a tourniquet 5–7 cm above the wound and note the time.' },
    ],
    doNot: ['Do not remove objects stuck in a wound — press around them.', 'Do not put soil, ash, coffee, herbs or cow dung on a wound.'],
    getHelpIf: ['Bleeding does not stop after 10 minutes of pressure.', 'The wound is deep, gaping, or from a dirty object or animal bite.', 'The person is pale, cold, sweaty, confused or fainting.'],
  },
  {
    id: 'choking-adult',
    title: 'Choking (adult or child over 1)',
    summary: 'Cannot speak, cough or breathe',
    icon: 'alert-circle',
    urgent: true,
    callFirst: false,
    steps: [
      { title: 'Ask "Are you choking?"', detail: 'If they can cough loudly, encourage them to keep coughing.' },
      { title: 'Give 5 back blows', detail: 'Lean them forward, support the chest with one hand, and hit firmly between the shoulder blades with the heel of your other hand.' },
      { title: 'Give 5 abdominal thrusts', detail: 'Stand behind, put a fist just above the belly button, grab it with your other hand, and pull sharply inwards and upwards. For pregnant women or very large people, push on the lower chest instead.' },
      { title: 'Repeat', detail: 'Keep alternating 5 back blows and 5 thrusts until the object comes out.' },
      { title: 'If they become unresponsive', detail: 'Lower them to the ground, call 999/112, and start CPR. Look in the mouth before rescue breaths and remove any object you can see.' },
    ],
    doNot: ['Do not blindly sweep a finger in the mouth.'],
    getHelpIf: ['Abdominal thrusts were used — the person should be checked at a health facility.'],
  },
  {
    id: 'choking-infant',
    title: 'Choking (baby under 1)',
    summary: 'Baby cannot cry, cough or breathe',
    icon: 'happy',
    urgent: true,
    callFirst: false,
    steps: [
      { title: 'Lay the baby face down along your forearm', detail: 'Support the head and jaw with your hand, head lower than the body.' },
      { title: 'Give 5 back blows', detail: 'Firm blows between the shoulder blades with the heel of your hand.' },
      { title: 'Turn the baby face up', detail: 'Keep the head lower than the body.' },
      { title: 'Give 5 chest thrusts', detail: 'Two fingers in the centre of the chest just below the nipple line; push down about 4 cm, 5 times.' },
      { title: 'Repeat until the object comes out', detail: 'If the baby becomes unresponsive, call 999/112 and start infant CPR.' },
    ],
    doNot: ['Never use abdominal thrusts on a baby.', 'Do not hold the baby upside down by the legs and shake.'],
  },
  {
    id: 'burns',
    title: 'Burns and scalds',
    summary: 'Fire, hot water, porridge, oil, paraffin',
    icon: 'flame',
    urgent: false,
    callFirst: false,
    steps: [
      { title: 'Stop the burning', detail: 'Move away from the heat source. If clothes are on fire: stop, drop and roll.' },
      { title: 'Cool with cool running water for 20 minutes', detail: 'Tap water, or pour clean water continuously. Cooling helps even up to 3 hours after the burn.' },
      { title: 'Remove rings, watches and tight clothing', detail: 'Do this before swelling starts — unless stuck to the skin.' },
      { title: 'Cover loosely', detail: 'Use cling film or a clean plastic bag, or a clean non-fluffy cloth.' },
      { title: 'Keep the person warm', detail: 'Cool the burn, not the whole person — especially children.' },
    ],
    doNot: ['Do not apply butter, oil, toothpaste, eggs, flour, herbs or cow dung.', 'Do not use ice.', 'Do not burst blisters.'],
    getHelpIf: ['The burn is larger than the person\'s palm.', 'It is on the face, hands, feet, genitals or joints.', 'It is from electricity or chemicals.', 'The person is a child, elderly or pregnant.', 'The skin looks white, leathery or charred.'],
  },
  {
    id: 'road-crash',
    title: 'Road traffic crash',
    summary: 'Boda, car or pedestrian injury',
    icon: 'car',
    urgent: true,
    callFirst: true,
    steps: [
      { title: 'Make the scene safe', detail: 'Warn traffic (hazard lights, branches or people waving well before the crash). Switch off engines. Watch for fuel leaks and fire.' },
      { title: 'Call 999 or 112', detail: 'Say exactly where you are, how many are injured, and whether anyone is trapped or unconscious. Use SOS to share your location.' },
      { title: 'Check who is most hurt', detail: 'Help those not breathing or bleeding heavily first. A quiet person may be more injured than one who is shouting.' },
      { title: 'Do not move injured people unless there is danger', detail: 'If a neck or back injury is possible, keep the head and neck still in line with the body.' },
      { title: 'Control bleeding', detail: 'Press firmly on wounds (see Severe bleeding).' },
      { title: 'Keep them warm and talk to them', detail: 'Cover with a jacket. Reassure them and stay until help arrives.' },
    ],
    doNot: ['Do not remove a motorcyclist\'s helmet unless they are not breathing and you need to open the airway.', 'Do not give food or drink.', 'Do not pull someone from a vehicle unless there is fire or other immediate danger.'],
  },
  {
    id: 'snakebite',
    title: 'Snake bite',
    summary: 'Any bite — treat as dangerous',
    icon: 'warning',
    urgent: true,
    callFirst: true,
    steps: [
      { title: 'Move away from the snake', detail: 'Do not try to catch or kill it. A photo from a safe distance can help, but is not necessary.' },
      { title: 'Keep the person calm and still', detail: 'Movement spreads venom. Lay them down and reassure them.' },
      { title: 'Remove rings, bangles, watches and tight clothes', detail: 'The bitten limb may swell quickly.' },
      { title: 'Keep the bitten limb still', detail: 'Splint it loosely with a stick or board, at about the level of the heart.' },
      { title: 'Go to a hospital immediately', detail: 'Carry the person if possible — they should not walk. Antivenom is only available at health facilities. Note the time of the bite.' },
    ],
    doNot: ['Do not cut the wound or try to suck out venom.', 'Do not tie a tight tourniquet.', 'Do not use a black stone, herbs, ice, electric shocks or traditional remedies.', 'Do not give alcohol.'],
  },
  {
    id: 'febrile-seizure',
    title: 'Fits / convulsions in a child',
    summary: 'Often with high fever (can be severe malaria)',
    icon: 'thermometer',
    urgent: true,
    callFirst: false,
    steps: [
      { title: 'Stay calm and note the time', detail: 'Most fits stop within 5 minutes.' },
      { title: 'Protect the child from injury', detail: 'Lay them on the floor on their side, away from fire, water and sharp objects.' },
      { title: 'Loosen tight clothing', detail: 'Remove extra blankets and clothes if the child is hot.' },
      { title: 'After the fit, keep them on their side', detail: 'Stay with them — they will be sleepy. Check they are breathing.' },
      { title: 'Take the child to a health facility immediately', detail: 'Fever with fits in Uganda can be severe malaria — this is an emergency even if the fit has stopped.' },
    ],
    doNot: ['Do not put anything in the mouth — not a spoon, finger or cloth.', 'Do not hold the child down.', 'Do not pour cold water on the child or try to give drinks or medicine by mouth during the fit.'],
    getHelpIf: ['The fit lasts more than 5 minutes — call 999/112.', 'The child is hard to wake afterwards or has another fit.', 'Always seek care after a first fit.'],
  },
  {
    id: 'drowning',
    title: 'Drowning',
    summary: 'Pulled from water, lake or pit',
    icon: 'boat',
    urgent: true,
    callFirst: true,
    steps: [
      { title: 'Do not become a second victim', detail: 'Reach with a stick or rope, or throw something that floats (jerrycan, ball). Only enter the water if trained and it is safe.' },
      { title: 'Once out, check breathing', detail: 'Lay them on their back on firm ground.' },
      { title: 'If not breathing: 5 rescue breaths, then CPR', detail: 'Give 5 initial breaths, then 30 chest pushes and 2 breaths, repeating (see CPR).' },
      { title: 'If breathing: put them on their side', detail: 'Keep them warm and watch their breathing until help arrives.' },
    ],
    doNot: ['Do not hold the person upside down or press the stomach to remove water.'],
    getHelpIf: ['Always — anyone rescued from drowning should be checked at a health facility, even if they seem fine.'],
  },
  {
    id: 'labour',
    title: 'Labour danger signs',
    summary: 'Pregnancy or labour emergency',
    icon: 'woman',
    urgent: true,
    callFirst: true,
    steps: [
      { title: 'Know the danger signs', detail: 'Heavy bleeding; labour longer than 12 hours; baby\'s arm, leg or cord appearing first; fits; severe headache or blurred vision; high fever; waters broke but labour has not started; green or bad-smelling fluid.' },
      { title: 'Go to a facility with maternity care now', detail: 'A Health Centre IV or hospital can do caesarean sections and give blood. Call 999/112 or arrange a boda/car immediately.' },
      { title: 'Position her on her left side during transport', detail: 'Keep her warm and bring her antenatal card and any medicines.' },
      { title: 'If the baby is born on the way', detail: 'Dry the baby, place it skin-to-skin on the mother\'s chest and cover both. Do not pull the cord. Keep going to the facility.' },
    ],
    doNot: ['Do not push or press on the mother\'s abdomen.', 'Do not pull on the baby or the cord.', 'Do not give herbal mixtures to speed up labour.'],
  },
  {
    id: 'poisoning',
    title: 'Poisoning',
    summary: 'Swallowed paraffin, chemicals, pills',
    icon: 'flask',
    urgent: true,
    callFirst: true,
    steps: [
      { title: 'Find out what was taken', detail: 'Keep the container, packet or plant to show the health worker.' },
      { title: 'If on the skin or in the eyes', detail: 'Remove contaminated clothing and rinse with lots of clean water for 15–20 minutes.' },
      { title: 'If unresponsive', detail: 'Place on their side if breathing; start CPR if not breathing.' },
      { title: 'Go to a health facility immediately', detail: 'Even if the person seems well — some poisons act slowly.' },
    ],
    doNot: ['Do not make the person vomit.', 'Do not give milk, oil, salt water or herbal mixtures.'],
  },
  {
    id: 'dehydration',
    title: 'Diarrhoea and dehydration',
    summary: 'Making ORS and when to worry',
    icon: 'beaker',
    urgent: false,
    callFirst: false,
    steps: [
      { title: 'Give ORS', detail: 'Mix one ORS sachet in the amount of clean water shown on the packet. Give small sips often, and after every loose stool.' },
      { title: 'No ORS sachet? Make a home solution', detail: '1 litre of clean (boiled and cooled) water + 6 level teaspoons of sugar + ½ level teaspoon of salt. Stir until dissolved.' },
      { title: 'Children: give zinc too', detail: 'Zinc tablets from a health centre or pharmacy shorten diarrhoea. Keep breastfeeding and keep feeding.' },
      { title: 'Wash hands with soap', detail: 'After the toilet and before preparing food, to stop it spreading.' },
    ],
    getHelpIf: ['Blood in the stool.', 'Unable to drink, or vomiting everything.', 'Very sleepy, sunken eyes, or skin pinch goes back slowly.', 'Diarrhoea lasting more than 3 days, or a baby under 6 months.'],
  },
];

export const GUIDE_BY_ID: Record<string, Guide> = Object.fromEntries(GUIDES.map((g) => [g.id, g]));
