import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली' }
];

const resources = {
  en: {
    translation: {
      app_title: "JALDRISHTI",
      app_subtitle: "Hyperlocal Flash-Flood & Landslide Early Warning System",
      nav: {
        dashboard: "Dashboard",
        map: "Live Risk Map",
        alerts: "Alerts",
        villages: "Village Analytics",
        forecast: "Hydrology Forecast",
        evacuation: "Evacuation Route",
        settings: "Settings"
      },
      status: {
        online: "SYSTEM ONLINE",
        live: "Live",
        available: "Available",
        critical: "CRITICAL",
        high: "HIGH",
        moderate: "MODERATE",
        low: "LOW"
      },
      ndrf: {
        pill: "NDRF: 1078 / 112",
        title: "National Disaster Response Force (NDRF)",
        desc: "If you require immediate flood rescue, boat evacuation, or emergency disaster support, reach out directly to the active NDRF battalions and state disaster command rooms.",
        tollfree: "National Toll-Free Emergency",
        helpline: "NDRF 24/7 Helpline",
        hq: "NDRF HQ Control Room",
        seoc: "State SEOC Control Room",
        ministry: "Disaster Ministry Helpline"
      },
      actions: {
        analyze_risk: "Run Risk Analysis",
        use_gps: "Use Current Location",
        gps_active: "GPS Location Active",
        detecting_gps: "Detecting GPS...",
        select_state: "Select State",
        select_district: "Select District",
        select_village: "District-Level Analysis",
        view_shelter: "View Safest Escape Corridor",
        simulate_cloudburst: "Simulate Cloudburst",
        reset_sim: "Reset Simulation",
        sync_live: "Sync Live",
        evacuate_now: "Evacuate Now",
        query_hydrology: "Query Hydrology",
        acknowledge: "Acknowledge Warning",
        open_evacuation: "Open Evacuation Corridor"
      },
      metrics: {
        risk_score: "ML Risk Score",
        lead_time: "Lead Time",
        susceptibility: "Susceptibility",
        terrain: "Terrain",
        temperature: "Temperature",
        humidity: "Humidity",
        current_rain: "Current Rain",
        rain_24h: "24h Accumulation",
        elevation: "Elevation",
        slope: "Mean Slope",
        discharge: "River Discharge",
        water_stage: "River Stage",
        danger_mark: "Danger Mark"
      }
    }
  },
  hi: {
    translation: {
      app_title: "जलदृष्टि",
      app_subtitle: "अति-स्थानीय अचानक बाढ़ और भूस्खलन पूर्व चेतावनी प्रणाली",
      nav: {
        dashboard: "डैशबोर्ड",
        map: "लाइव जोखिम मानचित्र",
        alerts: "सचेत / अलर्ट",
        villages: "ग्राम विश्लेषण",
        forecast: "जल विज्ञान पूर्वानुमान",
        evacuation: "निकासी मार्ग",
        settings: "सेटिंग्स"
      },
      status: {
        online: "सिस्टम ऑनलाइन",
        live: "लाइव",
        available: "उपलब्ध",
        critical: "गंभीर",
        high: "उच्च जोखिम",
        moderate: "मध्यम",
        low: "सामान्य"
      },
      ndrf: {
        pill: "NDRF: 1078 / 112",
        title: "राष्ट्रीय आपदा मोचन बल (NDRF)",
        desc: "यदि आपको तत्काल बाढ़ बचाव, नाव सहायता या आपातकालीन आपदा सहायता की आवश्यकता है, तो सीधे सक्रिय NDRF बटालियन और राज्य आपदा नियंत्रण कक्ष से संपर्क करें।",
        tollfree: "राष्ट्रीय आपातकालीन टोल-फ्री",
        helpline: "NDRF 24/7 हेल्पलाइन",
        hq: "NDRF मुख्यालय नियंत्रण कक्ष",
        seoc: "राज्य आपदा नियंत्रण (SEOC)",
        ministry: "आपदा प्रबंधन मंत्रालय"
      },
      actions: {
        analyze_risk: "जोखिम विश्लेषण करें",
        use_gps: "वर्तमान स्थान का उपयोग करें",
        gps_active: "जीपीएस सक्रिय है",
        detecting_gps: "जीपीएस खोज रहे हैं...",
        select_state: "राज्य चुनें",
        select_district: "ज़िला चुनें",
        select_village: "ज़िला स्तरीय विश्लेषण",
        view_shelter: "सुरक्षित निकासी गलियारा देखें",
        simulate_cloudburst: "बादल फटना सिमुलेट करें",
        reset_sim: "सिमुलेशन रीसेट करें",
        sync_live: "लाइव डेटा सिंक करें",
        evacuate_now: "तुरंत सुरक्षित स्थान जाएं",
        query_hydrology: "जल विज्ञान जांचें",
        acknowledge: "चेतावनी स्वीकार करें",
        open_evacuation: "निकासी गलियारा खोलें"
      },
      metrics: {
        risk_score: "बाढ़ जोखिम स्कोर",
        lead_time: "चेतावनी समय",
        susceptibility: "संवेदनशीलता",
        terrain: "भू-भाग",
        temperature: "तापमान",
        humidity: "आर्द्रता",
        current_rain: "वर्तमान वर्षा",
        rain_24h: "24 घंटे की कुल वर्षा",
        elevation: "ऊंचाई",
        slope: "ढलान",
        discharge: "नदी जल निर्वहन",
        water_stage: "नदी जल स्तर",
        danger_mark: "खतरे का निशान"
      }
    }
  },
  bn: {
    translation: {
      app_title: "জলদৃষ্টি",
      app_subtitle: "অতি-স্থানীয় আকস্মিক বন্যা ও ভূমিধস পূর্ব সতর্কীকরণ ব্যবস্থা",
      nav: {
        dashboard: "ড্যাশবোর্ড",
        map: "লাইভ ঝুঁকি মানচিত্র",
        alerts: "সতর্কবার্তা",
        villages: "গ্রাম বিশ্লেষণ",
        forecast: "জলবিজ্ঞান পূর্বাভাস",
        evacuation: "উদ্ধার পথ",
        settings: "সেটিংস"
      },
      status: {
        online: "সিস্টেম অনলাইন",
        live: "লাইভ",
        available: "উপলব্ধ",
        critical: "সংকটজনক",
        high: "উচ্চ ঝুঁকি",
        moderate: "মাঝারি",
        low: "স্বাভাবিক"
      },
      ndrf: {
        pill: "NDRF: 1078 / 112",
        title: "জাতীয় দুর্যোগ মোকাবিলা বাহিনী (NDRF)",
        desc: "বন্যার তাৎক্ষণিক উদ্ধার ও জরুরি সহায়তার জন্য সরাসরি এনডিআরএফ কন্ট্রোল রুমে যোগাযোগ করুন।",
        tollfree: "জাতীয় টোল-ফ্রি জরুরি নম্বর",
        helpline: "NDRF ২৪/৭ হেল্পলাইন",
        hq: "NDRF সদর দপ্তর নিয়ন্ত্রণ কক্ষ",
        seoc: "রাজ্য দুর্যোগ নিয়ন্ত্রণ কক্ষ",
        ministry: "দুর্যোগ ব্যবস্থাপনা মন্ত্রক"
      },
      actions: {
        analyze_risk: "ঝুঁকি বিশ্লেষণ চালান",
        use_gps: "বর্তমান অবস্থান ব্যবহার করুন",
        gps_active: "জিপিএস সক্রিয়",
        detecting_gps: "জিপিএস খোঁজা হচ্ছে...",
        select_state: "রাজ্য নির্বাচন করুন",
        select_district: "জেলা নির্বাচন করুন",
        select_village: "জেলা পর্যায়ের বিশ্লেষণ",
        view_shelter: "নিরাপদ উদ্ধার করিডোর দেখুন",
        simulate_cloudburst: "মেঘভাঙা বৃষ্টি সিমুলেট করুন",
        reset_sim: "সিমুলেশন রিসেট করুন",
        sync_live: "লাইভ তথ্য সিঙ্ক করুন",
        evacuate_now: "এখনই নিরাপদ স্থানে যান",
        query_hydrology: "জলবিজ্ঞান তথ্য দেখুন",
        acknowledge: "সতর্কবার্তা গ্রহণ করুন",
        open_evacuation: "উদ্ধার পথ খুলুন"
      },
      metrics: {
        risk_score: "বন্যা ঝুঁকি স্কোর",
        lead_time: "সতর্কতার সময়",
        susceptibility: "সংবেদনশীলতা",
        terrain: "ভূপ্রকৃতি",
        temperature: "তাপমাত্রা",
        humidity: "আর্দ্রতা",
        current_rain: "বর্তমান বৃষ্টিপাত",
        rain_24h: "২৪ ঘণ্টার মোট বৃষ্টি",
        elevation: "উচ্চতা",
        slope: "ঢাল",
        discharge: "নদীর জলপ্রবাহ",
        water_stage: "নদীর জলস্তর",
        danger_mark: "বিপদের মাত্রা"
      }
    }
  },
  as: {
    translation: {
      app_title: "জলদৃষ্টি",
      app_subtitle: "অতি-স্থানীয় হঠাত বানপানী আৰু ভূমিস্খলনৰ আগতীয়া সতৰ্কবাৰ্তা প্ৰণালী",
      nav: {
        dashboard: "ডেশ্বব'ৰ্ড",
        map: "লাইভ বিপদ মানচিত্ৰ",
        alerts: "সতৰ্কবাৰ্তা",
        villages: "গাঁও বিশ্লেষণ",
        forecast: "জলবিজ্ঞান পূৰ্বাভাস",
        evacuation: "উদ্ধাৰ পথ",
        settings: "ছেটিংছ"
      },
      status: {
        online: "ছিষ্টেম অনলাইন",
        live: "লাইভ",
        available: "উপলব্ধ",
        critical: "সংকটজনক",
        high: "উচ্চ বিপদ",
        moderate: "মধ্যম",
        low: "স্বাভাবিক"
      },
      ndrf: {
        pill: "NDRF: 1078 / 112",
        title: "ৰাষ্ট্ৰীয় দুৰ্যোগ প্ৰশমন বাহিনী (NDRF)",
        desc: "বানপানীৰ জৰুৰী উদ্ধাৰ আৰু সাহায্যৰ বাবে পোনপটীয়াকৈ এনডিআৰএফ নিয়ন্ত্ৰণ কক্ষৰ সৈতে যোগাযোগ কৰক।",
        tollfree: "ৰাষ্ট্ৰীয় টোল-ফ্ৰী জৰুৰী নম্বৰ",
        helpline: "NDRF ২৪/৭ হেল্পলাইন",
        hq: "NDRF মুখ্য নিয়ন্ত্ৰণ কক্ষ",
        seoc: "ৰাজ্যিক দুৰ্যোগ নিয়ন্ত্ৰণ কক্ষ",
        ministry: "দুৰ্যোগ ব্যৱস্থাপনা মন্ত্ৰালয়"
      },
      actions: {
        analyze_risk: "বিপদ বিশ্লেষণ কৰক",
        use_gps: "বৰ্তমান স্থান ব্যৱহাৰ কৰক",
        gps_active: "জিপিএছ সক্ৰিয়",
        detecting_gps: "জিপিএছ সন্ধান চলিছে...",
        select_state: "ৰাজ্য বাছক",
        select_district: "জিলা বাছক",
        select_village: "জিলা পৰ্যায়ৰ বিশ্লেষণ",
        view_shelter: "সুৰক্ষিত আশ্ৰয় পথ চাওক",
        simulate_cloudburst: "মেঘ বিস্ফোৰণ অনুকৰণ কৰক",
        reset_sim: "পূৰ্বৰ অৱস্থালৈ আনক",
        sync_live: "লাইভ তথ্য সংগ্ৰহ কৰক",
        evacuate_now: "এতিয়াই সুৰক্ষিত স্থানলৈ যাওক",
        query_hydrology: "জলবিজ্ঞান পৰীক্ষা কৰক",
        acknowledge: "সতৰ্কবাৰ্তা নিশ্চিত কৰক",
        open_evacuation: "উদ্ধাৰ পথ খোলক"
      },
      metrics: {
        risk_score: "বানপানীৰ আশংকা স্ক'ৰ",
        lead_time: "সতৰ্কতাৰ সময়",
        susceptibility: "সংবেদনশীলতা",
        terrain: "ভূ-প্ৰকৃতি",
        temperature: "উত্তাপ",
        humidity: "আৰ্দ্ৰতা",
        current_rain: "বৰ্তমান বৰষুণ",
        rain_24h: "২৪ ঘণ্টাৰ বৰষুণ",
        elevation: "উচ্চতা",
        slope: "ঢাল",
        discharge: "নদীৰ জলপ্ৰবাহ",
        water_stage: "নদীৰ জলস্তৰ",
        danger_mark: "বিপদ সীমা"
      }
    }
  },
  ne: {
    translation: {
      app_title: "जलदृष्टि",
      app_subtitle: "अति-स्थानीय आकस्मिक बाढी र पहिरो पूर्व चेतावनी प्रणाली",
      nav: {
        dashboard: "ड्यासबोर्ड",
        map: "प्रत्यक्ष जोखिम नक्सा",
        alerts: "चेतावनीहरू",
        villages: "गाउँ विश्लेषण",
        forecast: "जलविज्ञान पूर्वानुमान",
        evacuation: "निकासी मार्ग",
        settings: "सेटिङहरू"
      },
      status: {
        online: "प्रणाली अनलाइन",
        live: "प्रत्यक्ष",
        available: "उपलब्ध",
        critical: "अति संवेदनशील / गम्भीर",
        high: "उच्च जोखिम",
        moderate: "मध्यम",
        low: "सामान्य"
      },
      ndrf: {
        pill: "NDRF: 1078 / 112",
        title: "राष्ट्रिय विपद् प्रतिक्रिया बल (NDRF)",
        desc: "बाढीबाट तत्काल उद्धार र आपतकालीन सहयोगका लागि सिधै नियन्त्रण कक्षमा सम्पर्क गर्नुहोस्।",
        tollfree: "राष्ट्रिय टोल-फ्री आपतकालीन",
        helpline: "NDRF २४/७ हेल्पलाइन",
        hq: "NDRF मुख्य नियन्त्रण कक्ष",
        seoc: "राज्य विपद् नियन्त्रण कक्ष",
        ministry: "विपद् व्यवस्थापन मन्त्रालय"
      },
      actions: {
        analyze_risk: "जोखिम विश्लेषण गर्नुहोस्",
        use_gps: "हालको स्थान प्रयोग गर्नुहोस्",
        gps_active: "जीपीएस सक्रिय",
        detecting_gps: "जीपीएस पत्ता लगाउँदै...",
        select_state: "राज्य चयन गर्नुहोस्",
        select_district: "जिल्ला चयन गर्नुहोस्",
        select_village: "जिल्ला स्तरको विश्लेषण",
        view_shelter: "सुरक्षित निकासी मार्ग हेर्नुहोस्",
        simulate_cloudburst: "बादल फुट्ने घटना सिमुलेट गर्नुहोस्",
        reset_sim: "सिमुलेशन रिसेट गर्नुहोस्",
        sync_live: "प्रत्यक्ष डेटा सिंक गर्नुहोस्",
        evacuate_now: "तत्काल सुरक्षित स्थानमा जानुहोस्",
        query_hydrology: "जलविज्ञान जाँच गर्नुहोस्",
        acknowledge: "चेतावनी स्वीकार गर्नुहोस्",
        open_evacuation: "निकासी मार्ग खोल्नुहोस्"
      },
      metrics: {
        risk_score: "बाढी जोखिम स्कोर",
        lead_time: "चेतावनी समय",
        susceptibility: "संवेदनशीलता",
        terrain: "भू-भाग",
        temperature: "तापक्रम",
        humidity: "आद्रता",
        current_rain: "हालको वर्षा",
        rain_24h: "२४ घण्टाको वर्षा",
        elevation: "उचाइ",
        slope: "भिरालोपन",
        discharge: "नदीको बहाव",
        water_stage: "नदीको सतह",
        danger_mark: "खतराको चिन्ह"
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;
