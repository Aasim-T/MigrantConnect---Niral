"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, MotionConfig, type Variants } from "framer-motion"
import { Building2, HardHat, Menu, X } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { RailField } from "@/components/rail-field"
import { cn } from "@/lib/utils"

const translations = {
  english: {
    nav: { about: "About", services: "What you can do", faq: "Questions", login: "Log in", menu: "Menu", language: "Language" },
    hero: {
      title: "Verified work. Wages on record.",
      subtitle:
        "Register once with Aadhaar to find jobs from verified employers, see every wage payment, and apply for government welfare schemes. Free for workers.",
      worker: "Register as a worker",
      employer: "Hire workers",
    },
    about: {
      title: "Every job and payment in one record",
      description:
        "MigrantConnect connects migrant workers in India with employers whose identity has been checked. Each job you take and each wage you are paid is recorded, so you have proof when you need it: to raise a complaint, to apply for a scheme, or to show your next employer.",
    },
    services: {
      title: "What you can do",
      items: [
        {
          title: "Register with Aadhaar",
          description:
            "Your identity is checked once with an OTP. Employers are checked by GSTIN, so you know who you are working for.",
        },
        {
          title: "Find and apply for jobs",
          description: "Search work by skill and city, see the monthly pay before you apply, and follow each application.",
        },
        {
          title: "Track every wage",
          description:
            "Employers record the days you worked and the amount due. You see what is paid, what is pending, and when it is due.",
        },
        {
          title: "Raise a grievance",
          description:
            "Report unpaid wages or unsafe work. The employer has to respond, and you can follow the case until it is resolved.",
        },
        {
          title: "Apply for welfare schemes",
          description: "Check which government schemes you qualify for and apply from your phone.",
        },
      ],
    },
    faq: {
      title: "Questions",
      questions: [
        {
          question: "How does Aadhaar-based registration work?",
          answer:
            "Our platform uses Aadhaar authentication to verify the identity of workers and employers. This ensures that all users on the platform are genuine and creates a secure environment for job matching.",
        },
        {
          question: "What job services are provided?",
          answer:
            "We offer job matching based on skills and location, transparent wage agreements, payment tracking, and a grievance redressal system to ensure fair treatment of workers.",
        },
        {
          question: "Is this platform free for workers?",
          answer:
            "Yes, the platform is completely free for migrant workers. We believe in providing accessible services to those who need them most.",
        },
      ],
    },
    login: { title: "Log in", description: "Choose how you use MigrantConnect.", worker: "I am a worker", employer: "I am an employer" },
    footer: { privacy: "Privacy policy", terms: "Terms of use", contact: "Contact us", rights: "All rights reserved." },
  },
  tamil: {
    nav: { about: "எங்களைப் பற்றி", services: "சேவைகள்", faq: "கேள்விகள்", login: "உள்நுழைய", menu: "பட்டி", language: "மொழி" },
    hero: {
      title: "சரிபார்த்த வேலை. பதிவான ஊதியம்.",
      subtitle:
        "ஆதார் மூலம் ஒருமுறை பதிவு செய்யுங்கள்: சரிபார்க்கப்பட்ட முதலாளிகளிடம் வேலை தேடுங்கள், ஒவ்வொரு ஊதியத்தையும் பாருங்கள், அரசு நலத் திட்டங்களுக்கு விண்ணப்பியுங்கள். தொழிலாளர்களுக்கு இலவசம்.",
      worker: "தொழிலாளராக பதிவு செய்க",
      employer: "தொழிலாளர்களை நியமிக்க",
    },
    about: {
      title: "ஒவ்வொரு வேலையும் ஊதியமும் ஒரே பதிவில்",
      description:
        "MigrantConnect இந்தியாவில் உள்ள புலம்பெயர் தொழிலாளர்களை, அடையாளம் சரிபார்க்கப்பட்ட முதலாளிகளுடன் இணைக்கிறது. நீங்கள் செய்யும் ஒவ்வொரு வேலையும், பெறும் ஒவ்வொரு ஊதியமும் பதிவு செய்யப்படுகிறது. புகார் அளிக்க, திட்டத்திற்கு விண்ணப்பிக்க அல்லது அடுத்த முதலாளியிடம் காட்ட இது உங்களுக்கு ஆதாரமாகிறது.",
    },
    services: {
      title: "நீங்கள் செய்யக்கூடியவை",
      items: [
        {
          title: "ஆதார் மூலம் பதிவு",
          description:
            "OTP மூலம் உங்கள் அடையாளம் ஒருமுறை சரிபார்க்கப்படும். முதலாளிகள் GSTIN மூலம் சரிபார்க்கப்படுவதால், யாரிடம் வேலை செய்கிறீர்கள் என்பது உங்களுக்குத் தெரியும்.",
        },
        {
          title: "வேலை தேடி விண்ணப்பிக்க",
          description:
            "திறன் மற்றும் நகரத்தின்படி வேலை தேடுங்கள், விண்ணப்பிக்கும் முன் மாத ஊதியத்தைப் பாருங்கள், ஒவ்வொரு விண்ணப்பத்தையும் பின்தொடருங்கள்.",
        },
        {
          title: "ஒவ்வொரு ஊதியத்தையும் கண்காணிக்க",
          description:
            "நீங்கள் வேலை செய்த நாட்களையும் தர வேண்டிய தொகையையும் முதலாளி பதிவு செய்வார். எது செலுத்தப்பட்டது, எது நிலுவையில் உள்ளது, எப்போது செலுத்த வேண்டும் என்பதைப் பார்க்கலாம்.",
        },
        {
          title: "புகார் அளிக்க",
          description:
            "செலுத்தப்படாத ஊதியம் அல்லது பாதுகாப்பற்ற வேலை குறித்து புகார் செய்யுங்கள். முதலாளி பதிலளிக்க வேண்டும்; தீர்வு கிடைக்கும் வரை நீங்கள் பின்தொடரலாம்.",
        },
        {
          title: "நலத் திட்டங்களுக்கு விண்ணப்பிக்க",
          description: "உங்களுக்குத் தகுதியான அரசு திட்டங்களைச் சரிபார்த்து, உங்கள் கைபேசியிலிருந்தே விண்ணப்பியுங்கள்.",
        },
      ],
    },
    faq: {
      title: "கேள்விகள்",
      questions: [
        {
          question: "ஆதார் அடிப்படையிலான பதிவு எவ்வாறு செயல்படுகிறது?",
          answer:
            "எங்கள் தளம் தொழிலாளர்கள் மற்றும் முதலாளிகளின் அடையாளத்தை சரிபார்க்க ஆதார் அங்கீகாரத்தைப் பயன்படுத்துகிறது. இது தளத்தில் உள்ள அனைத்து பயனர்களும் உண்மையானவர்கள் என்பதை உறுதிசெய்கிறது மற்றும் வேலை பொருத்தத்திற்கான பாதுகாப்பான சூழலை உருவாக்குகிறது.",
        },
        {
          question: "என்ன வேலை சேவைகள் வழங்கப்படுகின்றன?",
          answer:
            "நாங்கள் திறன்கள் மற்றும் இருப்பிடத்தின் அடிப்படையில் வேலை பொருத்தம், வெளிப்படையான ஊதிய ஒப்பந்தங்கள், கட்டண கண்காணிப்பு மற்றும் தொழிலாளர்களின் நியாயமான நடத்தையை உறுதிசெய்ய குறைதீர்ப்பு அமைப்பு ஆகியவற்றை வழங்குகிறோம்.",
        },
        {
          question: "இந்த தளம் தொழிலாளர்களுக்கு இலவசமா?",
          answer:
            "ஆம், இந்த தளம் புலம்பெயர் தொழிலாளர்களுக்கு முற்றிலும் இலவசம். மிகவும் தேவைப்படுபவர்களுக்கு அணுகக்கூடிய சேவைகளை வழங்குவதில் நாங்கள் நம்புகிறோம்.",
        },
      ],
    },
    login: { title: "உள்நுழைய", description: "நீங்கள் யார் என்பதைத் தேர்வுசெய்யுங்கள்.", worker: "நான் தொழிலாளர்", employer: "நான் முதலாளி" },
    footer: { privacy: "தனியுரிமைக் கொள்கை", terms: "பயன்பாட்டு விதிமுறைகள்", contact: "தொடர்பு கொள்ள", rights: "அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை." },
  },
  hindi: {
    nav: { about: "हमारे बारे में", services: "सेवाएँ", faq: "प्रश्न", login: "लॉगिन", menu: "मेनू", language: "भाषा" },
    hero: {
      title: "सत्यापित काम। दर्ज मज़दूरी।",
      subtitle:
        "आधार से एक बार पंजीकरण करें: सत्यापित नियोक्ताओं से काम खोजें, हर मज़दूरी भुगतान देखें, और सरकारी कल्याण योजनाओं के लिए आवेदन करें। श्रमिकों के लिए मुफ़्त।",
      worker: "श्रमिक के रूप में पंजीकरण करें",
      employer: "श्रमिक नियुक्त करें",
    },
    about: {
      title: "हर काम और हर भुगतान, एक ही रिकॉर्ड में",
      description:
        "MigrantConnect भारत के प्रवासी श्रमिकों को उन नियोक्ताओं से जोड़ता है जिनकी पहचान जाँची गई है। आपका हर काम और हर मज़दूरी भुगतान दर्ज होता है, ताकि ज़रूरत पड़ने पर आपके पास सबूत रहे: शिकायत करने, किसी योजना के लिए आवेदन करने या अगले नियोक्ता को दिखाने के लिए।",
    },
    services: {
      title: "आप क्या कर सकते हैं",
      items: [
        {
          title: "आधार से पंजीकरण",
          description:
            "OTP से आपकी पहचान एक बार जाँची जाती है। नियोक्ताओं की जाँच GSTIN से होती है, ताकि आपको पता रहे कि आप किसके लिए काम कर रहे हैं।",
        },
        {
          title: "काम खोजें और आवेदन करें",
          description: "कौशल और शहर के हिसाब से काम खोजें, आवेदन से पहले मासिक वेतन देखें, और हर आवेदन की स्थिति जानें।",
        },
        {
          title: "हर मज़दूरी का हिसाब",
          description:
            "नियोक्ता आपके काम के दिन और देय राशि दर्ज करते हैं। आप देख सकते हैं कि क्या मिला, क्या बाकी है, और कब तक मिलना है।",
        },
        {
          title: "शिकायत दर्ज करें",
          description:
            "बकाया मज़दूरी या असुरक्षित काम की शिकायत करें। नियोक्ता को जवाब देना होता है, और समाधान तक आप मामले को देख सकते हैं।",
        },
        {
          title: "कल्याण योजनाओं के लिए आवेदन",
          description: "देखें कि आप किन सरकारी योजनाओं के पात्र हैं और अपने फ़ोन से ही आवेदन करें।",
        },
      ],
    },
    faq: {
      title: "प्रश्न",
      questions: [
        {
          question: "आधार-आधारित पंजीकरण कैसे काम करता है?",
          answer:
            "हमारा प्लेटफॉर्म श्रमिकों और नियोक्ताओं की पहचान को सत्यापित करने के लिए आधार प्रमाणीकरण का उपयोग करता है। यह सुनिश्चित करता है कि प्लेटफॉर्म पर सभी उपयोगकर्ता वास्तविक हैं और नौकरी मिलान के लिए एक सुरक्षित वातावरण बनाता है।",
        },
        {
          question: "कौन सी नौकरी सेवाएँ प्रदान की जाती हैं?",
          answer:
            "हम कौशल और स्थान के आधार पर नौकरी मिलान, पारदर्शी वेतन समझौते, भुगतान ट्रैकिंग, और श्रमिकों के उचित व्यवहार को सुनिश्चित करने के लिए शिकायत निवारण प्रणाली प्रदान करते हैं।",
        },
        {
          question: "क्या यह प्लेटफॉर्म श्रमिकों के लिए मुफ्त है?",
          answer:
            "हां, यह प्लेटफॉर्म प्रवासी श्रमिकों के लिए पूरी तरह से मुफ्त है। हम उन लोगों के लिए सुलभ सेवाएं प्रदान करने में विश्वास करते हैं जिन्हें इनकी सबसे अधिक आवश्यकता है।",
        },
      ],
    },
    login: { title: "लॉगिन", description: "चुनें कि आप MigrantConnect का उपयोग कैसे करते हैं।", worker: "मैं श्रमिक हूँ", employer: "मैं नियोक्ता हूँ" },
    footer: { privacy: "गोपनीयता नीति", terms: "उपयोग की शर्तें", contact: "संपर्क करें", rights: "सर्वाधिकार सुरक्षित।" },
  },
}

