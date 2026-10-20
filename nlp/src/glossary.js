/**
 * Hospitality Glossary (Member 4)
 * 50 to 80 domain-specific terms in Hindi, Marathi, and English
 * Used for Speech-to-Text phrase hints and translation standardization.
 */

export const HOSPITALITY_GLOSSARY = [
  // 1-10: Rooms & Reception
  { id: 'room', en: 'room', hi: ['कमरा'], mr: ['खोली'], category: 'reception' },
  { id: 'rent', en: 'rent', hi: ['किराया'], mr: ['भाडे'], category: 'pricing' },
  { id: 'checkin', en: 'check-in', hi: ['चेक इन'], mr: ['चेक इन'], category: 'reception' },
  { id: 'checkout', en: 'check-out', hi: ['चेक आउट'], mr: ['चेक आउट'], category: 'reception' },
  { id: 'key', en: 'key', hi: ['चाबी', 'कुंजी'], mr: ['किल्ली', 'चावी'], category: 'reception' },
  { id: 'reception', en: 'reception', hi: ['रिसेप्शन', 'स्वागत कक्ष'], mr: ['रिसेप्शन', 'स्वागत कक्ष'], category: 'reception' },
  { id: 'id_card', en: 'ID card', hi: ['पहचान पत्र', 'आईडी कार्ड'], mr: ['ओळखपत्र', 'आयडी कार्ड'], category: 'reception' },
  { id: 'booking', en: 'booking', hi: ['बुकिंग', 'आरक्षण'], mr: ['बुकिंग', 'आरक्षण'], category: 'reception' },
  { id: 'guest', en: 'guest', hi: ['मेहमान', 'अतिथि'], mr: ['पाहुणे', 'अतिथी'], category: 'reception' },
  { id: 'manager', en: 'manager', hi: ['मैनेजर', 'प्रबंधक'], mr: ['मॅनेजर', 'व्यवस्थापक'], category: 'reception' },

  // 11-20: Amenities & Appliances
  { id: 'ac', en: 'air conditioner', hi: ['एसी', 'वातानुकूलक'], mr: ['एसी', 'वातानुकूलन'], category: 'amenities' },
  { id: 'fan', en: 'fan', hi: ['पंखा'], mr: ['पंखा'], category: 'amenities' },
  { id: 'geyser', en: 'geyser', hi: ['गीजर'], mr: ['गिझर'], category: 'amenities' },
  { id: 'hot_water', en: 'hot water', hi: ['गरम पानी'], mr: ['गरम पाणी'], category: 'amenities' },
  { id: 'cold_water', en: 'cold water', hi: ['ठंडा पानी'], mr: ['थंड पाणी'], category: 'amenities' },
  { id: 'towel', en: 'towel', hi: ['तौलिया'], mr: ['टॉवेल', 'पंचा'], category: 'amenities' },
  { id: 'bedsheet', en: 'bedsheet', hi: ['चादर'], mr: ['चादर'], category: 'amenities' },
  { id: 'blanket', en: 'blanket', hi: ['कंबल'], mr: ['घोंगडी', 'कंबल'], category: 'amenities' },
  { id: 'pillow', en: 'pillow', hi: ['तकिया'], mr: ['उशी'], category: 'amenities' },
  { id: 'soap', en: 'soap', hi: ['साबुन'], mr: ['साबण'], category: 'amenities' },

  // 21-30: Connectivity & Access
  { id: 'wifi', en: 'Wi-Fi', hi: ['वाईफाई', 'इंटरनेट'], mr: ['वायफाय', 'इंटरनेट'], category: 'connectivity' },
  { id: 'password', en: 'password', hi: ['पासवर्ड'], mr: ['पासवर्ड'], category: 'connectivity' },
  { id: 'elevator', en: 'elevator', hi: ['लिफ्ट'], mr: ['लिफ्ट'], category: 'facilities' },
  { id: 'stairs', en: 'stairs', hi: ['सीढ़ियां'], mr: ['पायऱ्या'], category: 'facilities' },
  { id: 'ground_floor', en: 'ground floor', hi: ['भूतल', 'ग्राउंड फ्लोर'], mr: ['तळमजला', 'ग्राउंड फ्लोर'], category: 'facilities' },
  { id: 'first_floor', en: 'first floor', hi: ['पहली मंजिल'], mr: ['पहिला मजला'], category: 'facilities' },
  { id: 'second_floor', en: 'second floor', hi: ['दूसरी मंजिल'], mr: ['दुसरा मजला'], category: 'facilities' },
  { id: 'parking', en: 'parking', hi: ['पार्किंग', 'वाहन स्थल'], mr: ['पार्किंग', 'वाहन तळ'], category: 'facilities' },
  { id: 'luggage', en: 'luggage', hi: ['सामान', 'लगेज'], mr: ['सामान', 'लगेज'], category: 'services' },
  { id: 'locker', en: 'locker', hi: ['लॉकर', 'तिजोरी'], mr: ['लॉकर', 'तिजोरी'], category: 'facilities' },

  // 31-40: Food & Beverage
  { id: 'breakfast', en: 'breakfast', hi: ['नाश्ता'], mr: ['नाश्ता', 'न्याहारी'], category: 'dining' },
  { id: 'lunch', en: 'lunch', hi: ['दोपहर का खाना'], mr: ['दुपारचे जेवण'], category: 'dining' },
  { id: 'dinner', en: 'dinner', hi: ['रात का खाना'], mr: ['रात्रीचे जेवण'], category: 'dining' },
  { id: 'tea', en: 'tea', hi: ['चाय'], mr: ['चहा'], category: 'dining' },
  { id: 'coffee', en: 'coffee', hi: ['कॉफी'], mr: ['कॉफी'], category: 'dining' },
  { id: 'water_bottle', en: 'water bottle', hi: ['पानी की बोतल'], mr: ['पाण्याची बाटली'], category: 'dining' },
  { id: 'menu', en: 'menu', hi: ['मेनू', 'व्यंजन सूची'], mr: ['मेनू'], category: 'dining' },
  { id: 'drinking_water', en: 'drinking water', hi: ['पीने का पानी'], mr: ['पिण्याचे पाणी'], category: 'dining' },
  { id: 'vegetarian', en: 'vegetarian', hi: ['शाकाहारी'], mr: ['शाकाहारी'], category: 'dining' },
  { id: 'non_vegetarian', en: 'non-vegetarian', hi: ['मांसाहारी'], mr: ['मांसाहारी'], category: 'dining' },

  // 41-50: Payments & Billing
  { id: 'bill', en: 'bill', hi: ['बिल'], mr: ['बिल'], category: 'pricing' },
  { id: 'receipt', en: 'receipt', hi: ['रसीद', 'पावती'], mr: ['पावती'], category: 'pricing' },
  { id: 'advance', en: 'advance deposit', hi: ['एडवांस', 'अग्रिम राशि'], mr: ['अ‍ॅडव्हान्स', 'अनामत रक्कम'], category: 'pricing' },
  { id: 'discount', en: 'discount', hi: ['छूट', 'डिस्काउंट'], mr: ['सवलत', 'डिस्काउंट'], category: 'pricing' },
  { id: 'tax', en: 'tax', hi: ['टैक्स', 'कर'], mr: ['टॅक्स', 'कर'], category: 'pricing' },
  { id: 'total', en: 'total', hi: ['कुल', 'टोटल'], mr: ['एकूण', 'टोटल'], category: 'pricing' },
  { id: 'cash', en: 'cash', hi: ['नकद', 'कैश'], mr: ['रोख', 'कॅश'], category: 'pricing' },
  { id: 'online_payment', en: 'online payment', hi: ['ऑनलाइन भुगतान'], mr: ['ऑनलाइन पेमेंट'], category: 'pricing' },
  { id: 'per_night', en: 'per night', hi: ['प्रति रात'], mr: ['दर रात्री'], category: 'pricing' },
  { id: 'extra_bed', en: 'extra bed', hi: ['अतिरिक्त बिस्तर'], mr: ['जादा गादी', 'अतिरिक्त बेड'], category: 'amenities' },

  // 51-60: Housekeeping & Services
  { id: 'cleaning', en: 'cleaning', hi: ['सफाई'], mr: ['स्वच्छता', 'सफाई'], category: 'services' },
  { id: 'laundry', en: 'laundry', hi: ['लॉन्ड्री', 'धुलाई'], mr: ['लॉन्ड्री', 'धुलाई'], category: 'services' },
  { id: 'iron', en: 'iron', hi: ['इस्त्री'], mr: ['इस्त्री'], category: 'services' },
  { id: 'dustbin', en: 'dustbin', hi: ['कूड़ेदान'], mr: ['कचराकुंडी'], category: 'housekeeping' },
  { id: 'room_service', en: 'room service', hi: ['रूम सर्विस'], mr: ['रूम सर्व्हिस'], category: 'services' },
  { id: 'morning_call', en: 'wake-up call', hi: ['वेक-अप कॉल'], mr: ['वेक-अप कॉल'], category: 'services' },
  { id: 'balcony', en: 'balcony', hi: ['बालकनी'], mr: ['बाल्कनी'], category: 'amenities' },
  { id: 'bathroom', en: 'bathroom', hi: ['बाथरूम', 'स्नानघर'], mr: ['बाथरूम', 'स्नानगृह'], category: 'amenities' },
  { id: 'door', en: 'door', hi: ['दरवाजा'], mr: ['दार', 'दरवाजा'], category: 'facilities' },
  { id: 'window', en: 'window', hi: ['खिड़की'], mr: ['खिडकी'], category: 'facilities' },

  // 61-68: Rules & Assistance
  { id: 'smoking_prohibited', en: 'no smoking', hi: ['धूम्रपान निषेध'], mr: ['धूम्रपान बंदी'], category: 'rules' },
  { id: 'help', en: 'help', hi: ['मदद', 'सहायता'], mr: ['मदत', 'सहाय्य'], category: 'services' },
  { id: 'urgent', en: 'urgent', hi: ['जरूरी', 'तत्काल'], mr: ['तातडीचे', 'तातडीने'], category: 'services' },
  { id: 'in_morning', en: 'in the morning', hi: ['सुबह'], mr: ['सकाळी'], category: 'time' },
  { id: 'in_afternoon', en: 'in the afternoon', hi: ['दोपहर में'], mr: ['दुपारी'], category: 'time' },
  { id: 'in_evening', en: 'in the evening', hi: ['शाम को'], mr: ['संध्याकाळी'], category: 'time' },
  { id: 'at_night', en: 'at night', hi: ['रात को'], mr: ['रात्री'], category: 'time' },
  { id: 'time', en: 'time', hi: ['समय', 'वक्त'], mr: ['वेळ'], category: 'time' }
];

