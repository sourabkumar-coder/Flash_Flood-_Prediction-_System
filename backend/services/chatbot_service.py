import os
import logging
import json
import requests
from typing import List, Dict, Any, Optional

try:
    from env_loader import load_env
    load_env()
except ImportError:
    try:
        from ..env_loader import load_env
        load_env()
    except Exception:
        pass

logger = logging.getLogger(__name__)

# Multilingual language mapping for prompts
LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi (हिंदी)",
    "bn": "Bengali (বাংলা)",
    "as": "Assamese (অসমীয়া)",
    "ne": "Nepali (नेपाली)",
    "ta": "Tamil (தமிழ்)",
    "te": "Telugu (తెలుగు)",
    "mr": "Marathi (मराठी)",
}

EMERGENCY_SYSTEM_PROMPT = """You are JalDrishti AI (जलदृष्टि), an expert real-time AI emergency flood assistant and disaster response advisor for India (covering all regions: Himalayan & Northeast states like Arunachal Pradesh, Assam, Sikkim, Himachal Pradesh, Uttarakhand, Jammu & Kashmir, as well as river plains and coastal cities like Kolkata, Mumbai, Chennai, etc.).
Your mission is to provide life-saving instructions, evacuation protocols, relief center guidance, flood & landslide safety measures, and official helpline contacts to citizens and rescue teams.

SCOPE & CAPABILITIES:
- You FULLY ASSIST with:
  1. Flood, rain, cloudburst, landslide, river surge, cyclone, and weather conditions.
  2. Disaster relief centers, evacuation shelters, relief camps, medical aid posts, food distribution points, and safe high-ground zones across all Indian states and districts (including Arunachal Pradesh - Dibang Valley / Roing / Anini, Assam, Himachal Pradesh, Uttarakhand, West Bengal, Kerala, etc.).
  3. Official helplines (NDRF 1078, National 112, SDMA 1070, DDMA 1077, local DEOCs).
  4. Flood survival kits, do's & don'ts, water safety, and crisis navigation.
- If the user asks about relief centers or shelters in any specific district (e.g. Dibang Valley, Kullu, Mandi, Wayanad):
  - Guide them to typical designated emergency shelter locations: District Administrative Complex (DC Office), District Emergency Operation Centre (DEOC), Government Higher Secondary Schools, Community/Panchayat Halls on high ridges, ITBP/Assam Rifles/Army camps, or Youth Hostels.
  - Provide the official District Disaster Helpline (1077), State Emergency Control Room (1070), and National Emergency (112 / 1078).
- ONLY politely decline queries that are COMPLETELY UNRELATED to disaster management, geography, weather, relief, or emergency safety (e.g., programming/coding, movies, entertainment, cooking recipes, video games, sports trivia, or academic math).

RESPONSE FORMAT:
- Be concise, direct, helpful, and empathetic.
- Use clear bullet points and bold headings.
- Always reply in the requested language ({target_language}).
"""