type LanguageKey = keyof typeof translations

// Station boards in India carry one name in several scripts; the language switch reads the same way
const LANGUAGES: { key: LanguageKey; label: string; lang: string }[] = [
  { key: "english", label: "English", lang: "en" },
  { key: "tamil", label: "தமிழ்", lang: "ta" },
  { key: "hindi", label: "हिन्दी", lang: "hi" },
]

const rise: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}
const stagger: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }

function LanguageBoard({ value, onChange, label }: { value: LanguageKey; onChange: (l: LanguageKey) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-3 md:flex md:flex-col md:items-stretch">
      {LANGUAGES.map((l) => {
        const active = l.key === value
        return (
          <button
            key={l.key}
            lang={l.lang}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(l.key)}
            className={cn(
              "min-h-12 px-3 py-2 text-center text-xl font-bold tracking-tight transition-colors duration-200 md:px-4 md:text-left md:text-[1.75rem]",
              "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ink",
              active ? "bg-ink text-signal" : "text-ink hover:bg-ink/10",
            )}
          >
            {l.label}
          </button>
        )
      })}
    </div>
  )
}

function WageSlip() {
  return (
    <div data-ui className="w-full max-w-[380px] bg-white p-6 text-ink shadow-[0_24px_48px_-24px_rgba(20,20,20,0.35)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink/60">Wage record WAGE-401</p>
          <p className="mt-1 text-lg font-semibold">Construction Worker</p>
          <p className="text-sm text-ink/70">ABC Construction Company</p>
        </div>
        <span className="rounded-full bg-[#DCEBDD] px-3 py-1 text-sm font-medium text-[#1E5B2A]">Paid</span>
      </div>
      <dl className="mt-6 grid grid-cols-2 gap-y-3 text-sm">
        <dt className="text-ink/60">Days worked</dt>
        <dd className="text-right tabular-nums">22</dd>
        <dt className="text-ink/60">Daily wage</dt>
        <dd className="text-right tabular-nums">₹650</dd>
        <dt className="text-ink/60">Paid by</dt>
        <dd className="text-right">Bank transfer</dd>
        <dt className="text-ink/60">Reference</dt>
        <dd className="text-right tabular-nums">TRX-7A31C9</dd>
      </dl>
      <div className="mt-6 flex items-baseline justify-between bg-paper px-4 py-3">
        <span className="text-sm text-ink/70">Amount</span>
        <span className="text-2xl font-bold tabular-nums">₹14,300</span>
      </div>
    </div>
  )
}