/**
 * Returns the entire hospitality glossary list.
 */
export function getGlossary() {
  return HOSPITALITY_GLOSSARY;
}

/**
 * Total number of terms in the glossary.
 */
export function getGlossaryCount() {
  return HOSPITALITY_GLOSSARY.length;
}

/**
 * Finds matching glossary items by looking up a Hindi or Marathi phrase.
 * @param {string} text - Input text in Hindi or Marathi
 * @param {"hi"|"mr"} lang - Language code
 * @returns {Array<typeof HOSPITALITY_GLOSSARY[0]>}
 */
export function findMatchingTerms(text, lang) {
  if (!text || typeof text !== 'string') return [];
  const normalized = text.toLowerCase();

  return HOSPITALITY_GLOSSARY.filter(entry => {
    const termList = lang === 'mr' ? entry.mr : entry.hi;
    return termList.some(term => normalized.includes(term.toLowerCase()));
  });
}

/**
 * Extract an array of phrase hints for Google Cloud Speech-to-Text SpeechContext.
 * Boosts recognition accuracy for common hospitality words.
 * @param {"hi"|"mr"} lang
 * @returns {string[]}
 */
export function getSpeechHints(lang = 'hi') {
  const hints = new Set();
  for (const entry of HOSPITALITY_GLOSSARY) {
    const list = lang === 'mr' ? entry.mr : entry.hi;
    list.forEach(w => hints.add(w));
  }
  return Array.from(hints);
}