# Built-in fallback emergency knowledge base
FALLBACK_KNOWLEDGE = {
    "helpline": {
        "en": "📞 **EMERGENCY HELPLINE NUMBERS (INDIA):**\n\n• **NDRF 24x7 Control Room:** 1078 / 011-24363260\n• **National Emergency Service:** 112\n• **State Disaster Control Room:** 1070\n• **District Disaster Management (DDMA):** 1077\n• **Medical Ambulance:** 108 / 102\n• **Police:** 100\n\n*Keep your phone charged and stay tuned to local civil defense alerts.*",
        "hi": "📞 **आपातकालीन हेल्पलाइन नंबर (भारत):**\n\n• **एनडीआरएफ (NDRF) 24x7 कंट्रोल रूम:** 1078 / 011-24363260\n• **राष्ट्रीय आपातकालीन नंबर:** 112\n• **राज्य आपदा नियंत्रण कक्ष:** 1070\n• **जिला आपदा प्रबंधन (DDMA):** 1077\n• **एम्बुलेंस / चिकित्सा आपातकाल:** 108 / 102\n• **पुलिस:** 100\n\n*अपने फोन को चार्ज रखें और स्थानीय प्रशासन की चेतावनियों का पालन करें।*",
        "bn": "📞 **জরুরি হেল্পলাইন নম্বর (ভারত):**\n\n• **এনডিআরএফ (NDRF) কন্ট্রোল রুম:** 1078\n• **জাতীয় জরুরি নম্বর:** 112\n• **রাজ্য দুর্যোগ নিয়ন্ত্রণ:** 1070\n• **জেলা দুর্যোগ ব্যবস্থাপনা:** 1077\n• **অ্যাম্বুলেন্স:** 108\n• **পুলিশ:** 100\n\n*উঁচু এবং নিরাপদ স্থানে অবস্থান করুন।*",
        "as": "📞 **জৰুৰীকালীন হেল্পলাইন নম্বৰ (ভাৰত):**\n\n• **এনডিআৰএফ (NDRF):** 1078\n• **ৰাষ্ট্ৰীয় জৰুৰীকালীন নম্বৰ:** 112\n• **জিলা দুৰ্যোগ ব্যৱস্থাপনা:** 1077\n• **এম্বুলেন্স:** 108",
        "ne": "📞 **आपतकालीन हेल्पलाइन नम्बरहरू (भारत):**\n\n• **एनडीआरएफ (NDRF) कन्ट्रोल रूम:** 1078\n• **राष्ट्रिय आपतकालीन नम्बर:** 112\n• **जिल्ला विपद् व्यवस्थापन:** 1077\n• **एम्बुलेन्स:** 108",
    },
    "safety": {
        "en": "🦺 **FLASH FLOOD SAFETY MEASURES:**\n\n1. **Move to High Ground:** Immediately move at least 30-50m above riverbed level.\n2. **Shut Off Utilities:** Turn off electricity main switch and LPG gas cylinders before leaving.\n3. **Safe Drinking Water:** Drink only boiled or chlorinated water.\n4. **Stay Off Riverbanks:** Hilly riverbeds can surge 5 meters within 10 minutes during cloudbursts.\n5. **Follow Evacuation Routes:** Use designated high-ridge pedestrian trails.",
        "hi": "🦺 **फ्लैश फ्लड / बाढ़ सुरक्षा उपाय:**\n\n1. **ऊंचे स्थानों पर जाएं:** नदी तल से तुरंत 30-50 मीटर ऊंचाई वाले सुरक्षित आश्रय में जाएं।\n2. **बिजली और गैस बंद करें:** घर छोड़ते समय मेन स्विच और गैस सिलेंडर बंद कर दें।\n3. **उबलता पानी पिएं:** जलजनित रोगों से बचने के लिए केवल उबला या शुद्ध पानी ही पिएं।\n4. **नदी किनारों से दूर रहें:** बादल फटने पर जलस्तर 10 मिनट में 5 मीटर तक बढ़ सकता है।\n5. **निर्देशित सुरक्षित मार्गों का उपयोग करें।**",
        "bn": "🦺 **বন্যার সময় প্রয়োজনীয় সুরক্ষা নির্দেশাবলী:**\n\n1. অবিলম্বে উঁচু স্থানে আশ্রয় নিন।\n2. বাড়ি ছাড়ার আগে বিদ্যুৎ এবং গ্যাসের মেন সুইচ বন্ধ করুন।\n3. ফুটানো বা বিশুদ্ধ জল পান করুন।\n4. নদীর তীরবর্তী এলাকা থেকে দূরে থাকুন।",
    },
    "dos_donts": {
        "en": "⚡ **DO'S AND DON'TS DURING FLOODS & CLOUDBURSTS:**\n\n✅ **DO'S:**\n• Pack an Emergency Survival Kit (Torch, Whistle, Dry Food, First-Aid, Waterproof ID bag).\n• Listen to IMD & JalDrishti radar alerts.\n• Help children, elderly, and differently-abled individuals reach safe zones.\n\n❌ **DON'TS:**\n• NEVER drive or walk through flowing floodwaters (15 cm of water can sweep you away).\n• DO NOT touch snapped electrical wires or submerged transformers.\n• DO NOT build temporary shelters beneath loose mountain slopes or landslide zones.",
        "hi": "⚡ **बाढ़ और बादल फटने के दौरान क्या करें और क्या न करें:**\n\n✅ **क्या करें (DO'S):**\n• आपातकालीन किट तैयार रखें (टॉर्च, सीटी, सूखा भोजन, प्राथमिक चिकित्सा किट, वाटरप्रूफ बैग में जरूरी कागजात)।\n• मौसम विभाग और जलदृष्टि अलर्ट्स पर नजर रखें।\n• बुजुर्गों और बच्चों को सुरक्षित ऊंचाई वाले स्थानों पर पहले पहुंचाएं।\n\n❌ **क्या न करें (DON'TS):**\n• बहते बाढ़ के पानी में गाड़ी न चलाएं और न ही पैदल चलें।\n• टूटे हुए बिजली के तारों को न छुएं।\n• भूस्खलन वाले पहाड़ी ढलानों के नीचे शरण न लें।",
    },
    "kit": {
        "en": "🎒 **EMERGENCY SURVIVAL KIT CHECKLIST:**\n\n• Portable LED torch + extra batteries\n• Whistle (to signal rescue teams if trapped)\n• 3 days of non-perishable dry food (biscuits, roasted grams, energy bars)\n• Sealed drinking water bottles & water purification tablets (chlorine)\n• First-aid kit with antiseptic, band-aids, ORS packets, and daily medications\n• Fully charged power bank & phone charging cable\n• Waterproof pouch for Aadhaar, voter ID, bank passbook, and insurance cards\n• Raincoat, sturdy shoes, and warm thermal blanket",
        "hi": "🎒 **आपातकालीन उत्तरजीविता किट (Emergency Kit Checklist):**\n\n• पोर्टेबल टॉर्च और अतिरिक्त बैटरी\n• सीटी (फंसने की स्थिति में बचाव दल को संकेत देने के लिए)\n• 3 दिनों का सूखा भोजन (बिस्कुट, भुना चना, गुड़)\n• पीने के पानी की बोतलें और ओआरएस (ORS) के पैकेट\n• प्राथमिक उपचार किट (बैंडेज, एंटीसेप्टिक, जरूरी दवाएं)\n• चार्ज किया हुआ पावर बैंक\n• वाटरप्रूफ बैग में जरूरी दस्तावेज (आधार, बैंक पासबुक)\n• रेनकोट और गर्म कंबल",
    }
}