function JobListing() {
  return (
    <div data-ui className="w-full max-w-[340px] bg-ink p-6 text-white shadow-[0_24px_48px_-24px_rgba(20,20,20,0.5)]">
      <p className="text-lg font-semibold">Carpenter</p>
      <p className="text-sm text-white/70">Kanchipuram · Full-time</p>
      <p className="mt-5 text-2xl font-bold tabular-nums text-signal">₹18,000–22,000</p>
      <p className="text-sm text-white/70">a month, 9 hours a day</p>
      <ul className="mt-5 flex flex-wrap gap-2 text-sm">
        <li className="bg-white/10 px-3 py-1">Accommodation provided</li>
        <li className="bg-white/10 px-3 py-1">Overtime pay</li>
      </ul>
      <span className="mt-6 inline-flex h-11 w-full items-center justify-center bg-signal font-semibold text-ink">Apply</span>
    </div>
  )
}

export function LandingPage() {
  const router = useRouter()
  const [language, setLanguage] = useState<LanguageKey>("english")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loginDialogOpen, setLoginDialogOpen] = useState(false)
  const t = translations[language]
  const langCode = LANGUAGES.find((l) => l.key === language)!.lang
  const indic = language !== "english"

  useEffect(() => {
    try {
      const stored = localStorage.getItem("preferredLanguage")
      if (stored && stored in translations) setLanguage(stored as LanguageKey)
    } catch {}
    // The landing page is designed for the light theme
    document.documentElement.classList.remove("dark")
  }, [])

  useEffect(() => {
    document.documentElement.lang = langCode
  }, [langCode])

  const changeLanguage = (l: LanguageKey) => {
    setLanguage(l)
    try {
      localStorage.setItem("preferredLanguage", l)
    } catch {}
  }

  const handleLogin = (type: "worker" | "employer") => {
    setLoginDialogOpen(false)
    router.push(`/login?type=${type}`)
  }

  const navLinks = [
    { href: "#about", label: t.nav.about },
    { href: "#services", label: t.nav.services },
    { href: "#faq", label: t.nav.faq },
  ]

  return (
    <MotionConfig reducedMotion="user">
      <div lang={langCode} className="mc-landing flex min-h-screen flex-col overflow-x-clip bg-white text-ink">
        {/* Hero: the station board */}
        <section id="home" className="relative isolate flex min-h-[min(100svh,1000px)] flex-col overflow-hidden bg-signal">
          <header className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-4 py-5 md:px-8">
            <Link href="/" className="text-xl font-extrabold tracking-tight md:text-2xl" style={{ fontStretch: "88%" }}>
              MigrantConnect
            </Link>
            <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
              {navLinks.map((l) => (
                <a key={l.href} href={l.href} className="text-base font-medium underline-offset-[6px] hover:underline">
                  {l.label}
                </a>
              ))}
              <button
                type="button"
                onClick={() => setLoginDialogOpen(true)}
                className="h-11 bg-ink px-6 font-semibold text-signal transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0"
              >
                {t.nav.login}
              </button>
            </nav>
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center md:hidden"
              aria-label={t.nav.menu}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((o) => !o)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </header>

          {mobileMenuOpen && (
            <div className="mx-4 bg-ink p-4 text-white md:hidden">
              <nav className="flex flex-col" aria-label="Main">
                {navLinks.map((l) => (
                  <a key={l.href} href={l.href} className="py-3 text-lg font-medium" onClick={() => setMobileMenuOpen(false)}>
                    {l.label}
                  </a>
                ))}
              </nav>
              <button
                type="button"
                className="mt-3 h-12 w-full bg-signal font-semibold text-ink"
                onClick={() => {
                  setMobileMenuOpen(false)
                  setLoginDialogOpen(true)
                }}
              >
                {t.nav.login}
              </button>
            </div>
          )}

          <motion.div
            className="mx-auto grid w-full max-w-[1440px] gap-8 px-4 pt-4 md:grid-cols-12 md:gap-10 md:px-8 md:pt-16"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <div className="order-2 md:order-none md:col-span-9">
              <motion.h1
                key={language}
                variants={rise}
                className={cn(
                  "max-w-[14ch] font-extrabold text-ink",
                  indic
                    ? "text-[2.5rem] leading-[1.2] tracking-normal sm:text-6xl lg:text-[5.25rem]"
                    : "text-[3.25rem] leading-[0.92] tracking-[-0.035em] sm:text-7xl lg:text-[7.5rem]",
                )}
                style={{ fontStretch: indic ? undefined : "82%" }}
              >
                {t.hero.title}
              </motion.h1>
              <motion.p
                variants={rise}
                className={cn("mt-8 max-w-[52ch] text-lg md:text-xl", indic ? "leading-[1.75]" : "leading-relaxed")}
              >
                {t.hero.subtitle}
              </motion.p>
              <motion.div variants={rise} className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register?type=worker"
                  className="inline-flex h-14 items-center justify-center bg-ink px-8 text-lg font-semibold text-signal transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0"
                >
                  {t.hero.worker}
                </Link>
                <Link
                  href="/register?type=employer"
                  className="inline-flex h-14 items-center justify-center bg-white px-8 text-lg font-semibold text-ink transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0"
                >
                  {t.hero.employer}
                </Link>
              </motion.div>
            </div>
            <motion.div variants={rise} className="order-1 md:order-none md:col-span-3 md:justify-self-end">
              <div className="w-full bg-signal md:w-56">
                <LanguageBoard value={language} onChange={changeLanguage} label={t.nav.language} />
              </div>
            </motion.div>
          </motion.div>
          <RailField className="relative mt-6 min-h-[300px] flex-1 md:mt-4 md:min-h-[340px]" />
        </section>

        <main className="flex-1">
          {/* About: the record is the product */}
          <section id="about" className="mx-auto w-full max-w-[1440px] px-4 py-24 md:px-8 md:py-40">
            <motion.div
              className="grid items-center gap-16 md:grid-cols-12"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-15% 0px" }}
              variants={stagger}
            >
              <div className="md:col-span-6">
                <motion.h2
                  variants={rise}
                  className={cn(
                    "max-w-[16ch] text-4xl font-extrabold md:text-6xl",
                    indic ? "leading-[1.25]" : "leading-[0.98] tracking-[-0.03em]",
                  )}
                  style={{ fontStretch: indic ? undefined : "85%" }}
                >
                  {t.about.title}
                </motion.h2>
                <motion.p
                  variants={rise}
                  className={cn("mt-8 max-w-[58ch] text-lg md:text-xl", indic ? "leading-[1.85]" : "leading-relaxed")}
                >
                  {t.about.description}
                </motion.p>
              </div>
              <motion.div variants={rise} className="relative md:col-span-6">
                <div className="bg-paper px-6 pb-16 pt-10 md:px-12 md:pb-24 md:pt-14">
                  <WageSlip />
                </div>
                <div className="-mt-12 flex justify-end pr-4 md:-mt-28 md:pr-0">
                  <JobListing />
                </div>
              </motion.div>
            </motion.div>
          </section>

          {/* Services: a departures board */}
          <section id="services" className="bg-ink text-white">
            <div className="mx-auto w-full max-w-[1440px] px-4 py-24 md:px-8 md:py-40">
              <motion.h2
                className={cn(
                  "text-4xl font-extrabold text-signal md:text-6xl",
                  indic ? "leading-[1.25]" : "leading-none tracking-[-0.03em]",
                )}
                style={{ fontStretch: indic ? undefined : "85%" }}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-15% 0px" }}
                variants={rise}
              >
                {t.services.title}
              </motion.h2>
              <motion.ul
                className="mt-16 md:mt-24"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-10% 0px" }}
                variants={stagger}
              >
                {t.services.items.map((s) => (
                  <motion.li
                    key={s.title}
                    variants={rise}
                    className="group grid gap-3 py-8 transition-colors duration-200 hover:bg-white/[0.04] md:grid-cols-12 md:gap-8 md:px-4 md:py-10 [&+&]:mt-1"
                  >
                    <h3
                      className={cn(
                        "text-2xl font-bold md:col-span-5 md:text-[2.5rem]",
                        indic ? "leading-[1.35]" : "leading-tight tracking-[-0.02em]",
                      )}
                    >
                      {s.title}
                    </h3>
                    <p className={cn("text-lg text-white/80 md:col-span-6 md:col-start-7", indic ? "leading-[1.8]" : "leading-relaxed")}>
                      {s.description}
                    </p>
                  </motion.li>
                ))}
              </motion.ul>
            </div>
          </section>

          {/* Questions */}
          <section id="faq" className="mx-auto w-full max-w-[1440px] px-4 py-24 md:px-8 md:py-40">
            <div className="grid gap-12 md:grid-cols-12">
              <motion.h2
                className={cn(
                  "text-4xl font-extrabold md:col-span-4 md:text-6xl",
                  indic ? "leading-[1.25]" : "leading-none tracking-[-0.03em]",
                )}
                style={{ fontStretch: indic ? undefined : "85%" }}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={rise}
              >
                {t.faq.title}
              </motion.h2>
              <Accordion type="multiple" className="md:col-span-7 md:col-start-6">
                {t.faq.questions.map((f, i) => (
                  <AccordionItem key={i} value={`q${i}`} className="border-ink/15">
                    <AccordionTrigger className="py-6 text-left text-xl font-semibold hover:no-underline md:text-2xl">
                      {f.question}
                    </AccordionTrigger>
                    <AccordionContent className={cn("pb-6 text-lg", indic ? "leading-[1.85]" : "leading-relaxed")}>
                      {f.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>
        </main>

        {/* Footer: the name returns at full width */}
        <footer className="bg-signal">
          <div className="mx-auto w-full max-w-[1440px] px-4 pb-8 pt-16 md:px-8 md:pt-24">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <nav className="flex flex-wrap gap-x-8 gap-y-2" aria-label="Footer">
                <Link href="#" className="text-base font-medium underline-offset-[6px] hover:underline">
                  {t.footer.privacy}
                </Link>
                <Link href="#" className="text-base font-medium underline-offset-[6px] hover:underline">
                  {t.footer.terms}
                </Link>
                <Link href="#" className="text-base font-medium underline-offset-[6px] hover:underline">
                  {t.footer.contact}
                </Link>
              </nav>
              <p className="text-base">
                © {new Date().getFullYear()} MigrantConnect. {t.footer.rights}
              </p>
            </div>
            <p
              aria-hidden="true"
              className="mt-12 select-none whitespace-nowrap text-[13.2vw] font-extrabold leading-[0.8] tracking-[-0.05em] md:mt-16 xl:text-[11.5rem]"
              style={{ fontStretch: "75%" }}
            >
              MigrantConnect
            </p>
          </div>
        </footer>

        <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl">{t.login.title}</DialogTitle>
              <DialogDescription>{t.login.description}</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleLogin("worker")}
                className="flex h-32 flex-col items-start justify-between bg-signal p-4 text-left font-semibold text-ink transition-transform duration-150 hover:-translate-y-0.5"
              >
                <HardHat className="h-7 w-7" aria-hidden="true" />
                {t.login.worker}
              </button>
              <button
                type="button"
                onClick={() => handleLogin("employer")}
                className="flex h-32 flex-col items-start justify-between bg-ink p-4 text-left font-semibold text-white transition-transform duration-150 hover:-translate-y-0.5"
              >
                <Building2 className="h-7 w-7" aria-hidden="true" />
                {t.login.employer}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MotionConfig>
  )
}