def generate_chat_response(
    message: str,
    language: str = "en",
    history: Optional[List[Dict[str, str]]] = None,
    user_district: Optional[str] = None
) -> Dict[str, Any]:
    """Generate an intelligent multilingual flood safety response via Groq LPU or fallback engine."""
    lang_code = language.strip().lower()[:2]
    target_lang_name = LANGUAGE_NAMES.get(lang_code, "English")
    msg_clean = message.strip().lower()

    groq_api_key = os.getenv("GROQ_API_KEY")
    configured_model = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")

    # List of models to try in order
    models_to_try = [
        configured_model,
        "qwen/qwen3.8-27b",
        "qwen/qwen3.6-27b",
        "openai/gpt-oss-120b",
        "allam-2-7b"
    ]
    # Remove duplicates preserving order
    seen = set()
    candidate_models = [m for m in models_to_try if m and not (m in seen or seen.add(m))]

    # 1. Try Groq LPU API if API Key is configured
    if groq_api_key and groq_api_key.strip():
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {groq_api_key.strip()}",
            "Content-Type": "application/json"
        }

        system_content = EMERGENCY_SYSTEM_PROMPT.format(target_language=target_lang_name)
        if user_district:
            system_content += f"\nUser's Current Monitored District: {user_district}."

        messages = [{"role": "system", "content": system_content}]
        
        # Add conversation history if present
        if history:
            for h in history[-6:]:
                if h.get("role") and h.get("content"):
                    messages.append({"role": h["role"], "content": h["content"]})

        messages.append({"role": "user", "content": message})

        for model_name in candidate_models:
            try:
                payload = {
                    "model": model_name,
                    "messages": messages,
                    "temperature": 0.4,
                    "max_tokens": 800,
                    "top_p": 0.9
                }

                response = requests.post(url, headers=headers, json=payload, timeout=12)
                if response.ok:
                    data = response.json()
                    raw_reply = data["choices"][0]["message"]["content"]
                    # Strip any internal thought or reasoning tags if emitted
                    import re
                    clean_reply = re.sub(r'<think>.*?(?:</think>|$)', '', raw_reply, flags=re.DOTALL).strip()
                    if not clean_reply and '</think>' in raw_reply:
                        clean_reply = raw_reply.split('</think>')[-1].strip()
                    if clean_reply:
                        return {
                            "reply": clean_reply,
                            "provider": f"Groq LPU ({model_name})",
                            "language": target_lang_name,
                            "model": model_name
                        }
                else:
                    logger.warning(f"Groq API model {model_name} returned status {response.status_code}: {response.text}")
            except Exception as groq_err:
                logger.warning(f"Groq API call with {model_name} failed: {str(groq_err)}")
                continue


    # 2. Offline Knowledge Fallback Engine
    WEATHER_KEYWORDS = [
        "flood", "rain", "weather", "water", "cloudburst", "landslide", "cyclone", "evacuate", "evacuation",
        "shelter", "river", "ndrf", "help", "emergency", "alert", "safety", "dam", "warning", "rescue",
        "relief", "center", "centre", "camp", "valley", "deoc", "ddma", "sdma", "sdrf", "hospital", "safe",
        "kolkata", "mandi", "kullu", "shimla", "delhi", "mumbai", "uttarakhand", "himachal", "assam", "kerala",
        "arunachal", "dibang", "anini", "roing", "tawang", "sikkim", "meghalaya", "manipur", "nagaland",
        "बाढ़", "बारिश", "मौसम", "भूस्खलन", "बादल", "सुरक्षा", "निकासी", "आपातकाल", "हेल्पलाइन", "राहत", "शिविर", "केंद्र",
        "বন্যা", "বৃষ্টি", "আবহাওয়া", "ভূমিধস", "জল", "নদী", "ত্রাণ", "জরুরি", "শিবির", "কেন্দ্র"
    ]

    is_flood_related = any(k in msg_clean for k in WEATHER_KEYWORDS)

    if not is_flood_related:
        if lang_code == "hi":
            refusal = "मैं जलदृष्टि AI (JalDrishti) हूँ, जो विशेष रूप से बाढ़ सुरक्षा, मौसम की जानकारी और आपदा प्रबंधन के लिए समर्पित है। कृपया बाढ़, मौसम या आपदा राहत से जुड़े प्रश्न पूछें।"
        elif lang_code == "bn":
            refusal = "আমি জলদৃষ্টি এআই (JalDrishti), শুধুমাত্র বন্যা সুরক্ষা, আবহাওয়ার সতর্কতা এবং দুর্যোগ ব্যবস্থাপনার জন্য নিবেদিত। অনুগ্রহ করে বন্যা, আবহাওয়া বা দুর্যোগ সম্পর্কিত প্রশ্ন জিজ্ঞাসা করুন।"
        else:
            refusal = "I am JalDrishti AI (जलदृष्टि), dedicated exclusively to flood safety, weather alerts, evacuation protocols, and emergency disaster assistance. Please ask questions related to floods, weather conditions, or disaster response."
        
        return {
            "reply": refusal,
            "provider": "JalDrishti Domain Guardrail",
            "language": target_lang_name,
            "model": "domain-filter"
        }

    reply = None
    if any(k in msg_clean for k in ["help", "number", "contact", "ndrf", "call", "नंबर", "हेल्पलाइन", "নম্বর", "ফোন"]):
        reply = FALLBACK_KNOWLEDGE["helpline"].get(lang_code, FALLBACK_KNOWLEDGE["helpline"]["en"])
    elif any(k in msg_clean for k in ["safe", "measure", "protect", "survive", "सुरक्षा", "उपाय", "কী করব", "কি করবেন"]):
        reply = FALLBACK_KNOWLEDGE["safety"].get(lang_code, FALLBACK_KNOWLEDGE["safety"]["en"])
    elif any(k in msg_clean for k in ["do", "dont", "don't", "kya kare", "क्या करें", "করবেন না"]):
        reply = FALLBACK_KNOWLEDGE["dos_donts"].get(lang_code, FALLBACK_KNOWLEDGE["dos_donts"]["en"])
    elif any(k in msg_clean for k in ["kit", "pack", "bag", "सामग्री", "किट", "ব্যাগে"]):
        reply = FALLBACK_KNOWLEDGE["kit"].get(lang_code, FALLBACK_KNOWLEDGE["kit"]["en"])
    else:
        # General response
        if lang_code == "hi":
            reply = (
                f"🚨 **जलदृष्टि आपदा मित्र:** {user_district or 'आपके क्षेत्र'} में बाढ़ और बादल फटने की स्थिति में सतर्क रहें।\n\n"
                "• **आपातकालीन हेल्पलाइन:** 1078 (NDRF) / 112\n"
                "• **सुरक्षा:** नदी किनारे और निचले क्षेत्रों को तुरंत छोड़ें।\n"
                "• आपातकालीन किट साथ रखें और ऊंचे स्थानों की ओर जाएं।"
            )
        elif lang_code == "bn":
            reply = (
                f"🚨 **জলদৃষ্টি দুর্যোগ মিত্র:** {user_district or 'আপনার এলাকায়'} বন্যার সতর্কতা।\n\n"
                "• **জরুরি নম্বর:** 1078 (NDRF) / 112\n"
                "• অবিলম্বে উঁচু নিরাপদ স্থানে যান।"
            )
        else:
            reply = (
                f"🚨 **JalDrishti Emergency Assistant:** For flood safety in {user_district or 'your region'}:\n\n"
                "• **Emergency Helplines:** 1078 (NDRF) / 112 (National Emergency) / 1077 (District Control)\n"
                "• **Immediate Action:** Evacuate to higher ground at least 30-50m above riverbed.\n"
                "• **Avoid Moving Water:** Never walk or drive through flowing floodwaters."
            )

    return {
        "reply": reply,
        "provider": "JalDrishti Emergency Knowledge Engine",
        "language": target_lang_name,
        "model": "rule-based-fallback"
    }
